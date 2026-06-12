import type { DrawReason } from "@/lib/chess/draw";
import type { WinReason } from "@/lib/chess/gameEnd";
import type { PieceColor, PieceRank } from "@/lib/chess/types";
import type { TimeControl } from "@/lib/settings/types";

export interface MovePayload {
  pieceName: string;
  position: number;
  promotionRank?: PieceRank;
}

export type ClientMessage =
  | { type: "create_room"; timeControl?: TimeControl; playerName?: string }
  | { type: "join_room"; roomId: string; playerName?: string }
  | { type: "move"; roomId: string; pieceName: string; position: number; promotionRank?: PieceRank }
  | { type: "resign"; roomId: string }
  | { type: "draw_offer"; roomId: string }
  | { type: "draw_accept"; roomId: string }
  | { type: "draw_decline"; roomId: string }
  | { type: "ping" };

export type ServerMessage =
  | { type: "connected"; username?: string }
  | { type: "room_created"; roomId: string; color: PieceColor }
  | { type: "room_joined"; roomId: string; color: PieceColor; opponentConnected: boolean }
  | { type: "opponent_joined" }
  | { type: "game_start"; roomId: string; color: PieceColor; timeControl: TimeControl; opponentName?: string }
  | { type: "move"; roomId: string; pieceName: string; position: number; promotionRank?: PieceRank }
  | { type: "game_over"; winner?: PieceColor; drawReason?: DrawReason; winReason?: WinReason }
  | { type: "opponent_disconnected" }
  | { type: "opponent_reconnected" }
  | { type: "draw_offered" }
  | { type: "draw_declined" }
  | { type: "error"; message: string }
  | { type: "pong" };
