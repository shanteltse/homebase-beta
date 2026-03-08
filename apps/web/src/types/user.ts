import { z } from "zod/v4";

export const notificationPreferencesSchema = z.object({
  enabled: z.boolean().default(true),
  morningRecap: z.boolean().default(true),
  overdueReminders: z.boolean().default(true),
  dueTodayAlerts: z.boolean().default(true),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
});
export type NotificationPreferences = z.infer<
  typeof notificationPreferencesSchema
>;

export const emailDigestSchema = z.object({
  enabled: z.boolean().default(false),
  frequency: z.enum(["daily", "weekly"]).default("weekly"),
  time: z.string().default("08:00"),
  email: z.string().email().optional(),
});
export type EmailDigest = z.infer<typeof emailDigestSchema>;

export const userSettingsSchema = z.object({
  notifications: notificationPreferencesSchema.optional(),
  defaultCategory: z.string().optional(),
  calendarView: z.enum(["month", "week", "day"]).default("month"),
  aiEnabled: z.boolean().default(true),
  emailDigest: emailDigestSchema.optional(),
  hasCompletedOnboarding: z.boolean().default(false),
});
export type UserSettings = z.infer<typeof userSettingsSchema>;

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
  photoURL: z.string().url().optional(),
  householdId: z.string().optional(),
  settings: userSettingsSchema.optional(),
  createdAt: z.string().datetime(),
});
export type User = z.infer<typeof userSchema>;
