"use client";

import { useEffect, useState } from "react";
import {
  getClockSnapshot,
  getLiveClockTimes,
  subscribeClock,
  type ClockSnapshot,
} from "@/lib/chess/gameClock";

const SERVER_SNAPSHOT: ClockSnapshot = {
  whiteTime: 0,
  blackTime: 0,
  turn: "white",
  started: false,
  running: false,
};

/**
 * Live clock hook — polls wall time so the display ticks even when
 * useSyncExternalStore batching or main-thread AI work delays updates.
 */
export function useGameClock(): ClockSnapshot {
  const [frame, setFrame] = useState(0);

  useEffect(() => subscribeClock(() => setFrame((n) => n + 1)), []);

  useEffect(() => {
    const id = window.setInterval(() => {
      const { started, running } = getClockSnapshot();
      if (started && running) setFrame((n) => n + 1);
    }, 100);
    return () => window.clearInterval(id);
  }, []);

  void frame;
  const snap = getClockSnapshot();
  const live = getLiveClockTimes();
  return { ...snap, ...live };
}

export function getServerClockSnapshot(): ClockSnapshot {
  return SERVER_SNAPSHOT;
}
