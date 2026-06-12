import { CASTLE_HOME } from "./constants";
import type { ChessPiece } from "./types";

export interface CastleRookAnimation {
  pieceName: string;
  from: number;
  to: number;
}

/** Rook slide paired with a king castling move (before the move is applied). */
export function getCastleRookAnimation(
  king: ChessPiece,
  kingDestination: number
): CastleRookAnimation | null {
  if (king.rank !== "king") return null;

  const delta = kingDestination - king.position;
  if (Math.abs(delta) !== 2) return null;

  const home = CASTLE_HOME[king.color];
  if (king.position !== home.king) return null;

  if (delta === 2) {
    return {
      pieceName: `${king.color}Rook2`,
      from: home.rook2,
      to: home.rook2 - 2,
    };
  }

  return {
    pieceName: `${king.color}Rook1`,
    from: home.rook1,
    to: home.rook1 + 3,
  };
}
