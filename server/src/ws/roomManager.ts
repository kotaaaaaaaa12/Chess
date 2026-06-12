import type { WebSocket } from "ws";
import { Game } from "@/lib/chess/game";
import { INITIAL_PIECES, clonePieces } from "@/lib/chess/constants";
import type { DrawReason } from "@/lib/chess/draw";
import type { PieceColor, PieceRank } from "@/lib/chess/types";
import type { TimeControl } from "@/lib/settings/types";
import type { ClientMessage, ServerMessage } from "./types";
import { getSocketUser } from "./socketAuth";

interface Player {
  ws: WebSocket;
  userId: string;
  name: string;
}

interface Room {
  id: string;
  players: Partial<Record<PieceColor, Player>>;
  game: Game;
  timeControl: TimeControl;
  status: "waiting" | "active" | "finished";
  drawOfferedBy?: PieceColor;
}

function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function broadcast(room: Room, msg: ServerMessage, exclude?: WebSocket) {
  for (const player of Object.values(room.players)) {
    if (player && player.ws !== exclude) send(player.ws, msg);
  }
}

export class RoomManager {
  private rooms = new Map<string, Room>();

  generateRoomId(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let id = "";
    for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return this.rooms.has(id) ? this.generateRoomId() : id;
  }

  private getRoomForWs(ws: WebSocket): Room | undefined {
    for (const room of this.rooms.values()) {
      for (const player of Object.values(room.players)) {
        if (player?.ws === ws) return room;
      }
    }
    return undefined;
  }

  private getColorInRoom(room: Room, ws: WebSocket): PieceColor | null {
    if (room.players.white?.ws === ws) return "white";
    if (room.players.black?.ws === ws) return "black";
    return null;
  }

  private bindGameEvents(room: Room) {
    const game = room.game;
    game.on("checkMate", (winner) => {
      if (room.status === "finished") return;
      room.status = "finished";
      broadcast(room, { type: "game_over", winner: winner as PieceColor, winReason: "checkmate" });
    });
    game.on("stalemate", () => {
      if (room.status === "finished") return;
      room.status = "finished";
      broadcast(room, { type: "game_over", drawReason: "stalemate" });
    });
    game.on("draw", (reason) => {
      if (room.status === "finished") return;
      room.status = "finished";
      broadcast(room, { type: "game_over", drawReason: reason as DrawReason });
    });
  }

  private startGame(room: Room) {
    room.status = "active";
    room.game = new Game(clonePieces(INITIAL_PIECES), "white");
    this.bindGameEvents(room);

    const white = room.players.white!;
    const black = room.players.black!;

    send(white.ws, {
      type: "game_start",
      roomId: room.id,
      color: "white",
      timeControl: room.timeControl,
      opponentName: black.name,
    });
    send(black.ws, {
      type: "game_start",
      roomId: room.id,
      color: "black",
      timeControl: room.timeControl,
      opponentName: white.name,
    });
  }

  handleDisconnect(ws: WebSocket) {
    const room = this.getRoomForWs(ws);
    if (!room) return;

    const color = this.getColorInRoom(room, ws);
    if (color) delete room.players[color];

    if (room.status === "active") {
      broadcast(room, { type: "opponent_disconnected" });
    }

    if (!room.players.white && !room.players.black) {
      this.rooms.delete(room.id);
    }
  }

  handleMessage(ws: WebSocket, raw: ClientMessage) {
    const auth = getSocketUser(ws);
    if (!auth) {
      send(ws, { type: "error", message: "Not authenticated" });
      return;
    }

    switch (raw.type) {
      case "ping":
        send(ws, { type: "pong" });
        break;
      case "create_room":
        this.createRoom(ws, raw.timeControl ?? 300);
        break;
      case "join_room":
        this.joinRoom(ws, raw.roomId.toUpperCase());
        break;
      case "move":
        this.handleMove(ws, raw.roomId.toUpperCase(), raw.pieceName, raw.position, raw.promotionRank);
        break;
      case "resign":
        this.handleResign(ws, raw.roomId.toUpperCase());
        break;
      case "draw_offer":
        this.handleDrawOffer(ws, raw.roomId.toUpperCase());
        break;
      case "draw_accept":
        this.handleDrawAccept(ws, raw.roomId.toUpperCase());
        break;
      case "draw_decline":
        this.handleDrawDecline(ws, raw.roomId.toUpperCase());
        break;
      default:
        send(ws, { type: "error", message: "Unknown message type" });
    }
  }

  private createRoom(ws: WebSocket, timeControl: TimeControl) {
    const auth = getSocketUser(ws);
    if (!auth) {
      send(ws, { type: "error", message: "Not authenticated" });
      return;
    }

    if (this.getRoomForWs(ws)) {
      send(ws, { type: "error", message: "Already in a room" });
      return;
    }

    const id = this.generateRoomId();
    const room: Room = {
      id,
      players: { white: { ws, userId: auth.userId, name: auth.name } },
      game: new Game(clonePieces(INITIAL_PIECES), "white"),
      timeControl,
      status: "waiting",
    };
    this.rooms.set(id, room);
    send(ws, { type: "room_created", roomId: id, color: "white" });
  }

  private joinRoom(ws: WebSocket, roomId: string) {
    const auth = getSocketUser(ws);
    if (!auth) {
      send(ws, { type: "error", message: "Not authenticated" });
      return;
    }

    if (this.getRoomForWs(ws)) {
      send(ws, { type: "error", message: "Already in a room" });
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      send(ws, { type: "error", message: "Room not found" });
      return;
    }
    if (room.status !== "waiting") {
      send(ws, { type: "error", message: "Game already started" });
      return;
    }
    if (room.players.black) {
      send(ws, { type: "error", message: "Room is full" });
      return;
    }

    if (room.players.white?.userId === auth.userId) {
      send(ws, { type: "error", message: "Cannot join your own room in another tab" });
      return;
    }

    room.players.black = { ws, userId: auth.userId, name: auth.name };
    send(ws, { type: "room_joined", roomId, color: "black", opponentConnected: true });
    send(room.players.white!.ws, { type: "opponent_joined" });
    this.startGame(room);
  }

  private handleMove(
    ws: WebSocket,
    roomId: string,
    pieceName: string,
    position: number,
    promotionRank?: PieceRank
  ) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== "active") {
      send(ws, { type: "error", message: "No active game" });
      return;
    }

    const color = this.getColorInRoom(room, ws);
    if (!color || room.game.turn !== color) {
      send(ws, { type: "error", message: "Not your turn" });
      return;
    }

    const ok = room.game.movePiece(pieceName, position, promotionRank);
    if (!ok) {
      send(ws, { type: "error", message: "Illegal move" });
      return;
    }

    room.drawOfferedBy = undefined;

    const payload = {
      type: "move" as const,
      roomId,
      pieceName,
      position,
      promotionRank,
    };

    // Only notify opponent — sender already applied move locally
    broadcast(room, payload, ws);
  }

  private handleResign(ws: WebSocket, roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== "active") return;

    const color = this.getColorInRoom(room, ws);
    if (!color) return;

    room.status = "finished";
    const winner = color === "white" ? "black" : "white";
    broadcast(room, { type: "game_over", winner, winReason: "resignation" });
  }

  private handleDrawOffer(ws: WebSocket, roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== "active") return;

    const color = this.getColorInRoom(room, ws);
    if (!color) return;

    room.drawOfferedBy = color;
    for (const [c, player] of Object.entries(room.players) as [PieceColor, Player][]) {
      if (c !== color && player) send(player.ws, { type: "draw_offered" });
    }
  }

  private handleDrawAccept(ws: WebSocket, roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== "active" || !room.drawOfferedBy) return;

    const color = this.getColorInRoom(room, ws);
    if (!color || color === room.drawOfferedBy) return;

    room.status = "finished";
    const drawReason: DrawReason = "agreement";
    broadcast(room, { type: "game_over", drawReason });
  }

  private handleDrawDecline(ws: WebSocket, roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || !room.drawOfferedBy) return;

    const color = this.getColorInRoom(room, ws);
    if (!color || color === room.drawOfferedBy) return;

    const offererColor = room.drawOfferedBy;
    room.drawOfferedBy = undefined;
    const offerer = room.players[offererColor];
    if (offerer) send(offerer.ws, { type: "draw_declined" });
  }
}
