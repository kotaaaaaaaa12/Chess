import { createAI } from "./ai";
import { parseEnPassantFromFen } from "./fen";
import { createStockfishEngine } from "./stockfishEngine";
import type { AiDifficulty, AiResult, ChessPiece, PieceColor, PieceRank, PlayMode } from "./types";

export interface EngineMoveResult extends AiResult {
  promotion?: PieceRank;
}

export interface ChessEngine {
  play(
    pieces: ChessPiece[],
    fen: string | null,
    callback: (result: EngineMoveResult) => void
  ): void;
  reset(): void;
  dispose?(): void;
}

export function createChessEngine(
  mode: PlayMode,
  aiColor: PieceColor,
  difficulty: AiDifficulty
): ChessEngine | null {
  if (mode === "human" || mode === "online") return null;

  if (mode === "stockfish") {
    const sf = createStockfishEngine(aiColor, difficulty);
    return {
      play(pieces, fen, callback) {
        if (!fen) {
          callback({ move: null, score: 0 });
          return;
        }
        sf.play(pieces, fen, callback);
      },
      reset: () => sf.reset(),
      dispose: () => sf.dispose(),
    };
  }

  const minimax = createAI(aiColor, difficulty);
  return {
    play(pieces, fen, callback) {
      const ep = fen ? parseEnPassantFromFen(fen) : null;
      minimax.play(pieces, ep, callback);
    },
    reset: () => minimax.reset(),
  };
}
