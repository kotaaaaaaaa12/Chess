import { AI_DEPTH, PIECE_VALUES } from "./constants";
import { SimulationGame } from "./simulationGame";
import { getBookMove, buildMoveKey } from "./openingBook";
import type { AiDifficulty, AiResult, ChessPiece, PieceColor, HintMove } from "./types";

const MIDDLE_SQUARES = [44, 45, 54, 55];
const WIDER_MIDDLE = [43, 46, 53, 56];

const PIECE_SQUARE: Partial<Record<string, Record<number, number>>> = {
  pawn: {
    21: 0.1, 22: 0.1, 23: 0.1, 24: 0.15, 25: 0.2, 26: 0.15, 27: 0.1, 28: 0.1,
    71: -0.1, 72: -0.1, 73: -0.1, 74: -0.15, 75: -0.2, 76: -0.15, 77: -0.1, 78: -0.1,
  },
  knight: {
    33: 0.1, 36: 0.1, 43: 0.15, 46: 0.15, 53: 0.15, 56: 0.15, 63: 0.1, 66: 0.1,
  },
};

export function createAI(aiTurn: PieceColor, difficulty: AiDifficulty = "medium") {
  const simulationGame = new SimulationGame([], "white");
  const deepest = AI_DEPTH[difficulty];
  const humanTurn: PieceColor = aiTurn === "white" ? "black" : "white";
  let moveHistory: string[] = [];

  const scorePieces = (pieces: ChessPiece[]): number =>
    pieces.reduce((total, piece) => {
      let weight = piece.color === aiTurn
        ? PIECE_VALUES[piece.rank]
        : -PIECE_VALUES[piece.rank];
      if (MIDDLE_SQUARES.includes(piece.position)) weight *= 1.05;
      else if (WIDER_MIDDLE.includes(piece.position)) weight *= 1.02;
      const pst = PIECE_SQUARE[piece.rank]?.[piece.position];
      if (pst) weight += piece.color === aiTurn ? pst : -pst;
      return total + weight;
    }, 0);

  const minimax = (
    pieces: ChessPiece[],
    turn: PieceColor,
    depth: number,
    alpha: number,
    beta: number,
    enPassantSquare: number | null = null
  ): AiResult => {
    simulationGame.startNewGame(pieces, turn, enPassantSquare);

    if (!simulationGame.getPieceByName(humanTurn + "King") || simulationGame.king_dead(humanTurn)) {
      return { move: null, score: -Infinity + depth };
    }
    if (!simulationGame.getPieceByName(aiTurn + "King") || simulationGame.king_dead(aiTurn)) {
      return { move: null, score: Infinity - depth };
    }

    if (depth >= deepest) {
      return { move: null, score: scorePieces(simulationGame.pieces) };
    }

    let bestPlay: AiResult = { move: null, score: turn === aiTurn ? -Infinity : Infinity };

    for (const piece of pieces) {
      if (piece.color !== turn) continue;
      const allowedMoves = simulationGame.getPieceAllowedMoves(piece.name);

      for (const move of allowedMoves) {
        simulationGame.movePiece(piece.name, move);

        let moveScore: number;
        const childEp = simulationGame.enPassantSquare;
        const childTurn = simulationGame.turn;
        if (turn === aiTurn) {
          moveScore = minimax(simulationGame.pieces, childTurn, depth + 1, alpha, beta, childEp).score;
          if (moveScore > bestPlay.score) {
            bestPlay = { move: { pieceName: piece.name, position: move }, score: moveScore };
          }
          alpha = Math.max(alpha, moveScore);
        } else {
          moveScore = minimax(simulationGame.pieces, childTurn, depth + 1, alpha, beta, childEp).score;
          if (moveScore < bestPlay.score) {
            bestPlay = { move: { pieceName: piece.name, position: move }, score: moveScore };
          }
          beta = Math.min(beta, moveScore);
        }

        simulationGame.startNewGame(pieces, turn, enPassantSquare);
        if (beta <= alpha) break;
      }
      if (beta <= alpha) break;
    }
    return bestPlay;
  };

  const getBestMove = (
    pieces: ChessPiece[],
    moveCount = 0,
    enPassantSquare: number | null = null
  ): AiResult => {
    if (moveCount < 4) {
      const key = buildMoveKey(aiTurn, moveCount, moveHistory);
      const book = getBookMove(key, moveCount);
      if (book && pieces.find((p) => p.name === book.pieceName)) {
        return { move: book, score: 0 };
      }
    }
    return minimax(pieces, aiTurn, 0, -Infinity, Infinity, enPassantSquare);
  };

  const yieldToMain = () => new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });

  const getBestMoveAsync = async (
    pieces: ChessPiece[],
    moveCount: number,
    enPassantSquare: number | null
  ): Promise<AiResult> => {
    if (moveCount < 4) {
      const key = buildMoveKey(aiTurn, moveCount, moveHistory);
      const book = getBookMove(key, moveCount);
      if (book && pieces.find((p) => p.name === book.pieceName)) {
        return { move: book, score: 0 };
      }
    }

    let bestPlay: AiResult = { move: null, score: -Infinity };
    for (const piece of pieces) {
      if (piece.color !== aiTurn) continue;
      await yieldToMain();

      simulationGame.startNewGame(pieces, aiTurn, enPassantSquare);
      const allowedMoves = simulationGame.getPieceAllowedMoves(piece.name);

      for (const move of allowedMoves) {
        simulationGame.movePiece(piece.name, move);
        const childEp = simulationGame.enPassantSquare;
        const childTurn = simulationGame.turn;
        const moveScore = minimax(
          simulationGame.pieces,
          childTurn,
          1,
          -Infinity,
          Infinity,
          childEp
        ).score;

        if (moveScore > bestPlay.score) {
          bestPlay = { move: { pieceName: piece.name, position: move }, score: moveScore };
        }
        simulationGame.startNewGame(pieces, aiTurn, enPassantSquare);
      }
    }

    return bestPlay;
  };

  const play = (
    pieces: ChessPiece[],
    enPassantSquare: number | null,
    callback: (result: AiResult) => void
  ): void => {
    window.setTimeout(() => {
      void (async () => {
        const result = await getBestMoveAsync(pieces, moveHistory.length, enPassantSquare);
        if (result.move) {
          moveHistory.push(String(result.move.position).slice(-1));
        }
        callback(result);
      })();
    }, difficulty === "hard" ? 300 : 150);
  };

  const reset = () => { moveHistory = []; };

  return { play, getBestMove, reset };
}

export function getHint(
  pieces: ChessPiece[],
  turn: PieceColor,
  difficulty: AiDifficulty = "medium",
  enPassantSquare: number | null = null
): HintMove | null {
  const ai = createAI(turn, difficulty);
  const result = ai.getBestMove(pieces, 0, enPassantSquare);
  if (!result.move) return null;
  const piece = pieces.find((p) => p.name === result.move!.pieceName);
  if (!piece) return null;
  const sym = piece.rank === "pawn" ? "" : piece.rank[0].toUpperCase();
  const file = "abcdefgh"[(result.move!.position % 10) - 1];
  const rank = Math.floor(result.move!.position / 10);
  return {
    pieceName: result.move!.pieceName,
    position: result.move!.position,
    from: piece.position,
    notation: `${sym}${file}${rank}`,
  };
}
