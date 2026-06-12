CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(255),
  "username" varchar(32) NOT NULL,
  "display_name" varchar(64) NOT NULL,
  "password_hash" varchar(255),
  "avatar_url" varchar(512),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_unique" ON "users" ("username");
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users" ("created_at");

CREATE TABLE IF NOT EXISTS "oauth_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "provider" varchar(32) NOT NULL,
  "provider_account_id" varchar(255) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "oauth_provider_account_unique" ON "oauth_accounts" ("provider", "provider_account_id");
CREATE INDEX IF NOT EXISTS "oauth_user_id_idx" ON "oauth_accounts" ("user_id");
