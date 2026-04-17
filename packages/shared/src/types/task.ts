import { z } from "zod/v4";

export const taskPrioritySchema = z.enum(["high", "medium", "low"]);
export type TaskPriority = z.infer<typeof taskPrioritySchema>;

export const taskStatusSchema = z.enum(["active", "completed", "waiting"]);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const recurringPatternSchema = z.object({
  frequency: z.enum(["daily", "weekly", "biweekly", "monthly", "custom"]),
  interval: z.number().int().positive().optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
});
export type RecurringPattern = z.infer<typeof recurringPatternSchema>;

export const subtaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  completed: z.boolean().default(false),
});
export type Subtask = z.infer<typeof subtaskSchema>;

export const taskSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  category: z.string(),
  subcategory: z.string().optional(),
  priority: taskPrioritySchema.default("medium"),
  status: taskStatusSchema.default("active"),
  dueDate: z.string().datetime().optional(),
  completed: z.boolean().default(false),
  completedAt: z.string().datetime().optional(),
  subtasks: z.array(subtaskSchema).default([]),
  tags: z.array(z.string()).default([]),
  assignee: z.string().optional(),
  recurring: recurringPatternSchema.optional(),
  notes: z.string().optional(),
  contact: z.string().optional(),
  links: z.array(z.string().url()).default([]),
  starred: z.boolean().default(false),
  userId: z.string(),
  householdId: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Task = z.infer<typeof taskSchema>;

export const createTaskInputSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  priority: taskPrioritySchema.default("medium"),
  // Accept any date string (ISO with or without timezone, datetime-local format, etc.)
  // new Date() handles all of these; strict .datetime() rejected datetime-local input
  dueDate: z.string().refine((v) => v === "" || !isNaN(Date.parse(v)), "Invalid date").nullable().optional(),
  subtasks: z.array(subtaskSchema).default([]),
  tags: z.array(z.string()).default([]),
  assignee: z.string().optional(),
  recurring: recurringPatternSchema.optional(),
  notes: z.string().optional(),
  contact: z.string().optional(),
  links: z.array(z.string().url()).default([]),
});
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

export const updateTaskInputSchema = createTaskInputSchema.partial().extend({
  id: z.string(),
  completed: z.boolean().optional(),
  starred: z.boolean().optional(),
  status: taskStatusSchema.optional(),
  // Allow explicit null to clear recurring (undefined = not sent, null = remove it)
  recurring: z.union([recurringPatternSchema, z.null()]).optional(),
  // Allow explicit null to clear contact
  contact: z.string().nullable().optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;
