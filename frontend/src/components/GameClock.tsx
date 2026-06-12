"use client";

import { useGameClock } from "@/hooks/useGameClock";
import type { PieceColor } from "@/lib/chess/types";

interface GameClockProps {
  color: PieceColor;
  isActive: boolean;
  label?: string;
  variant?: "rail" | "inline";
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function GameClock({
  color,
  isActive,
  label,
  variant = "rail",
}: GameClockProps) {
  const clock = useGameClock();
  const time = color === "white" ? clock.whiteTime : clock.blackTime;
  const isWhite = color === "white";
  const lowTime = clock.started && time > 0 && time <= 30;
  const isRunning = clock.started && clock.running && isActive;

  return (
    <div className={`game-clock game-clock--${variant}`}>
      {label && variant === "rail" && (
        <span className="game-clock__label">{label}</span>
      )}
      <div
        className={`timer-box game-clock__time ${isWhite ? "timer-box--light" : "timer-box--dark"} ${isRunning ? "timer-box--running" : ""} ${lowTime ? "timer-box--low" : ""}`}
        aria-live={isRunning ? "polite" : undefined}
        aria-label={isRunning ? `${formatTime(time)} remaining` : formatTime(time)}
      >
        {formatTime(time)}
      </div>
    </div>
  );
}
