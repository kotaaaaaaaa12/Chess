import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  uniqueIndex,
  index,
  boolean,
  integer,
  text,
  jsonb,
} from "drizzle-orm/pg-core";
import type { MoveRecord } from "@/lib/chess/types";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }),
    username: varchar("username", { length: 32 }).notNull(),
    displayName: varchar("display_name", { length: 64 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }),
    avatarUrl: varchar("avatar_url", { length: 512 }),
    elo: integer("elo").default(1200).notNull(),
    wins: integer("wins").default(0).notNull(),
    losses: integer("losses").default(0).notNull(),
    draws: integer("draws").default(0).notNull(),
    gamesPlayed: integer("games_played").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_username_unique").on(table.username),
    index("users_created_at_idx").on(table.createdAt),
  ]
);

export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 32 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("oauth_provider_account_unique").on(table.provider, table.providerAccountId),
    index("oauth_user_id_idx").on(table.userId),
  ]
);

export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    playedAt: timestamp("played_at", { withTimezone: true }).defaultNow().notNull(),
    playAgainst: varchar("play_against", { length: 16 }).notNull(),
    aiDifficulty: varchar("ai_difficulty", { length: 16 }),
    humanColor: varchar("human_color", { length: 8 }).notNull(),
    result: varchar("result", { length: 8 }).notNull(),
    rated: boolean("rated").default(false).notNull(),
    eloBefore: integer("elo_before"),
    eloChange: integer("elo_change").default(0),
    moveCount: integer("move_count").default(0).notNull(),
    openingName: varchar("opening_name", { length: 128 }),
    timeControl: integer("time_control"),
    opponentName: varchar("opponent_name", { length: 64 }),
    drawReason: varchar("draw_reason", { length: 32 }),
    winner: varchar("winner", { length: 8 }),
    pgn: text("pgn"),
    history: jsonb("history").$type<MoveRecord[][]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("games_user_played_idx").on(table.userId, table.playedAt),
  ]
);

export type DbUser = typeof users.$inferSelect;
export type DbOauthAccount = typeof oauthAccounts.$inferSelect;
export type DbGame = typeof games.$inferSelect;
