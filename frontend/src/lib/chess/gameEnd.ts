import type { DrawReason } from "./draw";
import type { PieceColor } from "./types";

export type WinReason = "checkmate" | "timeout" | "resignation";

export interface GameEndCopy {
  title: string;
  subtitle: string;
}

const DRAW_LABELS: Record<DrawReason, string> = {
  stalemate: "Draw by stalemate",
  "insufficient-material": "Draw by insufficient material",
  "fifty-move": "Draw by 50-move rule",
  "threefold-repetition": "Draw by threefold repetition",
  agreement: "Draw by agreement",
};

function playerLabel(color: PieceColor, humanColor?: PieceColor): string {
  if (humanColor && color === humanColor) return "You";
  return color === "white" ? "White" : "Black";
}

export function getGameEndCopy(opts: {
  winner: PieceColor | null;
  drawReason: DrawReason | null;
  winReason: WinReason | null;
  humanColor?: PieceColor;
}): GameEndCopy {
  const { winner, drawReason, winReason, humanColor } = opts;

  if (drawReason) {
    return {
      title: DRAW_LABELS[drawReason],
      subtitle: "Well played by both sides.",
    };
  }

  if (!winner) {
    return { title: "Game over", subtitle: "" };
  }

  const who = playerLabel(winner, humanColor);
  const youWon = humanColor ? winner === humanColor : false;

  switch (winReason) {
    case "timeout":
      return {
        title: youWon ? "You won on time!" : `${who} wins on time`,
        subtitle: youWon ? "Your opponent ran out of time." : "The clock decided this one.",
      };
    case "resignation":
      return {
        title: youWon ? "You won by resignation" : `${who} wins by resignation`,
        subtitle: youWon ? "Your opponent resigned." : "Better luck next time.",
      };
    case "checkmate":
    default:
      return {
        title: youWon ? "You won by checkmate!" : `${who} wins by checkmate`,
        subtitle: youWon ? "Brilliant finish!" : "The king has no escape.",
      };
  }
}

export function getTurnStatusCopy(opts: {
  winner: PieceColor | null;
  drawReason: DrawReason | null;
  winReason: WinReason | null;
  humanColor?: PieceColor;
}): string {
  const copy = getGameEndCopy(opts);
  return copy.title;
}
