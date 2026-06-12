import type { AiMove } from "./types";

/** Simple opening book — first few moves for AI */
const BOOK: Record<string, AiMove[]> = {
  // White's first move options
  "w0": [
    { pieceName: "whitePawn5", position: 35 }, // e4
    { pieceName: "whitePawn4", position: 34 }, // d4
    { pieceName: "whiteKnight2", position: 33 }, // Nf3
  ],
  // After 1.e4 — Black responds
  "b1e4": [
    { pieceName: "blackPawn5", position: 75 }, // e5
    { pieceName: "blackPawn4", position: 74 }, // d5
    { pieceName: "blackKnight1", position: 73 }, // Nc6
  ],
  // After 1.e4 e5 — White second move
  "w2e4e5": [
    { pieceName: "whiteKnight2", position: 33 }, // Nf3
    { pieceName: "whiteBishop2", position: 36 }, // Bc4
    { pieceName: "whitePawn6", position: 36 }, // f4
  ],
};

export function getBookMove(moveKey: string, moveIndex: number): AiMove | null {
  const options = BOOK[moveKey];
  if (!options) return null;
  return options[moveIndex % options.length];
}

export function buildMoveKey(
  color: "white" | "black",
  moveCount: number,
  history: string[]
): string {
  const prefix = color === "white" ? "w" : "b";
  return prefix + moveCount + history.join("");
}
