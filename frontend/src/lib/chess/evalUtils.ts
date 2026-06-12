export interface PositionEval {
  /** Centipawns from White's perspective. */
  cp: number;
  /** Mate in N from White's perspective (+ = White mates). */
  mate: number | null;
}

export function fenSideToMove(fen: string): "white" | "black" {
  return fen.split(" ")[1] === "b" ? "black" : "white";
}

export function parseUciScore(
  cpMatch: RegExpMatchArray | null,
  mateMatch: RegExpMatchArray | null,
  sideToMove: "white" | "black"
): PositionEval {
  const sign = sideToMove === "white" ? 1 : -1;
  if (mateMatch) {
    return { cp: 0, mate: parseInt(mateMatch[1], 10) * sign };
  }
  if (cpMatch) {
    return { cp: parseInt(cpMatch[1], 10) * sign, mate: null };
  }
  return { cp: 0, mate: null };
}

/** Convert eval to white's share of the bar (0–100). */
export function evalToWhitePercent(eval_: PositionEval): number {
  if (eval_.mate !== null) {
    if (eval_.mate > 0) return 99;
    if (eval_.mate < 0) return 1;
    return 50;
  }
  const clamped = Math.max(-1000, Math.min(1000, eval_.cp));
  return 100 / (1 + Math.exp(-0.004 * clamped));
}

export function formatEval(eval_: PositionEval): string {
  if (eval_.mate !== null) {
    if (eval_.mate > 0) return `M${eval_.mate}`;
    return `M${Math.abs(eval_.mate)}`;
  }
  const pawns = eval_.cp / 100;
  if (Math.abs(pawns) < 0.05) return "0.0";
  return pawns > 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
}
