import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { DEFAULT_ELO } from "@/lib/chess/elo";
import type { UserStats } from "./types";

function toUserStats(row: {
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
}): UserStats {
  return {
    elo: row.elo ?? DEFAULT_ELO,
    wins: row.wins ?? 0,
    losses: row.losses ?? 0,
    draws: row.draws ?? 0,
    gamesPlayed: row.gamesPlayed ?? 0,
  };
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const db = getDb();
  const [row] = await db
    .select({
      elo: users.elo,
      wins: users.wins,
      losses: users.losses,
      draws: users.draws,
      gamesPlayed: users.gamesPlayed,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) {
    return { elo: DEFAULT_ELO, wins: 0, losses: 0, draws: 0, gamesPlayed: 0 };
  }
  return toUserStats(row);
}

export async function applyRatedGameStats(
  userId: string,
  input: {
    result: "win" | "loss" | "draw";
    eloBefore: number;
    eloChange: number;
  }
): Promise<UserStats> {
  const db = getDb();
  const current = await getUserStats(userId);
  const newElo = Math.max(100, input.eloBefore + input.eloChange);

  const [row] = await db
    .update(users)
    .set({
      elo: newElo,
      wins: current.wins + (input.result === "win" ? 1 : 0),
      losses: current.losses + (input.result === "loss" ? 1 : 0),
      draws: current.draws + (input.result === "draw" ? 1 : 0),
      gamesPlayed: current.gamesPlayed + 1,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
      elo: users.elo,
      wins: users.wins,
      losses: users.losses,
      draws: users.draws,
      gamesPlayed: users.gamesPlayed,
    });

  return toUserStats(row);
}

export async function applyCasualGameStats(
  userId: string,
  result: "win" | "loss" | "draw"
): Promise<UserStats> {
  const db = getDb();
  const current = await getUserStats(userId);

  const [row] = await db
    .update(users)
    .set({
      wins: current.wins + (result === "win" ? 1 : 0),
      losses: current.losses + (result === "loss" ? 1 : 0),
      draws: current.draws + (result === "draw" ? 1 : 0),
      gamesPlayed: current.gamesPlayed + 1,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
      elo: users.elo,
      wins: users.wins,
      losses: users.losses,
      draws: users.draws,
      gamesPlayed: users.gamesPlayed,
    });

  return toUserStats(row);
}
