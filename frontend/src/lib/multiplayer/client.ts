import type { DrawReason } from "@/lib/chess/draw";
import type { WinReason } from "@/lib/chess/gameEnd";
import type { PieceColor, PieceRank } from "@/lib/chess/types";
import type { TimeControl } from "@/lib/settings/types";
import type { ServerMessage } from "../../../../server/src/ws/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001";

export type MultiplayerHandlers = {
  onConnected?: () => void;
  onRoomCreated?: (roomId: string, color: PieceColor) => void;
  onRoomJoined?: (roomId: string, color: PieceColor) => void;
  onOpponentJoined?: () => void;
  onGameStart?: (data: {
    roomId: string;
    color: PieceColor;
    timeControl: TimeControl;
    opponentName?: string;
  }) => void;
  onMove?: (data: { pieceName: string; position: number; promotionRank?: PieceRank }) => void;
  onGameOver?: (data: { winner?: PieceColor; drawReason?: DrawReason; winReason?: WinReason }) => void;
  onOpponentDisconnected?: () => void;
  onDrawOffered?: () => void;
  onDrawDeclined?: () => void;
  onError?: (message: string) => void;
};

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private handlers: MultiplayerHandlers = {};
  private roomId: string | null = null;

  connect(token: string, handlers: MultiplayerHandlers): Promise<void> {
    this.handlers = handlers;
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.handlers = handlers;
        resolve();
        return;
      }

      const url = `${WS_URL}?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => resolve();
      ws.onerror = () => reject(new Error("Could not connect to server"));
      ws.onclose = () => {
        if (this.roomId) {
          this.handlers.onError?.("Disconnected from server");
        }
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as ServerMessage;
          this.dispatch(msg);
        } catch {
          this.handlers.onError?.("Invalid server message");
        }
      };
    });
  }

  private send(payload: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private dispatch(msg: ServerMessage) {
    switch (msg.type) {
      case "connected":
        this.handlers.onConnected?.();
        break;
      case "room_created":
        this.roomId = msg.roomId;
        this.handlers.onRoomCreated?.(msg.roomId, msg.color);
        break;
      case "room_joined":
        this.roomId = msg.roomId;
        this.handlers.onRoomJoined?.(msg.roomId, msg.color);
        break;
      case "opponent_joined":
        this.handlers.onOpponentJoined?.();
        break;
      case "game_start":
        this.roomId = msg.roomId;
        this.handlers.onGameStart?.({
          roomId: msg.roomId,
          color: msg.color,
          timeControl: msg.timeControl,
          opponentName: msg.opponentName,
        });
        break;
      case "move":
        this.handlers.onMove?.({
          pieceName: msg.pieceName,
          position: msg.position,
          promotionRank: msg.promotionRank,
        });
        break;
      case "game_over":
        this.handlers.onGameOver?.({
          winner: msg.winner,
          drawReason: msg.drawReason,
          winReason: msg.winReason,
        });
        break;
      case "opponent_disconnected":
        this.handlers.onOpponentDisconnected?.();
        break;
      case "draw_offered":
        this.handlers.onDrawOffered?.();
        break;
      case "draw_declined":
        this.handlers.onDrawDeclined?.();
        break;
      case "error":
        this.handlers.onError?.(msg.message);
        break;
      default:
        break;
    }
  }

  createRoom(timeControl: TimeControl, playerName?: string) {
    this.send({ type: "create_room", timeControl, playerName });
  }

  joinRoom(roomId: string, playerName?: string) {
    this.send({ type: "join_room", roomId: roomId.toUpperCase(), playerName });
  }

  sendMove(pieceName: string, position: number, promotionRank?: PieceRank) {
    if (!this.roomId) return;
    this.send({ type: "move", roomId: this.roomId, pieceName, position, promotionRank });
  }

  resign() {
    if (!this.roomId) return;
    this.send({ type: "resign", roomId: this.roomId });
  }

  offerDraw() {
    if (!this.roomId) return;
    this.send({ type: "draw_offer", roomId: this.roomId });
  }

  acceptDraw() {
    if (!this.roomId) return;
    this.send({ type: "draw_accept", roomId: this.roomId });
  }

  declineDraw() {
    if (!this.roomId) return;
    this.send({ type: "draw_decline", roomId: this.roomId });
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
    this.roomId = null;
  }
}
