import { notifyStatsUpdated } from "@/lib/stats/events";
import { mergeCloudStatsIntoLocal } from "@/lib/storage";
import type { GameDetail, GameSummary, SaveGameInput } from "./types";
import type { UserStats } from "@/lib/stats/types";

const TOKEN_KEY = "chess_auth_token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export async function saveGameToCloud(input: SaveGameInput): Promise<GameSummary | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await fetch("/api/games", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...input, clientGameId: crypto.randomUUID() }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { game: GameSummary; stats?: UserStats };
    if (data.stats) {
      mergeCloudStatsIntoLocal(data.stats);
      notifyStatsUpdated();
    }
    return data.game;
  } catch {
    return null;
  }
}

export async function fetchGameHistory(): Promise<GameSummary[]> {
  const token = getToken();
  if (!token) return [];

  try {
    const res = await fetch("/api/games", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { games: GameSummary[] };
    return data.games;
  } catch {
    return [];
  }
}

export async function fetchGameDetail(gameId: string): Promise<GameDetail | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await fetch(`/api/games/${gameId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { game: GameDetail };
    return data.game;
  } catch {
    return null;
  }
}
