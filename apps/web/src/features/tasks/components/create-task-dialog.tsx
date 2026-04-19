"use client";

import { useState } from "react";
import { X, ExternalLink, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { cn } from "@/utils/cn";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Textarea } from "@repo/ui/textarea";
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
import type { CreateTaskInput, RecurringPattern, Subtask } from "@/types/task";
import { useCreateTask } from "../api/create-task";
import { TagPicker } from "./tag-picker";
import { RecurringPicker } from "./recurring-picker";
import { AssigneePicker } from "@/features/household/components/assignee-picker";
import { VoiceInput } from "@/features/voice/components/voice-input";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]),
  dueDateDate: z.string().optional(),
  dueDateTime: z.string().optional(),
  notes: z.string().optional(),
  contact: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type CreateTaskDialogPrefill = {
  title?: string;
  category?: string;
  subcategory?: string;
  priority?: "high" | "medium" | "low";
  dueDate?: string;
  tags?: string[];
  notes?: string;
};

type CreateTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: CreateTaskDialogPrefill;
};

function detectContactType(value: string): "email" | "phone" | "address" | null {
  if (!value.trim()) return null;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "email";
  if (/^[+\d][\d\s\-().]{6,}$/.test(value)) return "phone";
  if (/\d/.test(value) && value.trim().split(/\s+/).length >= 2) return "address";
  return null;
}

function getContactHref(value: string, type: "email" | "phone" | "address"): string {
  if (type === "email") return `mailto:${value}`;
  if (type === "phone") return `tel:${value.replace(/\s/g, "")}`;
  return `https://maps.apple.com/?q=${encodeURIComponent(value)}`;
}

export function CreateTaskDialog({ open, onOpenChange, prefill }: CreateTaskDialogProps) {
  const createTask = useCreateTask();
  const [tags, setTags] = useState<string[]>(prefill?.tags ?? []);
  const [recurring, setRecurring] = useState<RecurringPattern | undefined>();
  const [assignee, setAssignee] = useState<string | undefined>();
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: prefill?.title ?? "",
      priority: prefill?.priority ?? "medium",
      category: prefill?.category ?? DEFAULT_CATEGORIES[0]?.id ?? "",
      subcategory: prefill?.subcategory,
      dueDateDate: prefill?.dueDate
        ? /^\d{4}-\d{2}-\d{2}$/.test(prefill.dueDate)
          ? prefill.dueDate
          : (() => {
              const d = new Date(prefill.dueDate!);
              const pad = (n: number) => String(n).padStart(2, "0");
              return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
            })()
        : "",
      dueDateTime: prefill?.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(prefill.dueDate)
        ? (() => {
            const d = new Date(prefill.dueDate!);
            const pad = (n: number) => String(n).padStart(2, "0");
            return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
          })()
        : "",
      notes: prefill?.notes,
      contact: "",
    },
  });

  const selectedCategory = watch("category");
  const subcategories =
    DEFAULT_CATEGORIES.find((c) => c.id === selectedCategory)?.subcategories ??
    [];

  function handleAddSubtask() {
    const title = newSubtaskTitle.trim();
    if (!title) return;
    setSubtasks((prev) => [...prev, { id: crypto.randomUUID(), title, completed: false }]);
    setNewSubtaskTitle("");
  }

  function handleRemoveSubtask(id: string) {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  }

  function onSubmit(data: FormValues) {
    const { dueDateDate, dueDateTime, ...rest } = data;
    const input: CreateTaskInput = {
      ...rest,
      dueDate: dueDateDate
        ? dueDateTime
          ? new Date(`${dueDateDate}T${dueDateTime}`).toISOString()
          : dueDateDate
        : undefined,
      subtasks,
      tags,
      links: [],
      recurring,
      assignee,
    };
    createTask.mutate(input, {
      onSuccess: () => {
        reset();
        setTags([]);
        setRecurring(undefined);
        setAssignee(undefined);
        setSubtasks([]);
        setNewSubtaskTitle("");
        onOpenChange(false);
      },
    });
  }

  const priority = watch("priority");
  const contactValue = watch("contact") ?? "";
  const contactType = detectContactType(contactValue);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader className="shrink-0">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div>
              <DialogTitle>Create task</DialogTitle>
              <DialogDescription>Add a new task to your list.</DialogDescription>
            </div>
            {/* Priority pill — matches task-detail header */}
            <Select
              value={priority}
              onValueChange={(val) => setValue("priority", val as "high" | "medium" | "low")}
            >
              <SelectTrigger
                className={cn(
                  "h-auto w-auto min-w-0 gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium [&>svg]:h-2.5 [&>svg]:w-2.5",
                  priority === "high"
                    ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
                    : priority === "low"
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
        </DialogHeader>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <form
            id="create-task-form"
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-2"
          >
            {/* Title */}
            <div className="flex flex-col gap-1">
              <label htmlFor="title" className="label text-foreground">
                Title
              </label>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <Input
                    id="title"
                    placeholder="What needs to be done?"
                    error={errors.title?.message}
                    {...register("title")}
                  />
                </div>
                <VoiceInput
                  onTranscript={(text) => setValue("title", text, { shouldValidate: true })}
                  className="mt-0.5"
                />
              </div>
            </div>

            {/* Category + Subcategory */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="label text-foreground">Category</label>
                <Select
                  value={selectedCategory}
                  onValueChange={(val) => {
                    setValue("category", val);
                    setValue("subcategory", undefined);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-xs text-destructive">
                    {errors.category.message}
                  </p>
                )}
              </div>

              {subcategories.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="label text-foreground">Subcategory</label>
                  <Select
                    value={watch("subcategory") ?? ""}
                    onValueChange={(val) =>
                      setValue("subcategory", val === "none" ? undefined : val)
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

            {/* Due date + Time */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="dueDateDate" className="label text-foreground">Due date</label>
                <input
                  id="dueDateDate"
                  type="date"
                  {...register("dueDateDate")}
                  className="flex h-10 max-h-10 min-h-0 w-full appearance-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-date-and-time-value]:text-left"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="dueDateTime" className="label text-foreground">Time (optional)</label>
                <div className="relative">
                  <input
                    id="dueDateTime"
                    type="time"
                    {...register("dueDateTime")}
                    className="flex h-10 max-h-10 min-h-0 w-full appearance-none rounded-md border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-date-and-time-value]:text-left"
                  />
                  {watch("dueDateTime") && (
                    <button
                      type="button"
                      onClick={() => setValue("dueDateTime", "")}
                      aria-label="Clear time"
                      className="absolute right-2 bottom-0 flex h-10 items-center px-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Recurring */}
            <div className="flex items-center gap-2">
              <RecurringPicker value={recurring} onChange={setRecurring} />
            </div>

            {/* Assignee + Contact */}
            <div className="grid grid-cols-2 gap-2">
              <AssigneePicker value={assignee} onChange={setAssignee} />

              <div className="flex flex-col gap-1">
                <label htmlFor="contact" className="label text-foreground">
                  Contact
                </label>
                <Input
                  id="contact"
                  placeholder="Email, phone, or address"
                  {...register("contact")}
                />
                {contactType && contactValue && (
                  <a
                    href={getContactHref(contactValue, contactType)}
                    target={contactType === "address" ? "_blank" : undefined}
                    rel={contactType === "address" ? "noopener noreferrer" : undefined}
                    className="flex items-center gap-1 text-xs text-primary hover:underline w-fit"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {contactType === "email" ? "Send email" : contactType === "phone" ? "Call" : "Open in Maps"}
                  </a>
                )}
              </div>
            </div>

            {/* Notes */}
            <Textarea
              id="notes"
              label="Notes"
              placeholder="Any additional details..."
              rows={2}
              {...register("notes")}
            />

            {/* Subtasks */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="label text-foreground">Subtasks</label>
                {subtasks.length > 0 && (
                  <span className="caption text-muted-foreground">
                    {subtasks.length} subtask{subtasks.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {subtasks.length > 0 && (
                <div className="flex flex-col gap-1">
                  {subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
                    >
                      <Checkbox checked={false} disabled />
                      <span className="body flex-1 text-foreground">{subtask.title}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveSubtask(subtask.id)}
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

            {/* Tags */}
            <TagPicker value={tags} onChange={setTags} />

            {createTask.error && (
              <p className="body text-destructive">
                Failed to create task. Please try again.
              </p>
            )}
          </form>
        </div>

        {/* Sticky footer — always visible at bottom of dialog */}
        <div className="shrink-0 border-t border-border pt-3 flex justify-end gap-3 bg-background">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="create-task-form" disabled={createTask.isPending}>
            {createTask.isPending ? "Creating..." : "Create task"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
