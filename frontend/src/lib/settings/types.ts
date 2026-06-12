export type BoardTheme = "marble" | "green" | "brown";
export type PieceSet = "neo" | "classic";
export type AnimationSpeed = "slow" | "normal" | "fast";
export type TimeControl = 0 | 180 | 300 | 600 | 900;

export interface AppSettings {
  theme: BoardTheme;
  pieceSet: PieceSet;
  soundEnabled: boolean;
  animationSpeed: AnimationSpeed;
  showMoveArrow: boolean;
  showTutorialOnStart: boolean;
  trackElo: boolean;
  showThreats: boolean;
}

export interface GameRecord {
  id: string;
  playedAt: number;
  playAgainst: "human" | "minimax" | "stockfish" | "online";
  aiDifficulty: "easy" | "medium" | "hard";
  humanColor: "white" | "black";
  result: "win" | "loss" | "draw";
  rated: boolean;
  eloBefore: number;
  eloChange: number;
  moveCount: number;
  openingName: string;
}

export interface LeaderboardStats {
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  elo: number;
  gameHistory: GameRecord[];
}

export interface EloSnapshot {
  change: number;
  newElo: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "marble",
  pieceSet: "neo",
  soundEnabled: true,
  animationSpeed: "normal",
  showMoveArrow: false,
  showTutorialOnStart: true,
  trackElo: true,
  showThreats: true,
};

export const ANIMATION_MS: Record<AnimationSpeed, number> = {
  slow: 420,
  normal: 280,
  fast: 150,
};

export const TIME_CONTROL_LABELS: Record<TimeControl, string> = {
  0: "No timer",
  180: "3 min",
  300: "5 min",
  600: "10 min",
  900: "15 min",
};
