import { INITIAL_PIECES, clonePieces } from "./constants";
import type { SimulationGame } from "./simulationGame";
import type { ChessPiece, MoveRecord, PieceColor } from "./types";

function createSimulation(turn: PieceColor = "white"): SimulationGame {
  // Lazy load breaks circular dependency: game → replay → simulationGame → game
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SimulationGame: Sim } = require("./simulationGame") as {
    SimulationGame: new (
      pieces: ReturnType<typeof clonePieces>,
      turn: PieceColor,
      enPassant?: number | null
    ) => SimulationGame;
  };
  return new Sim(clonePieces(INITIAL_PIECES), turn);
}

export interface CapturedSnapshot {
  piece: ChessPiece;
  color: PieceColor;
}

export function getMainMove(step: MoveRecord[]): MoveRecord | undefined {
  return step.find(
    (s) => s.from !== 0 && s.to !== 0 && !(s.castling && s.piece.rank === "rook")
  );
}

export function getPromotionRank(step: MoveRecord[]) {
  const promo = step.find(
    (s) => s.from === 0 && s.to !== 0 && s.piece.rank !== "pawn"
  );
  return promo?.piece.rank;
}

export interface ReplaySnapshot {
  pieces: ChessPiece[];
  turn: PieceColor;
  lastMove: { from: number; to: number } | null;
  captured: CapturedSnapshot[];
  inCheck: PieceColor | null;
}

export function detectInCheck(sim: SimulationGame): PieceColor | null {
  return sim.king_checked(sim.turn) ? sim.turn : null;
}

export function replayToPly(history: MoveRecord[][], ply: number): ReplaySnapshot {
  const sim = createSimulation("white");
  const captured: CapturedSnapshot[] = [];
  let lastMove: { from: number; to: number } | null = null;

  for (let i = 0; i < ply && i < history.length; i++) {
    const step = history[i];
    const main = getMainMove(step);
    if (!main) continue;

    const isEnPassant =
      main.piece.rank === "pawn" && sim.enPassantSquare === main.to;
    if (isEnPassant) {
      const victimPos = main.to + (main.piece.color === "white" ? -10 : 10);
      const victim = sim.getPieceByPos(victimPos);
      if (victim) captured.push({ piece: { ...victim }, color: victim.color });
    } else {
      const victim = sim.getPieceByPos(main.to);
      if (victim) captured.push({ piece: { ...victim }, color: victim.color });
    }

    sim.movePiece(main.piece.name, main.to, getPromotionRank(step));
    lastMove = { from: main.from, to: main.to };
  }

  return {
    pieces: clonePieces(sim.pieces),
    turn: sim.turn,
    lastMove,
    captured,
    inCheck: detectInCheck(sim),
  };
}
