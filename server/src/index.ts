import { config } from "dotenv";
import { createServer, type Server } from "http";
import { parse as parseUrl } from "url";
import { WebSocketServer, WebSocket } from "ws";
import { createHttpApp } from "./http";
import { RoomManager } from "./ws/roomManager";
import { authenticateSocket, clearSocketUser } from "./ws/socketAuth";
import type { ClientMessage, ServerMessage } from "./ws/types";

config({ path: ".env.local" });
config({ path: ".env" });

// Render sets PORT — use it in production; local dev uses API_PORT (4000)
const HTTP_PORT = parseInt(process.env.PORT ?? process.env.API_PORT ?? "4000", 10);
const WS_PORT = parseInt(process.env.WS_PORT ?? "3001", 10);
const SINGLE_PORT = Boolean(process.env.PORT);

const app = createHttpApp();
const httpServer = createServer(app);
const roomManager = new RoomManager();

function wsSend(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function parseMessage(data: unknown): ClientMessage | null {
  try {
    const raw = JSON.parse(String(data));
    if (!raw || typeof raw.type !== "string") return null;
    return raw as ClientMessage;
  } catch {
    return null;
  }
}

function attachWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", async (ws, req) => {
    const parsed = parseUrl(req.url ?? "", true);
    const token = typeof parsed.query?.token === "string" ? parsed.query.token : null;
    const user = await authenticateSocket(ws, token);

    if (!user) {
      wsSend(ws, { type: "error", message: "Authentication required. Please login first." });
      ws.close(4401, "Unauthorized");
      return;
    }

    wsSend(ws, { type: "connected", username: user.name });

    ws.on("message", (data) => {
      const msg = parseMessage(data);
      if (!msg) {
        wsSend(ws, { type: "error", message: "Invalid message" });
        return;
      }
      roomManager.handleMessage(ws, msg);
    });

    ws.on("close", () => {
      clearSocketUser(ws);
      roomManager.handleDisconnect(ws);
    });
  });
}

if (!process.env.JWT_SECRET) {
  console.warn("JWT_SECRET not set — using dev default. Set it in production.");
}

if (SINGLE_PORT) {
  // Render / Railway: one public port — API + WebSocket together
  attachWebSocketServer(httpServer);
  httpServer.listen(HTTP_PORT, () => {
    console.log(`Chess server running on port ${HTTP_PORT} (API + WebSocket)`);
  });
} else {
  // Local dev: API on 4000, WebSocket on 3001
  httpServer.listen(HTTP_PORT, () => {
    console.log(`Chess API server running on http://localhost:${HTTP_PORT}`);
  });

  const wsHttpServer = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Chess multiplayer WebSocket server\n");
  });

  attachWebSocketServer(wsHttpServer);

  wsHttpServer.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${WS_PORT} is already in use.`);
      process.exit(1);
    }
    throw err;
  });

  wsHttpServer.listen(WS_PORT, () => {
    console.log(`Chess WS server running on ws://localhost:${WS_PORT}`);
  });
}
