"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Textarea } from "@repo/ui/textarea";
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
import type { CreateTaskInput, RecurringPattern } from "@/types/task";
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
  dueDate: z.string().optional(),
  notes: z.string().optional(),
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

export function CreateTaskDialog({ open, onOpenChange, prefill }: CreateTaskDialogProps) {
  const createTask = useCreateTask();
  const [tags, setTags] = useState<string[]>(prefill?.tags ?? []);
  const [recurring, setRecurring] = useState<RecurringPattern | undefined>();
  const [assignee, setAssignee] = useState<string | undefined>();

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
      dueDate: prefill?.dueDate,
      notes: prefill?.notes,
    },
  });

  const selectedCategory = watch("category");
  const subcategories =
    DEFAULT_CATEGORIES.find((c) => c.id === selectedCategory)?.subcategories ??
    [];

  function onSubmit(data: FormValues) {
    const input: CreateTaskInput = {
      ...data,
      // Convert datetime-local string to UTC ISO so the user's local time is
      // preserved regardless of server timezone. Empty string becomes undefined.
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      subtasks: [],
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
        onOpenChange(false);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>Add a new task to your list.</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="title" className="text-sm font-medium text-foreground">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
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
              <div className="flex flex-col gap-1.5">
                <label className="label text-foreground">Subcategory</label>
                <Select
                  value={watch("subcategory") ?? ""}
                  onValueChange={(val) =>
                    setValue("subcategory", val === "none" ? undefined : val)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
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
                value={watch("priority")}
                onValueChange={(val) =>
                  setValue("priority", val as "high" | "medium" | "low")
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

          <AssigneePicker value={assignee} onChange={setAssignee} />

          <Textarea
            id="notes"
            label="Notes"
            placeholder="Any additional details..."
            {...register("notes")}
          />

          <TagPicker value={tags} onChange={setTags} />

          <RecurringPicker value={recurring} onChange={setRecurring} />

          {createTask.error && (
            <p className="body text-destructive">
              Failed to create task. Please try again.
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending ? "Creating..." : "Create task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
