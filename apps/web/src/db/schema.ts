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
  links: jsonb("links").$type<string[]>().notNull().default([]),
  starred: boolean("starred").notNull().default(false),
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
