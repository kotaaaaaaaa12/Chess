export type PieceColor = "white" | "black";
export type PieceRank = "pawn" | "knight" | "bishop" | "rook" | "queen" | "king";

export interface ChessPiece {
  rank: PieceRank;
  position: number;
  color: PieceColor;
  name: string;
  ableToCastle?: boolean;
}

export interface MoveRecord {
  from: number;
  to: number;
  piece: ChessPiece;
  castling?: boolean;
}

export type GameEvent =
  | "pieceMove"
  | "kill"
  | "check"
  | "promotion"
  | "checkMate"
  | "stalemate"
  | "draw"
  | "resign"
  | "turnChange";

export type PlayMode = "human" | "minimax" | "stockfish" | "online";
export type AiDifficulty = "easy" | "medium" | "hard";
export type TimeControl = 0 | 180 | 300 | 600 | 900;

export function isComputerMode(mode: PlayMode): boolean {
  return mode === "minimax" || mode === "stockfish";
}

export function isOnlineMode(mode: PlayMode): boolean {
  return mode === "online";
}

export interface GameOptions {
  playAgainst: PlayMode;
  aiColor: PieceColor;
  aiDifficulty: AiDifficulty;
  humanColor: PieceColor;
  timeControl: TimeControl;
  trackElo: boolean;
  onlineRoomId?: string;
  opponentName?: string;
}

export interface HintMove {
  pieceName: string;
  position: number;
  from: number;
  notation: string;
}

export interface AiMove {
  pieceName: string;
  position: number;
}

export interface AiResult {
  move: AiMove | null;
  score: number;
}
