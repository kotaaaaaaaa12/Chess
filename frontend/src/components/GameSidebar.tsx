"use client";

import type { GameState } from "@/lib/chess/useChessGame";
import MoveList from "./MoveList";
import GameToolbar from "./GameToolbar";

interface GameSidebarProps {
  state: GameState;
  allowDraw?: boolean;
  allowFlip?: boolean;
  onUndo: () => void;
  onFlip: () => void;
  onReset: () => void;
  onNewGame: () => void;
  onResign: () => void;
  onOfferDraw: () => void;
  onHint: () => void;
  onExportPGN: () => void;
  onExportFEN: () => void;
  onOpenSettings: () => void;
  onGotoMove: (ply: number) => void;
  onExitReview: () => void;
}

export default function GameSidebar({
  state, allowDraw = true, allowFlip = true, onUndo, onFlip, onReset, onNewGame,
  onResign, onOfferDraw, onHint, onExportPGN, onExportFEN, onOpenSettings,
  onGotoMove, onExitReview,
}: GameSidebarProps) {
  const gameOver = !!(state.winner || state.drawReason);
  const inReview = state.viewPly !== null;

  return (
    <div className="game-right-panel">
      <MoveList
        moveLog={state.moveLog}
        activePly={state.viewPly}
        onGotoMove={onGotoMove}
        onExitReview={onExitReview}
        inReview={inReview}
      />
      <GameToolbar
        gameOver={gameOver}
        inReview={inReview}
        isAnimating={state.isAnimating}
        isHintLoading={state.isHintLoading}
        hintsUsed={state.hintsUsed}
        allowDraw={allowDraw}
        allowFlip={allowFlip}
        onHint={onHint}
        onUndo={onUndo}
        onFlip={onFlip}
        onOfferDraw={onOfferDraw}
        onResign={onResign}
        onExportPGN={onExportPGN}
        onExportFEN={onExportFEN}
        onOpenSettings={onOpenSettings}
        onNewGame={onNewGame}
        onReset={onReset}
      />
    </div>
  );
}
