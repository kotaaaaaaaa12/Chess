import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { games } from "@/lib/db/schema";
import type { GameDetail, GameSummary, SaveGameInput } from "./types";

function toSummary(row: typeof games.$inferSelect): GameSummary {
  return {
    id: row.id,
    playedAt: row.playedAt.toISOString(),
    playAgainst: row.playAgainst as GameSummary["playAgainst"],
    aiDifficulty: (row.aiDifficulty as GameSummary["aiDifficulty"]) ?? null,
    humanColor: row.humanColor as GameSummary["humanColor"],
    result: row.result as GameSummary["result"],
    rated: row.rated,
    eloBefore: row.eloBefore,
    eloChange: row.eloChange ?? 0,
    moveCount: row.moveCount,
    openingName: row.openingName,
    timeControl: row.timeControl,
    opponentName: row.opponentName,
    drawReason: row.drawReason,
    winner: (row.winner as GameSummary["winner"]) ?? null,
  };
}

export async function createGame(userId: string, input: SaveGameInput): Promise<GameSummary> {
  const db = getDb();
  const [row] = await db
    .insert(games)
    .values({
      userId,
      playAgainst: input.playAgainst,
      aiDifficulty: input.aiDifficulty,
      humanColor: input.humanColor,
      result: input.result,
      rated: input.rated,
      eloBefore: input.eloBefore,
      eloChange: input.eloChange,
      moveCount: input.moveCount,
      openingName: input.openingName,
      timeControl: input.timeControl,
      opponentName: input.opponentName ?? null,
      drawReason: input.drawReason ?? null,
      winner: input.winner ?? null,
      pgn: input.pgn,
      history: input.history,
    })
    .returning();

  return toSummary(row);
}

export async function listGamesForUser(userId: string, limit = 50): Promise<GameSummary[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(games)
    .where(eq(games.userId, userId))
    .orderBy(desc(games.playedAt))
    .limit(limit);

  return rows.map(toSummary);
}

export async function getGameForUser(userId: string, gameId: string): Promise<GameDetail | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(games)
    .where(and(eq(games.id, gameId), eq(games.userId, userId)))
    .limit(1);

  if (!row) return null;

  return {
    ...toSummary(row),
    pgn: row.pgn ?? "",
    history: row.history,
  };
}
