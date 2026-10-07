import type { DrawReason } from "@/lib/chess/draw";
import type { WinReason } from "@/lib/chess/gameEnd";
import type { MoveRecord, PieceColor, PieceRank } from "@/lib/chess/types";
import type { TimeControl } from "@/lib/settings/types";
import type { ServerMessage } from "../../../../server/src/ws/types";

function socketUrl(roomId: string, token: string): string {
  const url = new URL(`/ws/${roomId}`, window.location.origin);
  url.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("token", token);
  return url.href;
}

export type GameStartData = {
  roomId: string; color: PieceColor; timeControl: TimeControl; opponentName?: string;
  history?: MoveRecord[][]; whiteTime?: number; blackTime?: number; clockStarted?: boolean;
  result?: { winner?: PieceColor; drawReason?: DrawReason; winReason?: WinReason };
};

export type MultiplayerHandlers = {
  onConnected?: () => void;
  onRoomCreated?: (roomId: string, color: PieceColor) => void;
  onRoomJoined?: (roomId: string, color: PieceColor) => void;
  onOpponentJoined?: () => void;
  onGameStart?: (data: GameStartData) => void;
  onOpponentReconnected?: () => void;
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

  private token = "";
  private intentionalClose = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  async connect(token: string, handlers: MultiplayerHandlers): Promise<void> {
    this.token = token;
    this.handlers = handlers;
    this.intentionalClose = false;
  }

  private openRoom(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(socketUrl(roomId, this.token));
      this.ws = ws;
      let opened = false;
      ws.onopen = () => { opened = true; resolve(); };
      ws.onerror = () => { if (!opened) reject(new Error("Could not connect to the game server")); };
      ws.onclose = (event) => {
        if (this.ws !== ws || this.intentionalClose) return;
        if (!opened) reject(new Error("Could not connect to the game server"));
        if (this.roomId && event.code !== 1000 && event.code !== 1008 && this.reconnectAttempts < 5) {
          this.handlers.onError?.("Connection lost. Reconnecting…");
          const delay = Math.min(1000 * 2 ** this.reconnectAttempts++, 10000);
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            void this.openRoom(roomId).catch(() => {});
          }, delay);
        } else if (this.roomId && event.code !== 1008) this.handlers.onError?.("Disconnected from the game server");
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as ServerMessage;
          if (msg.type === "connected") this.reconnectAttempts = 0;
          this.dispatch(msg);
        } catch { this.handlers.onError?.("Invalid server message"); }
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
        this.handlers.onGameStart?.(msg as GameStartData);
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
      case "opponent_reconnected":
        this.handlers.onOpponentReconnected?.();
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

  async createRoom(timeControl: TimeControl, _playerName?: string) {
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.token}` },
        body: JSON.stringify({ timeControl }),
      });
      const data = await response.json() as { roomId?: string; error?: string };
      if (!response.ok || !data.roomId) throw new Error(data.error || "Could not create a room");
      this.roomId = data.roomId;
      await this.openRoom(data.roomId);
    } catch (error) { this.handlers.onError?.(error instanceof Error ? error.message : "Could not create a room"); }
  }

  async joinRoom(roomId: string, _playerName?: string) {
    const code = roomId.trim().toUpperCase();
    if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(code)) {
      this.handlers.onError?.("Enter a valid six-character room code"); return;
    }
    try { this.roomId = code; await this.openRoom(code); }
    catch { this.handlers.onError?.("Could not connect to the game server"); }
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
    this.intentionalClose = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.ws?.close();
    this.ws = null;
    this.roomId = null;
  }
}
