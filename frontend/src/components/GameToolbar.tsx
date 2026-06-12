"use client";

import type { ReactNode } from "react";
import {
  RotateCcw, FlipVertical2, Undo2, Home, Flag, Handshake,
  Lightbulb, Download, Copy, Settings,
} from "lucide-react";

interface GameToolbarProps {
  gameOver: boolean;
  inReview: boolean;
  isAnimating: boolean;
  isHintLoading: boolean;
  hintsUsed: number;
  allowDraw?: boolean;
  allowFlip?: boolean;
  onHint: () => void;
  onUndo: () => void;
  onFlip: () => void;
  onOfferDraw: () => void;
  onResign: () => void;
  onExportPGN: () => void;
  onExportFEN: () => void;
  onOpenSettings: () => void;
  onNewGame: () => void;
  onReset: () => void;
  compact?: boolean;
}

export default function GameToolbar({
  gameOver, inReview, isAnimating, isHintLoading, hintsUsed, allowDraw = true, allowFlip = true,
  onHint, onUndo, onFlip, onOfferDraw, onResign,
  onExportPGN, onExportFEN, onOpenSettings, onNewGame, onReset,
  compact = false,
}: GameToolbarProps) {
  const disabled = gameOver || isAnimating || inReview;

  const btn = (onClick: () => void, icon: ReactNode, label: string, extra?: string, isDisabled = disabled) => (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      title={label}
      className={`game-toolbar__btn ${extra ?? ""} ${isDisabled ? "opacity-30" : ""}`}
    >
      {icon}
      {!compact && <span>{label}</span>}
    </button>
  );

  return (
    <div className={`game-toolbar ${compact ? "game-toolbar--compact" : ""}`}>
      {btn(onHint, <Lightbulb className={`w-4 h-4 ${isHintLoading ? "animate-pulse text-[#d4a853]" : "text-[#d4a853]"}`} />, isHintLoading ? "Finding..." : "Hint", "game-toolbar__btn--hint", disabled || isHintLoading)}
      {btn(onUndo, <Undo2 className="w-4 h-4" />, "Undo")}
      {btn(onFlip, <FlipVertical2 className="w-4 h-4" />, "Flip", undefined, !allowFlip)}
      {btn(onOfferDraw, <Handshake className="w-4 h-4" />, "Draw", undefined, disabled || !allowDraw)}
      {btn(onResign, <Flag className="w-4 h-4" />, "Resign", "game-toolbar__btn--danger")}
      {btn(onExportPGN, <Download className="w-4 h-4" />, "PGN", undefined, false)}
      {btn(onExportFEN, <Copy className="w-4 h-4" />, "FEN", undefined, false)}
      {btn(onOpenSettings, <Settings className="w-4 h-4" />, "Settings", undefined, false)}
      {btn(onNewGame, <RotateCcw className="w-4 h-4" />, "New Game", "game-toolbar__btn--primary", false)}
      {btn(onReset, <Home className="w-4 h-4" />, "Menu", undefined, false)}
      {hintsUsed > 0 && !compact && (
        <span className="text-[10px] text-white/25 ml-auto">Hints: {hintsUsed}</span>
      )}
    </div>
  );
}
