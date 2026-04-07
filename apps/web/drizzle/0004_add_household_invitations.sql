CREATE TABLE IF NOT EXISTS "household_invitations" (
  "id" text PRIMARY KEY NOT NULL,
  "household_id" text NOT NULL REFERENCES "households"("id") ON DELETE CASCADE,
  "inviter_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "token" text NOT NULL UNIQUE,
  "expires_at" timestamp NOT NULL,
  "accepted_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
