"use client";

import { useCallback, useRef, useState } from "react";
import { MultiplayerClient } from "@/lib/multiplayer/client";
import type { DrawReason } from "@/lib/chess/draw";
import type { WinReason } from "@/lib/chess/gameEnd";
import type { PieceColor, PieceRank } from "@/lib/chess/types";
import type { TimeControl } from "@/lib/settings/types";

export type OnlineStatus =
  | "idle"
  | "connecting"
  | "waiting"
  | "playing"
  | "disconnected";

export function useOnlineMultiplayer() {
  const clientRef = useRef<MultiplayerClient | null>(null);
  const moveHandlerRef = useRef<
    ((move: { pieceName: string; position: number; promotionRank?: PieceRank }) => void) | null
  >(null);
  const gameOverHandlerRef = useRef<
    ((data: { winner?: PieceColor; drawReason?: DrawReason; winReason?: WinReason }) => void) | null
  >(null);

  const [status, setStatus] = useState<OnlineStatus>("idle");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [color, setColor] = useState<PieceColor | null>(null);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drawOffered, setDrawOffered] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [pendingGameStart, setPendingGameStart] = useState<{
    roomId: string;
    color: PieceColor;
    timeControl: TimeControl;
    opponentName?: string;
  } | null>(null);

  const ensureClient = useCallback(() => {
    if (!clientRef.current) clientRef.current = new MultiplayerClient();
    return clientRef.current;
  }, []);

  const connect = useCallback(async (token: string) => {
    setStatus("connecting");
    setError(null);
    const client = ensureClient();
    try {
      await client.connect(token, {
        onRoomCreated: (id, c) => {
          setRoomId(id);
          setColor(c);
          setStatus("waiting");
        },
        onRoomJoined: (id, c) => {
          setRoomId(id);
          setColor(c);
        },
        onOpponentJoined: () => setOpponentDisconnected(false),
        onGameStart: (data) => {
          setPendingGameStart(data);
          setColor(data.color);
          setRoomId(data.roomId);
          setOpponentName(data.opponentName ?? "Opponent");
          setStatus("playing");
          setOpponentDisconnected(false);
        },
        onMove: (move) => moveHandlerRef.current?.(move),
        onGameOver: (data) => gameOverHandlerRef.current?.(data),
        onOpponentDisconnected: () => setOpponentDisconnected(true),
        onDrawOffered: () => setDrawOffered(true),
        onDrawDeclined: () => setDrawOffered(false),
        onError: (msg) => {
          // Ignore noisy errors during active play (e.g. duplicate move echo)
          if (msg === "Not your turn" || msg === "Illegal move") return;
          if (msg.includes("Authentication required")) {
            setError("Session expired. Please login again.");
            return;
          }
          setError(msg);
        },
      });
    } catch {
      setStatus("idle");
      setError("Server not reachable. Run: npm run server");
      throw new Error("connect failed");
    }
  }, [ensureClient]);

  const createRoom = useCallback(async (timeControl: TimeControl, token: string) => {
    await connect(token);
    ensureClient().createRoom(timeControl);
  }, [connect, ensureClient]);

  const joinRoom = useCallback(async (code: string, token: string) => {
    await connect(token);
    ensureClient().joinRoom(code);
  }, [connect, ensureClient]);

  const sendMove = useCallback(
    (pieceName: string, position: number, promotionRank?: PieceRank) => {
      ensureClient().sendMove(pieceName, position, promotionRank);
    },
    [ensureClient]
  );

  const resign = useCallback(() => ensureClient().resign(), [ensureClient]);
  const offerDraw = useCallback(() => ensureClient().offerDraw(), [ensureClient]);
  const acceptDraw = useCallback(() => {
    ensureClient().acceptDraw();
    setDrawOffered(false);
  }, [ensureClient]);
  const declineDraw = useCallback(() => {
    ensureClient().declineDraw();
    setDrawOffered(false);
  }, [ensureClient]);

  const setMoveHandler = useCallback(
    (fn: (move: { pieceName: string; position: number; promotionRank?: PieceRank }) => void) => {
      moveHandlerRef.current = fn;
    },
    []
  );

  const setGameOverHandler = useCallback(
    (fn: (data: { winner?: PieceColor; drawReason?: DrawReason; winReason?: WinReason }) => void) => {
      gameOverHandlerRef.current = fn;
    },
    []
  );

  const consumeGameStart = useCallback(() => {
    const data = pendingGameStart;
    setPendingGameStart(null);
    return data;
  }, [pendingGameStart]);

  const reset = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    moveHandlerRef.current = null;
    gameOverHandlerRef.current = null;
    setStatus("idle");
    setRoomId(null);
    setColor(null);
    setOpponentName(null);
    setError(null);
    setDrawOffered(false);
    setOpponentDisconnected(false);
    setPendingGameStart(null);
  }, []);

  return {
    status,
    roomId,
    color,
    opponentName,
    error,
    drawOffered,
    opponentDisconnected,
    pendingGameStart,
    createRoom,
    joinRoom,
    sendMove,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
    setMoveHandler,
    setGameOverHandler,
    consumeGameStart,
    reset,
  };
}
