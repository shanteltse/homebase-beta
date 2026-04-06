ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pwa_installed" boolean NOT NULL DEFAULT false;
