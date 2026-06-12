import { INITIAL_PIECES, clonePieces, positionToNotation, FILES } from "./constants";
import { SimulationGame } from "./simulationGame";
import type { MoveRecord, PieceRank } from "./types";

const PIECE_SYM: Record<string, string> = {
  knight: "N", bishop: "B", rook: "R", queen: "Q", king: "K",
};

function fileOf(pos: number): string {
  return FILES[pos % 10 - 1];
}

function getMainMove(step: MoveRecord[]): MoveRecord | undefined {
  return step.find(
    (s) => s.from !== 0 && s.to !== 0 && !(s.castling && s.piece.rank === "rook")
  );
}

function getPromotionRank(step: MoveRecord[]): PieceRank | undefined {
  const promo = step.find(
    (s) => s.from === 0 && s.to !== 0 && s.piece.rank !== "pawn"
  );
  return promo?.piece.rank;
}

function applyStep(sim: SimulationGame, step: MoveRecord[]): void {
  const main = getMainMove(step);
  if (!main) return;
  sim.movePiece(main.piece.name, main.to, getPromotionRank(step));
}

function replayToStep(history: MoveRecord[][], stepIndex: number): SimulationGame {
  const sim = new SimulationGame(clonePieces(INITIAL_PIECES), "white");
  for (let i = 0; i < stepIndex; i++) applyStep(sim, history[i]);
  return sim;
}

function disambiguate(
  sim: SimulationGame,
  move: MoveRecord
): string {
  const { piece, to } = move;
  if (piece.rank === "pawn" || piece.rank === "king") return "";

  const samePieces = sim.getPiecesByColor(piece.color).filter(
    (p) => p.rank === piece.rank && p.name !== piece.name
  );

  const ambiguous = samePieces.filter((p) => {
    sim.setClickedPiece(p);
    const moves = sim.getPieceAllowedMoves(p.name);
    sim.setClickedPiece(null);
    return moves.includes(to);
  });

  if (ambiguous.length === 0) return "";

  const needFile = ambiguous.some((p) => fileOf(p.position) === fileOf(piece.position));
  const needRank = ambiguous.some(
    (p) => Math.floor(p.position / 10) === Math.floor(piece.position / 10)
  );

  let dis = "";
  if (needFile) dis += fileOf(piece.position);
  if (needRank) dis += Math.floor(piece.position / 10);
  return dis;
}

function suffix(sim: SimulationGame): string {
  if (sim.king_dead(sim.turn)) return "#";
  if (sim.king_checked(sim.turn)) return "+";
  return "";
}

export function moveToAlgebraic(history: MoveRecord[][], stepIndex: number): string {
  const step = history[stepIndex];
  const move = getMainMove(step);
  if (!move) return "?";

  const before = replayToStep(history, stepIndex);
  const captured = before.getPieceByPos(move.to);
  const dest = positionToNotation(move.to);
  const promo = getPromotionRank(step);

  if (move.castling && move.piece.rank === "king") {
    const san = move.to > move.from ? "O-O" : "O-O-O";
    const after = replayToStep(history, stepIndex + 1);
    return san + suffix(after);
  }

  if (move.piece.rank === "pawn") {
    let san = captured ? `${fileOf(move.from)}x${dest}` : dest;
    if (promo) san += `=${PIECE_SYM[promo] ?? promo[0].toUpperCase()}`;
    const after = replayToStep(history, stepIndex + 1);
    return san + suffix(after);
  }

  const sym = PIECE_SYM[move.piece.rank] ?? "";
  const dis = disambiguate(before, move);
  const cap = captured ? "x" : "";
  const san = `${sym}${dis}${cap}${dest}`;
  const after = replayToStep(history, stepIndex + 1);
  return san + suffix(after);
}

export interface AlgebraicMoveEntry {
  moveNumber: number;
  white?: string;
  black?: string;
  whitePly?: number;
  blackPly?: number;
}

export function buildAlgebraicMoveLog(history: MoveRecord[][]): AlgebraicMoveEntry[] {
  const log: AlgebraicMoveEntry[] = [];

  history.forEach((_, stepIndex) => {
    const move = getMainMove(history[stepIndex]);
    if (!move) return;

    const notation = moveToAlgebraic(history, stepIndex);
    const moveNumber = Math.floor(stepIndex / 2) + 1;

    if (move.piece.color === "white") {
      log.push({ moveNumber, white: notation, whitePly: stepIndex });
    } else {
      const last = log[log.length - 1];
      if (last && !last.black) {
        last.black = notation;
        last.blackPly = stepIndex;
      } else {
        log.push({ moveNumber, black: notation, blackPly: stepIndex });
      }
    }
  });

  return log;
}
