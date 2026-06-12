import type { ChessPiece } from "./types";

export function isInsufficientMaterial(pieces: ChessPiece[]): boolean {
  if (pieces.length > 4) return false;

  const white = pieces.filter((p) => p.color === "white");
  const black = pieces.filter((p) => p.color === "black");

  const countSide = (side: ChessPiece[]) => {
    const minors = side.filter((p) => p.rank === "bishop" || p.rank === "knight");
    return { hasPawn: side.some((p) => p.rank === "pawn"), hasRook: side.some((p) => p.rank === "rook"), hasQueen: side.some((p) => p.rank === "queen"), minors };
  };

  const w = countSide(white);
  const b = countSide(black);

  if (w.hasPawn || w.hasRook || w.hasQueen || b.hasPawn || b.hasRook || b.hasQueen) return false;
  if (w.minors.length === 0 && b.minors.length === 0) return true;
  if (w.minors.length <= 1 && b.minors.length === 0) return true;
  if (b.minors.length <= 1 && w.minors.length === 0) return true;
  return false;
}

export type DrawReason =
  | "stalemate"
  | "insufficient-material"
  | "fifty-move"
  | "threefold-repetition"
  | "agreement";
