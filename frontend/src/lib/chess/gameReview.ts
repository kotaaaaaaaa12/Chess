import { buildAlgebraicMoveLog } from "./algebraic";
import { INITIAL_PIECES, clonePieces } from "./constants";
import { exportFEN, fenSquareToPos, posToFenSquare } from "./fen";
import type { PositionEval } from "./evalUtils";
import { getMainMove, getPromotionRank } from "./replay";
import { requestEval, requestReviewAnalysis } from "./stockfishWorker";
import { SimulationGame } from "./simulationGame";
import type { MoveRecord, PieceColor, PieceRank } from "./types";

export type MoveClassification =
  | "brilliant"
  | "great"
  | "best"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export interface ReviewedMove {
  ply: number;
  moveNumber: number;
  color: PieceColor;
  san: string;
  from: number;
  to: number;
  classification: MoveClassification;
  cpLoss: number;
  bestSan?: string;
  isCapture: boolean;
}

const PROMO: Record<PieceRank, string> = {
  queen: "q", rook: "r", bishop: "b", knight: "n", pawn: "", king: "",
};

function moveToUci(move: MoveRecord, promo?: PieceRank): string {
  const p = promo ? PROMO[promo] : "";
  return posToFenSquare(move.from) + posToFenSquare(move.to) + p;
}

function scoreFor(color: PieceColor, eval_: PositionEval): number {
  if (eval_.mate !== null) {
    if (color === "white") return eval_.mate > 0 ? 100000 - eval_.mate : -100000 - eval_.mate;
    return eval_.mate < 0 ? 100000 + eval_.mate : -100000 + eval_.mate;
  }
  return color === "white" ? eval_.cp : -eval_.cp;
}

function classify(cpLoss: number, isBest: boolean, isCapture: boolean): MoveClassification {
  if (isBest && cpLoss <= 5 && isCapture) return "brilliant";
  if (isBest && cpLoss <= 5) return "best";
  if (cpLoss <= 15) return "great";
  if (cpLoss <= 30) return "good";
  if (cpLoss <= 60) return "inaccuracy";
  if (cpLoss <= 120) return "mistake";
  return "blunder";
}

function cloneSim(from: SimulationGame): SimulationGame {
  const sim = new SimulationGame(clonePieces(from.pieces), from.turn);
  sim.enPassantSquare = from.enPassantSquare;
  sim.halfMoveClock = from.halfMoveClock;
  return sim;
}

function applyUci(sim: SimulationGame, uci: string): boolean {
  const from = fenSquareToPos(uci.slice(0, 2));
  const to = fenSquareToPos(uci.slice(2, 4));
  const promoChar = uci[4];
  const promoMap: Record<string, PieceRank> = { q: "queen", r: "rook", b: "bishop", n: "knight" };
  const piece = sim.pieces.find((p) => p.position === from);
  if (!piece) return false;
  return sim.movePiece(piece.name, to, promoMap[promoChar]);
}

export async function analyzeGame(
  history: MoveRecord[][],
  humanColor: PieceColor,
  onProgress?: (done: number, total: number) => void
): Promise<ReviewedMove[]> {
  const log = buildAlgebraicMoveLog(history);
  const humanPlies: { ply: number; moveNumber: number; color: PieceColor; san: string }[] = [];

  log.forEach((entry, i) => {
    const plyWhite = i * 2 + 1;
    const plyBlack = i * 2 + 2;
    if (entry.white && humanColor === "white") {
      humanPlies.push({ ply: plyWhite, moveNumber: entry.moveNumber, color: "white", san: entry.white });
    }
    if (entry.black && humanColor === "black") {
      humanPlies.push({ ply: plyBlack, moveNumber: entry.moveNumber, color: "black", san: entry.black });
    }
  });

  const results: ReviewedMove[] = [];
  let done = 0;

  for (const hm of humanPlies) {
    const stepIndex = hm.ply - 1;
    const step = history[stepIndex];
    const main = step ? getMainMove(step) : undefined;
    if (!main) continue;

    const simBefore = new SimulationGame(clonePieces(INITIAL_PIECES), "white");
    for (let i = 0; i < stepIndex; i++) {
      const m = getMainMove(history[i]);
      if (m) simBefore.movePiece(m.piece.name, m.to, getPromotionRank(history[i]));
    }

    const fenBefore = exportFEN(
      simBefore.pieces, simBefore.turn, simBefore.enPassantSquare, simBefore.halfMoveClock
    );
    const playedUci = moveToUci(main, getPromotionRank(step));
    const victim = simBefore.getPieceByPos(main.to);
    const isCapture = !!victim || (
      main.piece.rank === "pawn" && simBefore.enPassantSquare === main.to
    );

    const { bestUci } = await requestReviewAnalysis(fenBefore);

    const simPlayed = cloneSim(simBefore);
    simPlayed.movePiece(main.piece.name, main.to, getPromotionRank(step));
    const fenAfterPlayed = exportFEN(
      simPlayed.pieces, simPlayed.turn, simPlayed.enPassantSquare, simPlayed.halfMoveClock
    );
    const evalAfterPlayed = await requestEval(fenAfterPlayed);

    let evalAfterBest = evalAfterPlayed;
    if (bestUci && bestUci !== playedUci) {
      const simBest = cloneSim(simBefore);
      if (applyUci(simBest, bestUci)) {
        const fenAfterBest = exportFEN(
          simBest.pieces, simBest.turn, simBest.enPassantSquare, simBest.halfMoveClock
        );
        evalAfterBest = await requestEval(fenAfterBest);
      }
    }

    const cpLoss = Math.max(
      0,
      Math.round((scoreFor(humanColor, evalAfterBest) - scoreFor(humanColor, evalAfterPlayed)) / 1)
    );
    const isBest = bestUci === playedUci || cpLoss <= 5;

    results.push({
      ply: hm.ply,
      moveNumber: hm.moveNumber,
      color: hm.color,
      san: hm.san,
      from: main.from,
      to: main.to,
      classification: classify(cpLoss, isBest, isCapture),
      cpLoss,
      bestSan: bestUci && !isBest ? bestUci : undefined,
      isCapture,
    });

    done++;
    onProgress?.(done, humanPlies.length);
  }

  return results;
}

export const CLASSIFICATION_META: Record<
  MoveClassification,
  { label: string; color: string; emoji: string }
> = {
  brilliant: { label: "Brilliant", color: "#22d3ee", emoji: "!!" },
  great: { label: "Great", color: "#86c04e", emoji: "!" },
  best: { label: "Best", color: "#81b64c", emoji: "✓" },
  good: { label: "Good", color: "#a8c97a", emoji: "○" },
  inaccuracy: { label: "Inaccuracy", color: "#eab308", emoji: "?!" },
  mistake: { label: "Mistake", color: "#f97316", emoji: "?" },
  blunder: { label: "Blunder", color: "#ef4444", emoji: "??" },
};
