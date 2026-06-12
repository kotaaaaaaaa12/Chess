import type { ChessPiece, PieceColor } from "./types";

const FILES = "abcdefgh";

export function posToFenSquare(pos: number): string {
  const rank = Math.floor(pos / 10);
  const file = pos % 10;
  return `${FILES[file - 1]}${rank}`;
}

export function fenSquareToPos(square: string): number {
  const file = FILES.indexOf(square[0]) + 1;
  const rank = parseInt(square[1], 10);
  return rank * 10 + file;
}

export function exportFEN(
  pieces: ChessPiece[],
  turn: PieceColor,
  enPassantSquare: number | null = null,
  halfMoveClock = 0,
  fullMoveNumber = 1
): string {
  const board: (string | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));

  pieces.forEach((p) => {
    const rank = Math.floor(p.position / 10);
    const file = p.position % 10;
    const row = 8 - rank;
    const col = file - 1;
    const sym = p.rank === "knight" ? "n" : p.rank[0];
    board[row][col] = p.color === "white" ? sym.toUpperCase() : sym;
  });

  const placement = board
    .map((row) => {
      let s = "";
      let empty = 0;
      row.forEach((cell) => {
        if (!cell) empty++;
        else {
          if (empty) { s += empty; empty = 0; }
          s += cell;
        }
      });
      if (empty) s += empty;
      return s;
    })
    .join("/");

  const wk = pieces.find((p) => p.name === "whiteKing");
  const wqRook = pieces.find((p) => p.name === "whiteRook1");
  const wkRook = pieces.find((p) => p.name === "whiteRook2");
  const bk = pieces.find((p) => p.name === "blackKing");
  const bqRook = pieces.find((p) => p.name === "blackRook1");
  const bkRook = pieces.find((p) => p.name === "blackRook2");

  const castling = [
    wk?.ableToCastle && wkRook?.ableToCastle ? "K" : "",
    wk?.ableToCastle && wqRook?.ableToCastle ? "Q" : "",
    bk?.ableToCastle && bkRook?.ableToCastle ? "k" : "",
    bk?.ableToCastle && bqRook?.ableToCastle ? "q" : "",
  ].join("") || "-";

  const ep = enPassantSquare ? posToFenSquare(enPassantSquare) : "-";

  return `${placement} ${turn === "white" ? "w" : "b"} ${castling} ${ep} ${halfMoveClock} ${fullMoveNumber}`;
}

/** Position key for threefold repetition (pieces, side, castling, en passant). */
export function getPositionKey(
  pieces: ChessPiece[],
  turn: PieceColor,
  enPassantSquare: number | null
): string {
  return exportFEN(pieces, turn, enPassantSquare, 0, 1)
    .split(" ")
    .slice(0, 4)
    .join(" ");
}

export function parseEnPassantFromFen(fen: string): number | null {
  const ep = fen.split(" ")[3];
  if (!ep || ep === "-") return null;
  return fenSquareToPos(ep);
}

export function copyFEN(fen: string) {
  navigator.clipboard?.writeText(fen);
}
