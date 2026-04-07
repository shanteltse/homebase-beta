ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reminder_daily_enabled" boolean NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reminder_daily_time" text NOT NULL DEFAULT '08:00';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reminder_weekly_enabled" boolean NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reminder_weekly_time" text NOT NULL DEFAULT '08:00';
