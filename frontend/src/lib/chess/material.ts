import { PIECE_VALUES } from "./constants";
import type { CapturedPiece } from "./useChessGame";
import type { PieceColor, PieceRank } from "./types";

const RANK_SORT: Record<PieceRank, number> = {
  queen: 5,
  rook: 4,
  bishop: 3,
  knight: 2,
  pawn: 1,
  king: 0,
};

export function pieceValue(rank: PieceRank): number {
  return PIECE_VALUES[rank] ?? 0;
}

export function sortCaptured(captured: CapturedPiece[]): CapturedPiece[] {
  return [...captured].sort(
    (a, b) => RANK_SORT[b.piece.rank] - RANK_SORT[a.piece.rank],
  );
}

export function materialTotals(captured: CapturedPiece[]) {
  let white = 0;
  let black = 0;
  for (const { piece, color } of captured) {
    const v = pieceValue(piece.rank);
    if (color === "black") white += v;
    else black += v;
  }
  return { white, black };
}

/** Positive when this color is ahead in captured material. */
export function materialAdvantage(color: PieceColor, captured: CapturedPiece[]): number {
  const { white, black } = materialTotals(captured);
  const net = color === "white" ? white - black : black - white;
  return net > 0 ? net : 0;
}
