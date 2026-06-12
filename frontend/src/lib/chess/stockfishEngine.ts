import { fenSquareToPos } from "./fen";
import {
  disposeStockfish,
  requestBestMove,
  resetStockfish,
} from "./stockfishWorker";
import type { AiDifficulty, AiResult, ChessPiece, PieceColor, PieceRank } from "./types";

const PROMO_MAP: Record<string, PieceRank> = {
  q: "queen",
  r: "rook",
  b: "bishop",
  n: "knight",
};

function uciToAiMove(
  uci: string,
  pieces: ChessPiece[],
  aiColor: PieceColor
): AiResult["move"] & { promotion?: PieceRank } | null {
  const from = fenSquareToPos(uci.slice(0, 2));
  const to = fenSquareToPos(uci.slice(2, 4));
  const promo = uci[4] ? PROMO_MAP[uci[4]] : undefined;

  const piece = pieces.find((p) => p.position === from && p.color === aiColor);
  if (!piece) return null;

  return { pieceName: piece.name, position: to, promotion: promo };
}

export function createStockfishEngine(aiTurn: PieceColor, difficulty: AiDifficulty = "medium") {
  return {
    play(
      pieces: ChessPiece[],
      fen: string,
      callback: (result: AiResult & { promotion?: PieceRank }) => void
    ): void {
      requestBestMove(fen, difficulty)
        .then((uci) => {
          if (!uci) {
            callback({ move: null, score: 0 });
            return;
          }
          const move = uciToAiMove(uci, pieces, aiTurn);
          callback({
            move: move ? { pieceName: move.pieceName, position: move.position } : null,
            score: 0,
            promotion: move?.promotion,
          });
        })
        .catch(() => callback({ move: null, score: 0 }));
    },
    reset(): void {
      resetStockfish();
    },
    dispose(): void {
      disposeStockfish();
    },
  };
}

export { requestEval } from "./stockfishWorker";
