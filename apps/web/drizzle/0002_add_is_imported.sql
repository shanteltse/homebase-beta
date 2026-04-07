ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "is_imported" boolean NOT NULL DEFAULT false;
