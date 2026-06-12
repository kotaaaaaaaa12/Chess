import type { ChessPiece } from "./types";

export function changePosition(
  piece: ChessPiece,
  position: number,
  castle = false
): void {
  piece.position = position;
  if (piece.rank === "king") piece.ableToCastle = false;
  if (piece.rank === "rook") piece.ableToCastle = false;
}

function getMovesTop(piece: ChessPiece): number[] {
  const moves: number[] = [];
  for (let move = piece.position + 10; move <= 88; move += 10) moves.push(move);
  return moves;
}

function getMovesBottom(piece: ChessPiece): number[] {
  const moves: number[] = [];
  for (let move = piece.position - 10; move >= 11; move -= 10) moves.push(move);
  return moves;
}

function getMovesRight(piece: ChessPiece): number[] {
  const num = String(piece.position);
  const moves: number[] = [];
  for (let move = piece.position + 1; move <= parseInt(num[0] + "8"); move++)
    moves.push(move);
  return moves;
}

function getMovesLeft(piece: ChessPiece): number[] {
  const num = String(piece.position);
  const moves: number[] = [];
  for (let move = piece.position - 1; move >= parseInt(num[0] + "1"); move--)
    moves.push(move);
  return moves;
}

function getMovesTopRight(piece: ChessPiece): number[] {
  const moves: number[] = [];
  for (let move = piece.position + 11; move <= 88; move += 11) {
    const firstDigit = String(move)[1];
    if (firstDigit > "8" || firstDigit < "1") break;
    moves.push(move);
  }
  return moves;
}

function getMovesTopLeft(piece: ChessPiece): number[] {
  const moves: number[] = [];
  for (let move = piece.position + 9; move <= 88; move += 9) {
    const firstDigit = String(move)[1];
    if (firstDigit > "8" || firstDigit < "1") break;
    moves.push(move);
  }
  return moves;
}

function getMovesBottomRight(piece: ChessPiece): number[] {
  const moves: number[] = [];
  for (let move = piece.position - 9; move >= 11; move -= 9) {
    const firstDigit = String(move)[1];
    if (firstDigit > "8" || firstDigit < "1") break;
    moves.push(move);
  }
  return moves;
}

function getMovesBottomLeft(piece: ChessPiece): number[] {
  const moves: number[] = [];
  for (let move = piece.position - 11; move >= 11; move -= 11) {
    const firstDigit = String(move)[1];
    if (firstDigit > "8" || firstDigit < "1") break;
    moves.push(move);
  }
  return moves;
}

function getPawnAllowedMoves(pawn: ChessPiece): number[][] {
  const position = pawn.position;
  const mathSign = pawn.color === "white" ? 1 : -1;
  const allowedMoves = [position + mathSign * 10];
  if ((position > 20 && position < 29) || (position > 70 && position < 79)) {
    allowedMoves.push(position + mathSign * 20);
  }
  const attackMoves = [position + mathSign * 9, position + mathSign * 11];
  return [attackMoves, allowedMoves];
}

function getKnightAllowedMoves(knight: ChessPiece): number[][] {
  const p = knight.position;
  return [
    [p + 21], [p - 21], [p + 19], [p - 19],
    [p + 12], [p - 12], [p + 8], [p - 8],
  ];
}

function getKingAllowedMoves(king: ChessPiece): number[][] {
  const p = king.position;
  return [
    [p + 1], [p - 1], [p + 10], [p - 10],
    [p + 11], [p - 11], [p + 9], [p - 9],
  ];
}

function getBishopAllowedMoves(bishop: ChessPiece): number[][] {
  return [
    getMovesTopRight(bishop), getMovesTopLeft(bishop),
    getMovesBottomRight(bishop), getMovesBottomLeft(bishop),
  ];
}

function getRookAllowedMoves(rook: ChessPiece): number[][] {
  return [
    getMovesTop(rook), getMovesBottom(rook),
    getMovesRight(rook), getMovesLeft(rook),
  ];
}

function getQueenAllowedMoves(queen: ChessPiece): number[][] {
  return [
    getMovesTop(queen), getMovesTopRight(queen), getMovesTopLeft(queen),
    getMovesBottom(queen), getMovesBottomRight(queen), getMovesBottomLeft(queen),
    getMovesRight(queen), getMovesLeft(queen),
  ];
}

export function getAllowedMoves(piece: ChessPiece): number[][] {
  switch (piece.rank) {
    case "pawn": return getPawnAllowedMoves(piece);
    case "knight": return getKnightAllowedMoves(piece);
    case "king": return getKingAllowedMoves(piece);
    case "bishop": return getBishopAllowedMoves(piece);
    case "rook": return getRookAllowedMoves(piece);
    case "queen": return getQueenAllowedMoves(piece);
    default: throw new Error(`Unknown rank: ${piece.rank}`);
  }
}
