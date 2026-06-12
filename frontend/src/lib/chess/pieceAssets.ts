import type { ChessPiece } from "./types";
import type { PieceSet } from "@/lib/settings/types";

const RANK_CHAR: Record<string, string> = {
  pawn: "P", knight: "N", bishop: "B", rook: "R", queen: "Q", king: "K",
};

export function getPieceSrc(piece: ChessPiece, pieceSet: PieceSet): string {
  if (pieceSet === "neo") {
    const color = piece.color === "white" ? "w" : "b";
    return `/pieces/neo/${color}${RANK_CHAR[piece.rank]}.png`;
  }
  return `/img/${piece.color}-${piece.rank}.svg`;
}

export function isNeoPieceSet(pieceSet: PieceSet): boolean {
  return pieceSet === "neo";
}
