import type { WebSocket } from "ws";
import { verifyToken } from "@/lib/auth/jwt";

export interface SocketUser {
  userId: string;
  username: string;
  name: string;
}

const socketUsers = new WeakMap<WebSocket, SocketUser>();

export async function authenticateSocket(
  ws: WebSocket,
  token: string | null
): Promise<SocketUser | null> {
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const user: SocketUser = {
    userId: payload.sub,
    username: payload.username,
    name: payload.name,
  };
  socketUsers.set(ws, user);
  return user;
}

export function getSocketUser(ws: WebSocket): SocketUser | null {
  return socketUsers.get(ws) ?? null;
}

export function clearSocketUser(ws: WebSocket) {
  socketUsers.delete(ws);
}
