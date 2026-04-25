"use client";

import { useRouter } from "next/navigation";
import { useForm, type UseFormRegister, type UseFormWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { ArrowLeft, Calendar, ExternalLink, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Spinner } from "@repo/ui/spinner";
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
import { useState, useEffect, useRef } from "react";

const editFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]),
  dueDateDate: z.string().optional(),
  dueDateTime: z.string().optional(),
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
    <div className="flex flex-col gap-1">
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
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const titleTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const notesTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isTitleEditing && titleTextareaRef.current) {
      const el = titleTextareaRef.current;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [isTitleEditing]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [tags, setTags] = useState<string[]>(task?.tags ?? []);
  const [recurring, setRecurring] = useState<RecurringPattern | undefined>(
    task?.recurring as RecurringPattern | undefined,
  );
  const [assignee, setAssignee] = useState<string | undefined>(
    task?.assignee ?? undefined,
  );

  useEffect(() => {
    if (notesTextareaRef.current) {
      notesTextareaRef.current.style.height = "auto";
      notesTextareaRef.current.style.height = `${notesTextareaRef.current.scrollHeight}px`;
    }
  }, [task?.notes]);

  // Sync out-of-form state when task data arrives asynchronously
  // (e.g. individual-task cache was cold after a mutation invalidation).
  useEffect(() => {
    if (!task) return;
    setTags(task.tags ?? []);
    setRecurring(task.recurring as RecurringPattern | undefined);
    setAssignee(task.assignee ?? undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

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
          dueDateDate: task.dueDate
            ? /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)
              ? task.dueDate
              : (() => {
                  const d = new Date(task.dueDate);
                  const pad = (n: number) => String(n).padStart(2, "0");
                  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                })()
            : "",
          dueDateTime: task.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)
            ? (() => {
                const d = new Date(task.dueDate);
                const pad = (n: number) => String(n).padStart(2, "0");
                const t = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
                return t === "00:00" ? "" : t;
              })()
            : "",
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
    const { dueDateDate, dueDateTime, ...rest } = data;
    updateTask.mutate(
      {
        id: taskId,
        ...rest,
        dueDate: dueDateDate
          ? dueDateTime
            ? new Date(`${dueDateDate}T${dueDateTime}`).toISOString()
            : dueDateDate
          : undefined,
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

  const { ref: titleFormRef, ...titleRegisterProps } = register("title");
  const { ref: notesFormRef, ...notesRegisterProps } = register("notes");

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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/tasks")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <Checkbox
            checked={task.completed}
            onCheckedChange={handleToggleComplete}
          />
          {isTitleEditing ? (
            <textarea
              {...titleRegisterProps}
              ref={(el) => {
                titleFormRef(el);
                titleTextareaRef.current = el;
              }}
              className="heading-sm flex-1 min-w-0 resize-none overflow-hidden rounded-md bg-muted/40 px-1 py-0.5 text-foreground outline-none placeholder:text-muted-foreground focus:bg-muted/50 focus:ring-1 focus:ring-ring transition-colors"
              placeholder="Task title"
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }}
              onBlur={() => setIsTitleEditing(false)}
            />
          ) : (
            <span
              role="button"
              tabIndex={0}
              onClick={() => setIsTitleEditing(true)}
              onKeyDown={(e) => e.key === "Enter" && setIsTitleEditing(true)}
              className="heading-sm flex-1 min-w-0 truncate cursor-text rounded-md px-1 py-0.5 text-foreground hover:bg-muted/50 transition-colors"
            >
              {watch("title") || task.title}
            </span>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
          <Select
            value={watch("priority") ?? task.priority}
            onValueChange={(val) =>
              setValue("priority", val as "high" | "medium" | "low", { shouldDirty: true })
            }
          >
            <SelectTrigger
              className={cn(
                "h-auto w-auto min-w-0 gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium [&>svg]:h-2.5 [&>svg]:w-2.5",
                watch("priority") === "high"
                  ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
                  : watch("priority") === "low"
                    ? "border-border bg-muted/50 text-muted-foreground"
                    : "border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400",
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <form id="task-detail-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
        {errors.title?.message && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
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
            <div className="flex flex-col gap-1">
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

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <label htmlFor="dueDateDate" className="label text-foreground shrink-0">Due date</label>
              <RecurringPicker value={recurring} onChange={setRecurring} />
            </div>
            <input
              id="dueDateDate"
              type="date"
              {...register("dueDateDate")}
              className="flex h-10 w-full appearance-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-date-and-time-value]:text-left"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="dueDateTime" className="label text-foreground">Time (optional)</label>
            <div className="relative">
              <input
                id="dueDateTime"
                type="time"
                {...register("dueDateTime")}
                className="flex h-10 w-full appearance-none rounded-md border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-date-and-time-value]:text-left"
              />
            {watch("dueDateTime") && (
              <button
                type="button"
                onClick={() => setValue("dueDateTime", "", { shouldDirty: true })}
                aria-label="Clear time"
                className="absolute right-2 bottom-0 flex h-10 items-center px-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <AssigneePicker value={assignee} onChange={setAssignee} />
          <ContactField register={register} watch={watch} />
        </div>

        {/* Notes — auto-resizes to fit content */}
        <div className="flex flex-col gap-1">
          <label htmlFor="notes" className="label text-foreground">Notes</label>
          <textarea
            id="notes"
            {...notesRegisterProps}
            ref={(el) => {
              notesFormRef(el);
              notesTextareaRef.current = el;
            }}
            rows={2}
            placeholder="Add notes…"
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
            className="flex w-full resize-none overflow-hidden rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Subtasks */}
        <div className="flex flex-col gap-2">
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

        <TagPicker value={tags} onChange={setTags} />

        {updateTask.error && (
          <p className="body text-destructive">
            Failed to update task. Please try again.
          </p>
        )}
      </form>

      <div className="fixed bottom-16 left-0 right-0 z-30 bg-background border-t border-border px-6 pt-2 pb-4 md:static md:bottom-auto md:left-auto md:right-auto md:z-auto md:px-0 md:mt-4">
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/tasks")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="task-detail-form"
            disabled={(!isDirty && !isExtraDirty) || updateTask.isPending}
          >
            {updateTask.isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>

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
