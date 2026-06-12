"use client";

import GameClock from "./GameClock";
import type { PieceColor } from "@/lib/chess/types";

interface GameClockRailProps {
  topColor: PieceColor;
  bottomColor: PieceColor;
  topActive: boolean;
  bottomActive: boolean;
  topLabel?: string;
  bottomLabel?: string;
}

export default function GameClockRail({
  topColor,
  bottomColor,
  topActive,
  bottomActive,
  topLabel,
  bottomLabel,
}: GameClockRailProps) {
  return (
    <aside className="game-clock-rail" aria-label="Game clocks">
      <GameClock color={topColor} isActive={topActive} label={topLabel} variant="rail" />
      <GameClock color={bottomColor} isActive={bottomActive} label={bottomLabel} variant="rail" />
    </aside>
  );
}
