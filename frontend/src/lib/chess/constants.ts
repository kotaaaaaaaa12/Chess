import type { ChessPiece, PieceColor } from "./types";

export const INITIAL_PIECES: ChessPiece[] = [
  { rank: "knight", position: 12, color: "white", name: "whiteKnight1" },
  { rank: "knight", position: 17, color: "white", name: "whiteKnight2" },
  { rank: "queen", position: 14, color: "white", name: "whiteQueen" },
  { rank: "bishop", position: 13, color: "white", name: "whiteBishop1" },
  { rank: "bishop", position: 16, color: "white", name: "whiteBishop2" },
  { rank: "pawn", position: 24, color: "white", name: "whitePawn4" },
  { rank: "pawn", position: 25, color: "white", name: "whitePawn5" },
  { rank: "pawn", position: 26, color: "white", name: "whitePawn6" },
  { rank: "pawn", position: 21, color: "white", name: "whitePawn1" },
  { rank: "pawn", position: 22, color: "white", name: "whitePawn2" },
  { rank: "pawn", position: 23, color: "white", name: "whitePawn3" },
  { rank: "pawn", position: 27, color: "white", name: "whitePawn7" },
  { rank: "pawn", position: 28, color: "white", name: "whitePawn8" },
  { rank: "rook", position: 11, color: "white", name: "whiteRook1", ableToCastle: true },
  { rank: "rook", position: 18, color: "white", name: "whiteRook2", ableToCastle: true },
  { rank: "king", position: 15, color: "white", name: "whiteKing", ableToCastle: true },

  { rank: "knight", position: 82, color: "black", name: "blackKnight1" },
  { rank: "knight", position: 87, color: "black", name: "blackKnight2" },
  { rank: "queen", position: 84, color: "black", name: "blackQueen" },
  { rank: "bishop", position: 83, color: "black", name: "blackBishop1" },
  { rank: "bishop", position: 86, color: "black", name: "blackBishop2" },
  { rank: "pawn", position: 74, color: "black", name: "blackPawn4" },
  { rank: "pawn", position: 75, color: "black", name: "blackPawn5" },
  { rank: "pawn", position: 76, color: "black", name: "blackPawn6" },
  { rank: "pawn", position: 71, color: "black", name: "blackPawn1" },
  { rank: "pawn", position: 72, color: "black", name: "blackPawn2" },
  { rank: "pawn", position: 73, color: "black", name: "blackPawn3" },
  { rank: "pawn", position: 77, color: "black", name: "blackPawn7" },
  { rank: "pawn", position: 78, color: "black", name: "blackPawn8" },
  { rank: "rook", position: 81, color: "black", name: "blackRook1", ableToCastle: true },
  { rank: "rook", position: 88, color: "black", name: "blackRook2", ableToCastle: true },
  { rank: "king", position: 85, color: "black", name: "blackKing", ableToCastle: true },
];

export const PIECE_VALUES: Record<string, number> = {
  pawn: 1,
  king: 2,
  bishop: 3,
  knight: 3,
  rook: 5,
  queen: 9,
};

export const AI_DEPTH: Record<string, number> = {
  easy: 2,
  medium: 3,
  hard: 4,
};

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

export function positionToNotation(pos: number): string {
  const rank = Math.floor(pos / 10);
  const file = pos % 10;
  return `${FILES[file - 1]}${rank}`;
}

export function clonePieces(pieces: ChessPiece[]): ChessPiece[] {
  return pieces.map((p) => ({ ...p }));
}

/** Starting squares for castling (king + rooks). */
export const CASTLE_HOME: Record<PieceColor, { king: number; rook1: number; rook2: number }> = {
  white: { king: 15, rook1: 11, rook2: 18 },
  black: { king: 85, rook1: 81, rook2: 88 },
};

export const CASTLE_KING_TO: Record<PieceColor, { queenside: number; kingside: number }> = {
  white: { queenside: 13, kingside: 17 },
  black: { queenside: 83, kingside: 87 },
};
