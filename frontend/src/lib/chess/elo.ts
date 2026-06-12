import type { AiDifficulty, PlayMode } from "./types";

export const DEFAULT_ELO = 1200;
const ELO_K = 32;

const OPPONENT_ELO: Record<"minimax" | "stockfish", Record<AiDifficulty, number>> = {
  minimax: { easy: 800, medium: 1100, hard: 1450 },
  stockfish: { easy: 1000, medium: 1550, hard: 2200 },
};

function expectedScore(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

export function getOpponentElo(mode: PlayMode, difficulty: AiDifficulty): number {
  if (mode === "human" || mode === "online") return DEFAULT_ELO;
  return OPPONENT_ELO[mode][difficulty];
}

export function calculateEloChange(
  playerElo: number,
  opponentElo: number,
  result: "win" | "loss" | "draw"
): number {
  const actual = result === "win" ? 1 : result === "draw" ? 0.5 : 0;
  return Math.round(ELO_K * (actual - expectedScore(playerElo, opponentElo)));
}

export function applyEloChange(
  playerElo: number,
  opponentElo: number,
  result: "win" | "loss" | "draw"
): { newElo: number; change: number } {
  const change = calculateEloChange(playerElo, opponentElo, result);
  return { newElo: Math.max(100, playerElo + change), change };
}
