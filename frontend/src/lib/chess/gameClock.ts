import type { PieceColor } from "./types";

export type ClockSnapshot = {
  whiteTime: number;
  blackTime: number;
  turn: PieceColor;
  started: boolean;
  running: boolean;
};

type ClockListener = () => void;

const listeners = new Set<ClockListener>();

const SERVER_SNAPSHOT: ClockSnapshot = {
  whiteTime: 0,
  blackTime: 0,
  turn: "white",
  started: false,
  running: false,
};

let snapshot: ClockSnapshot = { ...SERVER_SNAPSHOT };

/** Millisecond-precision clock kept outside React state for smooth UI updates. */
export const gameClockMs = {
  white: 0,
  black: 0,
  lastTick: 0,
};

export function msToDisplaySeconds(ms: number): number {
  return Math.max(0, Math.ceil(ms / 1000));
}

/** Live display times — extrapolates from ms + wall clock so UI stays in sync. */
export function getLiveClockTimes(): Pick<ClockSnapshot, "whiteTime" | "blackTime"> {
  if (!snapshot.started || !snapshot.running) {
    return { whiteTime: snapshot.whiteTime, blackTime: snapshot.blackTime };
  }

  const now = Date.now();
  const elapsed = now - gameClockMs.lastTick;
  let whiteMs = gameClockMs.white;
  let blackMs = gameClockMs.black;

  if (snapshot.turn === "white") whiteMs = Math.max(0, whiteMs - elapsed);
  else blackMs = Math.max(0, blackMs - elapsed);

  return {
    whiteTime: msToDisplaySeconds(whiteMs),
    blackTime: msToDisplaySeconds(blackMs),
  };
}

/** Deduct elapsed time for the active side and switch turn (call when a move starts). */
export function switchClockTurn(): PieceColor {
  const now = Date.now();
  const elapsed = now - gameClockMs.lastTick;
  gameClockMs.lastTick = now;

  if (snapshot.turn === "white") {
    gameClockMs.white = Math.max(0, gameClockMs.white - elapsed);
  } else {
    gameClockMs.black = Math.max(0, gameClockMs.black - elapsed);
  }

  const nextTurn: PieceColor = snapshot.turn === "white" ? "black" : "white";
  setClockSnapshot({
    turn: nextTurn,
    whiteTime: msToDisplaySeconds(gameClockMs.white),
    blackTime: msToDisplaySeconds(gameClockMs.black),
  });
  return nextTurn;
}

export function getClockSnapshot(): ClockSnapshot {
  return snapshot;
}

export function getServerClockSnapshot(): ClockSnapshot {
  return SERVER_SNAPSHOT;
}

export function setClockSnapshot(next: Partial<ClockSnapshot>): void {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

export function subscribeClock(listener: ClockListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetClockStore(): void {
  snapshot = { ...SERVER_SNAPSHOT };
  gameClockMs.white = 0;
  gameClockMs.black = 0;
  gameClockMs.lastTick = 0;
}

export function initClockStore(timeControlSec: number, turn: PieceColor = "white"): void {
  const ms = timeControlSec * 1000;
  gameClockMs.white = ms;
  gameClockMs.black = ms;
  gameClockMs.lastTick = Date.now();
  setClockSnapshot({
    whiteTime: timeControlSec,
    blackTime: timeControlSec,
    turn,
    started: false,
    running: false,
  });
}

export function restoreClockStore(
  whiteSec: number,
  blackSec: number,
  turn: PieceColor,
  running: boolean
): void {
  gameClockMs.white = whiteSec * 1000;
  gameClockMs.black = blackSec * 1000;
  gameClockMs.lastTick = Date.now();
  setClockSnapshot({
    whiteTime: whiteSec,
    blackTime: blackSec,
    turn,
    started: running,
    running,
  });
}
