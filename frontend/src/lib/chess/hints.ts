import { getHint } from "./ai";
import { positionToNotation, FILES } from "./constants";
import { fenSquareToPos, parseEnPassantFromFen } from "./fen";
import { requestHintMove } from "./stockfishWorker";
import type { ChessPiece, GameOptions, HintMove, PieceColor, PieceRank } from "./types";

const PIECE_SYM: Record<PieceRank, string> = {
  pawn: "",
  knight: "N",
  bishop: "B",
  rook: "R",
  queen: "Q",
  king: "K",
};

function buildNotation(piece: ChessPiece, to: number): string {
  return `${PIECE_SYM[piece.rank]}${positionToNotation(to)}`;
}

function uciToHint(uci: string, pieces: ChessPiece[], color: PieceColor): HintMove | null {
  const from = fenSquareToPos(uci.slice(0, 2));
  const to = fenSquareToPos(uci.slice(2, 4));
  const piece = pieces.find((p) => p.position === from && p.color === color);
  if (!piece) return null;
  return {
    pieceName: piece.name,
    position: to,
    from,
    notation: buildNotation(piece, to),
  };
}

export async function fetchHint(
  options: GameOptions,
  pieces: ChessPiece[],
  turn: PieceColor,
  fen: string
): Promise<HintMove | null> {
  if (options.playAgainst === "stockfish") {
    try {
      const uci = await requestHintMove(fen);
      if (!uci) return null;
      return uciToHint(uci, pieces, turn);
    } catch {
      return null;
    }
  }

  const hint = getHint(pieces, turn, options.aiDifficulty, parseEnPassantFromFen(fen));
  if (!hint) return null;

  const piece = pieces.find((p) => p.name === hint.pieceName);
  if (piece) {
    return { ...hint, notation: buildNotation(piece, hint.position) };
  }

  return {
    ...hint,
    notation: `${FILES[hint.position % 10 - 1]}${Math.floor(hint.position / 10)}`,
  };
}
