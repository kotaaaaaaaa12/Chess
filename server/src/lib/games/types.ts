import type { DrawReason } from "@/lib/chess/draw";
import type { AiDifficulty, MoveRecord, PieceColor, PlayMode, TimeControl } from "@/lib/chess/types";

export interface SaveGameInput {
  playAgainst: PlayMode;
  aiDifficulty: AiDifficulty;
  humanColor: PieceColor;
  result: "win" | "loss" | "draw";
  rated: boolean;
  eloBefore: number;
  eloChange: number;
  moveCount: number;
  openingName: string;
  timeControl: TimeControl;
  opponentName?: string | null;
  drawReason?: DrawReason | null;
  winner?: PieceColor | null;
  pgn: string;
  history: MoveRecord[][];
}

export interface GameSummary {
  id: string;
  playedAt: string;
  playAgainst: PlayMode;
  aiDifficulty: AiDifficulty | null;
  humanColor: PieceColor;
  result: "win" | "loss" | "draw";
  rated: boolean;
  eloBefore: number | null;
  eloChange: number;
  moveCount: number;
  openingName: string | null;
  timeControl: number | null;
  opponentName: string | null;
  drawReason: string | null;
  winner: PieceColor | null;
}

export interface GameDetail extends GameSummary {
  pgn: string;
  history: MoveRecord[][];
}
