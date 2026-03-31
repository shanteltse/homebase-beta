"use client";

import { useRouter } from "next/navigation";
import { useForm, type UseFormRegister, type UseFormWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { ArrowLeft, ExternalLink, Plus, Trash2, X } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Textarea } from "@repo/ui/textarea";
import { Spinner } from "@repo/ui/spinner";
import { Badge } from "@repo/ui/badge";
import { Checkbox } from "@repo/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@repo/ui/dialog";
import { DEFAULT_CATEGORIES } from "@/types/category";
import type { RecurringPattern, Subtask } from "@/types/task";
import { useTask } from "../api/get-task";
import { useUpdateTask } from "../api/update-task";
import { useDeleteTask } from "../api/delete-task";
import { TagPicker } from "./tag-picker";
import { RecurringPicker } from "./recurring-picker";
import { AssigneePicker } from "@/features/household/components/assignee-picker";
import { useState } from "react";

const editFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  contact: z.string().optional(),
});

type EditFormValues = z.infer<typeof editFormSchema>;

type TaskDetailProps = {
  taskId: string;
};

function detectContactType(value: string): "email" | "phone" | "address" | null {
  if (!value.trim()) return null;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "email";
  if (/^[+\d][\d\s\-().]{6,}$/.test(value)) return "phone";
  // Anything with a number followed by words is likely an address
  if (/\d/.test(value) && value.trim().split(/\s+/).length >= 2) return "address";
  return null;
}

function getContactHref(value: string, type: "email" | "phone" | "address"): string {
  if (type === "email") return `mailto:${value}`;
  if (type === "phone") return `tel:${value.replace(/\s/g, "")}`;
  return `https://maps.apple.com/?q=${encodeURIComponent(value)}`;
}

type ContactFieldProps = {
  register: UseFormRegister<EditFormValues>;
  watch: UseFormWatch<EditFormValues>;
};

function ContactField({ register, watch }: ContactFieldProps) {
  const value = watch("contact") ?? "";
  const type = detectContactType(value);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="contact" className="label text-foreground">
        Contact
      </label>
      <Input
        id="contact"
        placeholder="Email, phone, or address"
        {...register("contact")}
      />
      {type && value && (
        <a
          href={getContactHref(value, type)}
          target={type === "address" ? "_blank" : undefined}
          rel={type === "address" ? "noopener noreferrer" : undefined}
          className="flex items-center gap-1 text-xs text-primary hover:underline w-fit"
        >
          <ExternalLink className="h-3 w-3" />
          {type === "email" ? "Send email" : type === "phone" ? "Call" : "Open in Maps"}
        </a>
      )}
    </div>
  );
}

export function TaskDetail({ taskId }: TaskDetailProps) {
  const router = useRouter();
  const { data: task, isLoading } = useTask(taskId);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [tags, setTags] = useState<string[]>(task?.tags ?? []);
  const [recurring, setRecurring] = useState<RecurringPattern | undefined>(
    task?.recurring as RecurringPattern | undefined,
  );
  const [assignee, setAssignee] = useState<string | undefined>(
    task?.assignee ?? undefined,
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
    values: task
      ? {
          title: task.title,
          category: task.category,
          subcategory: task.subcategory ?? undefined,
          priority: task.priority,
          dueDate: task.dueDate
            ? (() => {
                // Use local time methods so the datetime-local input shows the
                // correct local time, not the UTC time from toISOString()
                const d = new Date(task.dueDate);
                const pad = (n: number) => String(n).padStart(2, "0");
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
              })()
            : undefined,
          notes: task.notes ?? undefined,
          contact: task.contact ?? undefined,
        }
      : undefined,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="body text-muted-foreground">Task not found.</p>
        <Button variant="ghost" onClick={() => router.push("/tasks")}>
          Back to tasks
        </Button>
      </div>
    );
  }

  const selectedCategory = watch("category") ?? task.category;
  const subcategories =
    DEFAULT_CATEGORIES.find((c) => c.id === selectedCategory)?.subcategories ??
    [];

  // recurring, tags, and assignee are managed outside react-hook-form, so
  // isDirty won't catch their changes. Track them manually.
  const isExtraDirty =
    JSON.stringify(recurring ?? null) !== JSON.stringify(task.recurring ?? null) ||
    JSON.stringify(tags) !== JSON.stringify(task.tags ?? []) ||
    (assignee ?? null) !== (task.assignee ?? null);

  function onSubmit(data: EditFormValues) {
    updateTask.mutate(
      {
        id: taskId,
        ...data,
        // Convert datetime-local string to UTC ISO so the user's local time is
        // preserved regardless of server timezone. Empty string becomes undefined.
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
        // Use null (not undefined) so clearing these fields is persisted to DB.
        // undefined is stripped by JSON.stringify; null explicitly writes NULL.
        recurring: recurring ?? null,
        contact: data.contact || null,
        tags,
        assignee,
      },
      { onSuccess: () => router.push("/tasks") },
    );
  }

  function handleDelete() {
    deleteTask.mutate(taskId, {
      onSuccess: () => router.push("/tasks"),
    });
  }

  function handleToggleComplete() {
    updateTask.mutate({ id: taskId, completed: !task!.completed });
  }

  function handleAddSubtask() {
    const title = newSubtaskTitle.trim();
    if (!title) return;
    const subtask: Subtask = {
      id: crypto.randomUUID(),
      title,
      completed: false,
    };
    updateTask.mutate({ id: taskId, subtasks: [...task!.subtasks, subtask] });
    setNewSubtaskTitle("");
  }

  function handleToggleSubtask(subtaskId: string) {
    const updated = task!.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s,
    );
    updateTask.mutate({ id: taskId, subtasks: updated });
  }

  function handleDeleteSubtask(subtaskId: string) {
    const updated = task!.subtasks.filter((s) => s.id !== subtaskId);
    updateTask.mutate({ id: taskId, subtasks: updated });
  }

  const priorityVariant = { high: "high", medium: "medium", low: "low" } as const;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/tasks")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-1 items-center gap-3">
          <Checkbox
            checked={task.completed}
            onCheckedChange={handleToggleComplete}
          />
          <h2 className="heading-sm text-foreground">{task.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={priorityVariant[task.priority]}>
            {task.priority}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          id="title"
          label="Title"
          error={errors.title?.message}
          {...register("title")}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="label text-foreground">Category</label>
            <Select
              value={selectedCategory}
              onValueChange={(val) => {
                setValue("category", val, { shouldDirty: true });
                setValue("subcategory", undefined);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {subcategories.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="label text-foreground">Subcategory</label>
              <Select
                value={watch("subcategory") ?? ""}
                onValueChange={(val) =>
                  setValue("subcategory", val === "none" ? undefined : val, {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {subcategories.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="label text-foreground">Priority</label>
            <Select
              value={watch("priority") ?? task.priority}
              onValueChange={(val) =>
                setValue("priority", val as "high" | "medium" | "low", {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Input
            id="dueDate"
            label="Due date"
            type="datetime-local"
            step={60}
            {...register("dueDate")}
          />
        </div>

        <ContactField register={register} watch={watch} />

        <AssigneePicker value={assignee} onChange={setAssignee} />

        <Textarea id="notes" label="Notes" {...register("notes")} />

        <TagPicker value={tags} onChange={setTags} />

        <RecurringPicker value={recurring} onChange={setRecurring} />

        {/* Subtasks */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="label text-foreground">Subtasks</label>
            {task.subtasks.length > 0 && (
              <span className="caption text-muted-foreground">
                {task.subtasks.filter((s) => s.completed).length}/
                {task.subtasks.length} subtasks completed
              </span>
            )}
          </div>

          {task.subtasks.length > 0 && (
            <div className="flex flex-col gap-1">
              {task.subtasks.map((subtask) => (
                <div
                  key={subtask.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={subtask.completed}
                    onCheckedChange={() => handleToggleSubtask(subtask.id)}
                  />
                  <span
                    className={
                      subtask.completed
                        ? "body flex-1 text-muted-foreground line-through"
                        : "body flex-1 text-foreground"
                    }
                  >
                    {subtask.title}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleDeleteSubtask(subtask.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Input
              id="new-subtask"
              placeholder="Add a subtask..."
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSubtask();
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleAddSubtask}
              disabled={!newSubtaskTitle.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {updateTask.error && (
          <p className="body text-destructive">
            Failed to update task. Please try again.
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/tasks")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={(!isDirty && !isExtraDirty) || updateTask.isPending}>
            {updateTask.isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{task.title}&rdquo;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTask.isPending}
            >
              {deleteTask.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
