"use client";

import { useEffect, useRef, useCallback } from "react";
import type { PieceColor } from "@/lib/chess/types";

export function useChessTimer(
  active: boolean,
  turn: PieceColor,
  whiteTime: number,
  blackTime: number,
  setWhiteTime: (t: number) => void,
  setBlackTime: (t: number) => void,
  onTimeout: (loser: PieceColor) => void
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tick = useCallback(() => {
    if (turn === "white") {
      setWhiteTime(Math.max(0, whiteTime - 1));
      if (whiteTime <= 1) onTimeout("white");
    } else {
      setBlackTime(Math.max(0, blackTime - 1));
      if (blackTime <= 1) onTimeout("black");
    }
  }, [turn, whiteTime, blackTime, setWhiteTime, setBlackTime, onTimeout]);

  useEffect(() => {
    if (!active || (whiteTime === 0 && blackTime === 0)) return;

    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, tick, whiteTime, blackTime]);

  return { formatTime: (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }};
}
