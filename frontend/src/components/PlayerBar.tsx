"use client";

import { Bot, User } from "lucide-react";
import { getPieceSrc } from "@/lib/chess/pieceAssets";
import { materialAdvantage, sortCaptured } from "@/lib/chess/material";
import GameClock from "./GameClock";
import type { CapturedPiece } from "@/lib/chess/useChessGame";
import type { PieceColor, GameOptions } from "@/lib/chess/types";
import { isComputerMode, isOnlineMode } from "@/lib/chess/types";
import type { PieceSet } from "@/lib/settings/types";

interface PlayerBarProps {
  color: PieceColor;
  isActive: boolean;
  isAi?: boolean;
  captured: CapturedPiece[];
  pieceSet?: PieceSet;
  isThinking?: boolean;
  label?: string;
  rating?: number;
  showTimer?: boolean;
}

export default function PlayerBar({
  color,
  isActive,
  isAi,
  captured,
  pieceSet = "neo",
  isThinking,
  label,
  rating,
  showTimer = false,
}: PlayerBarProps) {
  const taken = sortCaptured(captured.filter((c) => c.color !== color));
  const advantage = materialAdvantage(color, captured);
  const isWhite = color === "white";

  return (
    <div className={`player-bar flex items-center gap-3 px-4 py-3 w-full min-h-[56px] ${isActive ? "active" : ""}`}>
      <div
        className={`player-avatar shrink-0 flex items-center justify-center relative
          ${isWhite
            ? "bg-gradient-to-br from-[#f5f5eb] to-[#d8d8c8] text-[#262421]"
            : "bg-gradient-to-br from-[#3a3835] to-[#1a1917] text-[#eeeed2] border border-white/10"
          }`}
      >
        {isAi ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
        {isActive && <span className="player-active-dot" aria-hidden="true" />}
      </div>

      <div className="flex-1 min-w-0 flex items-center gap-2">
        <div className="min-w-0 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--text-primary)] text-sm sm:text-base truncate">
              {label ?? color}
            </span>
            {rating !== undefined && (
              <span className="player-rating shrink-0">{rating}</span>
            )}
            {isThinking && (
              <span className="text-[#81b64c] text-xs animate-pulse">●●●</span>
            )}
          </div>
        </div>

        {(taken.length > 0 || advantage > 0) && (
          <div className="captured-tray flex items-center gap-1.5 min-w-0 flex-1">
            {taken.length > 0 && (
              <div className="captured-pieces flex items-center flex-wrap gap-0.5" title={`${taken.length} captured`}>
                {taken.map((c, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${c.piece.name}-${i}`}
                    src={getPieceSrc(c.piece, pieceSet)}
                    alt=""
                    className="captured-piece-icon"
                    draggable={false}
                  />
                ))}
              </div>
            )}
            {advantage > 0 && (
              <span className="material-advantage shrink-0">+{advantage}</span>
            )}
          </div>
        )}
      </div>

      {showTimer && (
        <div className="player-bar__clock sm:hidden">
          <GameClock color={color} isActive={isActive} variant="inline" />
        </div>
      )}
    </div>
  );
}

export function getPlayerLabel(
  color: PieceColor,
  options: GameOptions | null,
  names?: { userName?: string; opponentName?: string | null }
): { label: string; isAi: boolean } {
  if (!options) return { label: color, isAi: false };
  if (isOnlineMode(options.playAgainst)) {
    const side = color === "white" ? "White" : "Black";
    if (color === options.humanColor) {
      const who = names?.userName ?? "You";
      return { label: `${who} · ${side}`, isAi: false };
    }
    const who = names?.opponentName ?? "Opponent";
    return { label: `${who} · ${side}`, isAi: false };
  }
  if (!isComputerMode(options.playAgainst)) return { label: color, isAi: false };
  if (color === options.aiColor) {
    const engine =
      options.playAgainst === "stockfish" ? "Stockfish" : "Minimax";
    return { label: `${engine} · ${options.aiDifficulty}`, isAi: true };
  }
  return { label: "You", isAi: false };
}
