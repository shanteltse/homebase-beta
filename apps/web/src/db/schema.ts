import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  primaryKey,
  jsonb,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ─── Auth.js tables ───

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  // Onboarding
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  onboardingStep: integer("onboarding_step").notNull().default(0),
  // Notification preferences
  notificationDailyRecap: boolean("notification_daily_recap").notNull().default(true),
  notificationRecapTime: text("notification_recap_time").notNull().default("08:00"),
  notificationMorningSummary: boolean("notification_morning_summary").notNull().default(true),
  notificationTaskReminders: boolean("notification_task_reminders").notNull().default(true),
  // Google Calendar
  gcalConnected: boolean("gcal_connected").notNull().default(false),
  gcalSyncEnabled: boolean("gcal_sync_enabled").notNull().default(false),
  gcalSyncFrequency: text("gcal_sync_frequency", {
    enum: ["realtime", "hourly", "twice_daily"],
  }).notNull().default("realtime"),
  gcalSyncWhat: text("gcal_sync_what", {
    enum: ["all", "starred", "today_week"],
  }).notNull().default("all"),
  gcalIncludeNotes: boolean("gcal_include_notes").notNull().default(true),
  gcalIncludeAssignee: boolean("gcal_include_assignee").notNull().default(true),
  gcalAccessToken: text("gcal_access_token"),
  gcalRefreshToken: text("gcal_refresh_token"),
  gcalCalendarId: text("gcal_calendar_id"),
  gcalLastSync: timestamp("gcal_last_sync", { mode: "date" }),
  // Voice input
  voiceInputEnabled: boolean("voice_input_enabled").notNull().default(true),
  voiceInputLanguage: text("voice_input_language").notNull().default("en-US"),
  voiceInputAutoSubmit: boolean("voice_input_auto_submit").notNull().default(false),
  // Dashboard preferences
  showStatsOnDashboard: boolean("show_stats_on_dashboard").notNull().default(true),
  showTaskSummaryOnDashboard: boolean("show_task_summary_on_dashboard").notNull().default(true),
  // Google Calendar display preference
  showGcalEvents: boolean("show_gcal_events").notNull().default(true),
  // Email reminder preferences
  reminderDailyEnabled: boolean("reminder_daily_enabled").notNull().default(false),
  reminderDailyTime: text("reminder_daily_time").notNull().default("08:00"),
  reminderWeeklyEnabled: boolean("reminder_weekly_enabled").notNull().default(false),
  reminderWeeklyTime: text("reminder_weekly_time").notNull().default("08:00"),
  // PWA tracking
  pwaInstalled: boolean("pwa_installed").notNull().default(false),
  // Avatar customization
  avatarColor: text("avatar_color"),
  useGooglePhoto: boolean("use_google_photo").notNull().default(true),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// ─── Household tables ───

export const households = pgTable("households", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  code: text("code").unique().notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const householdMembers = pgTable("household_members", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  householdId: text("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["owner", "member"] })
    .notNull()
    .default("member"),
  joinedAt: timestamp("joined_at", { mode: "date" }).defaultNow().notNull(),
});

// ─── App tables ───

export const tasks = pgTable("tasks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  householdId: text("household_id")
    .references(() => households.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  priority: text("priority", { enum: ["high", "medium", "low"] })
    .notNull()
    .default("medium"),
  status: text("status", { enum: ["active", "completed", "waiting"] })
    .notNull()
    .default("active"),
  dueDate: timestamp("due_date", { mode: "date" }),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at", { mode: "date" }),
  subtasks: jsonb("subtasks")
    .$type<{ id: string; title: string; completed: boolean }[]>()
    .notNull()
    .default([]),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  assignee: text("assignee"),
  recurring: jsonb("recurring").$type<{
    frequency: "daily" | "weekly" | "biweekly" | "monthly" | "custom";
    interval?: number;
    daysOfWeek?: number[];
  }>(),
  notes: text("notes"),
  contact: text("contact"),
  links: jsonb("links").$type<string[]>().notNull().default([]),
  starred: boolean("starred").notNull().default(false),
  isStarter: boolean("is_starter").notNull().default(false),
  isSample: boolean("is_sample").notNull().default(false),
  isImported: boolean("is_imported").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// ─── Achievements ───

export const achievements = pgTable("achievements", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  unlockedAt: timestamp("unlocked_at", { mode: "date" }).defaultNow().notNull(),
});

// ─── Onboarding household members ───

export const onboardingMembers = pgTable("onboarding_members", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  relationship: text("relationship", {
    enum: ["partner", "child", "roommate", "other"],
  }).notNull().default("other"),
  photoUrl: text("photo_url"),
  invitedAt: timestamp("invited_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ─── Household invitations ───

export const householdInvitations = pgTable("household_invitations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  householdId: text("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  inviterUserId: text("inviter_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  acceptedAt: timestamp("accepted_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ─── Calendar event mappings ───

export const calendarEvents = pgTable("calendar_events", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  gcalEventId: text("gcal_event_id").notNull(),
  lastSyncedAt: timestamp("last_synced_at", { mode: "date" }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ─── Device tokens (push notifications) ───

export const deviceTokens = pgTable("device_tokens", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  platform: text("platform", { enum: ["ios", "android"] }).notNull().default("ios"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// ─── Notifications ───

export const notifications = pgTable("notifications", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: [
      "overdue",
      "due_today",
      "due_soon",
      "task_completed",
      "household_invite",
      "general",
    ],
  }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  taskId: text("task_id").references(() => tasks.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});
