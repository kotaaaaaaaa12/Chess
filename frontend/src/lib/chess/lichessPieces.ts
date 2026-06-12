import type { PieceColor } from "./types";

/** Lichess cburnett piece set (same URLs as lichess.org). */
export const LICHESS_PIECE_BASE = "https://lichess1.org/assets/piece/cburnett";

const PIECE_LETTERS = new Set(["K", "Q", "R", "B", "N"]);

export function lichessPieceUrl(color: PieceColor, letter: string): string {
  const prefix = color === "white" ? "w" : "b";
  return `${LICHESS_PIECE_BASE}/${prefix}${letter}.svg`;
}

export function isPieceLetter(ch: string): boolean {
  return PIECE_LETTERS.has(ch);
}

export function lichessPawnUrl(color: PieceColor): string {
  return lichessPieceUrl(color, "P");
}
