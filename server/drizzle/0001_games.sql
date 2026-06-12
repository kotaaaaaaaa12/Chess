CREATE TABLE IF NOT EXISTS "games" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "played_at" timestamp with time zone DEFAULT now() NOT NULL,
  "play_against" varchar(16) NOT NULL,
  "ai_difficulty" varchar(16),
  "human_color" varchar(8) NOT NULL,
  "result" varchar(8) NOT NULL,
  "rated" boolean DEFAULT false NOT NULL,
  "elo_before" integer,
  "elo_change" integer DEFAULT 0,
  "move_count" integer DEFAULT 0 NOT NULL,
  "opening_name" varchar(128),
  "time_control" integer,
  "opponent_name" varchar(64),
  "draw_reason" varchar(32),
  "winner" varchar(8),
  "pgn" text,
  "history" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "games_user_played_idx" ON "games" ("user_id", "played_at" DESC);
