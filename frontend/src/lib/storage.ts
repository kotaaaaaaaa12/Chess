import { DEFAULT_ELO } from "./chess/elo";
import type { GameRecord, LeaderboardStats } from "./settings/types";
import type { UserStats } from "./stats/types";
import type { GameOptions, MoveRecord } from "./chess/types";

const LEADERBOARD_KEY = "chess-master-leaderboard";
const SAVE_KEY = "chess-master-save";
const MAX_HISTORY = 50;

export function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, data: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

export function loadLeaderboard(): LeaderboardStats {
  const stats = loadJSON<LeaderboardStats>(LEADERBOARD_KEY, {
    wins: 0,
    losses: 0,
    draws: 0,
    gamesPlayed: 0,
    elo: DEFAULT_ELO,
    gameHistory: [],
  });
  if (typeof stats.elo !== "number") stats.elo = DEFAULT_ELO;
  if (!Array.isArray(stats.gameHistory)) stats.gameHistory = [];
  return stats;
}

export function saveLeaderboard(stats: LeaderboardStats) {
  saveJSON(LEADERBOARD_KEY, stats);
}

/** Merge cloud stats into local storage (keeps local game history). */
export function mergeCloudStatsIntoLocal(cloud: UserStats) {
  const local = loadLeaderboard();
  saveLeaderboard({
    ...local,
    elo: cloud.elo,
    wins: cloud.wins,
    losses: cloud.losses,
    draws: cloud.draws,
    gamesPlayed: cloud.gamesPlayed,
  });
}

export function addGameRecord(record: GameRecord) {
  const stats = loadLeaderboard();
  stats.gameHistory = [record, ...stats.gameHistory].slice(0, MAX_HISTORY);
  saveLeaderboard(stats);
}

export interface SavedGame {
  history: MoveRecord[][];
  options: GameOptions;
  whiteTime: number;
  blackTime: number;
  moveCount: number;
  hintsUsed: number;
  clockStarted: boolean;
  flipped: boolean;
  savedAt: number;
}

export function saveGame(data: SavedGame) {
  saveJSON(SAVE_KEY, data);
}

export function loadSavedGame(): SavedGame | null {
  const raw = loadJSON<SavedGame | null>(SAVE_KEY, null);
  if (!raw?.options || !Array.isArray(raw.history)) return null;
  return {
    ...raw,
    options: { ...raw.options, trackElo: raw.options.trackElo ?? false },
  };
}

export function hasSavedGame(): boolean {
  const saved = loadSavedGame();
  return !!(saved && saved.history.length >= 0 && saved.moveCount >= 0);
}

export function clearSavedGame() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SAVE_KEY);
}

export function discardSavedGame() {
  clearSavedGame();
}
