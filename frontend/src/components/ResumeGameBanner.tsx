"use client";

import { useMemo } from "react";
import { Play, X } from "lucide-react";
import { loadSavedGame, discardSavedGame } from "@/lib/storage";
import { isComputerMode } from "@/lib/chess/types";
import type { SavedGame } from "@/lib/storage";

interface ResumeGameBannerProps {
  onResume: (saved: SavedGame) => void;
  onDismiss: () => void;
}

export default function ResumeGameBanner({ onResume, onDismiss }: ResumeGameBannerProps) {
  const saved = useMemo(() => loadSavedGame(), []);

  if (!saved || saved.moveCount < 1) return null;

  const mode = saved.options.playAgainst;
  const label = isComputerMode(mode)
    ? `${mode === "stockfish" ? "Stockfish" : "Minimax"} game`
    : "Local game";
  const moves = saved.moveCount;
  const ago = Math.round((Date.now() - saved.savedAt) / 60000);

  return (
    <div className="resume-banner">
      <div className="min-w-0 flex-1">
        <p className="resume-banner__title">Continue last game?</p>
        <p className="resume-banner__sub">
          {label} · {moves} move{moves !== 1 ? "s" : ""}
          {ago < 60 ? ` · ${ago || 1}m ago` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onResume(saved)}
        className="resume-banner__play"
      >
        <Play className="w-3.5 h-3.5 fill-current" />
        Resume
      </button>
      <button
        type="button"
        onClick={() => { discardSavedGame(); onDismiss(); }}
        className="resume-banner__dismiss"
        title="Discard saved game"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
