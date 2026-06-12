"use client";

import { motion } from "framer-motion";
import { Crown, RotateCcw, Home, Handshake, Sparkles, Clock, Flag } from "lucide-react";
import { getGameEndCopy } from "@/lib/chess/gameEnd";
import type { WinReason } from "@/lib/chess/gameEnd";
import type { PieceColor } from "@/lib/chess/types";
import type { DrawReason } from "@/lib/chess/draw";
import type { EloSnapshot } from "@/lib/settings/types";

interface GameOverModalProps {
  winner: PieceColor | null;
  winReason: WinReason | null;
  drawReason: DrawReason | null;
  humanColor?: PieceColor;
  eloSnapshot?: EloSnapshot | null;
  rated?: boolean;
  canReview?: boolean;
  onReview?: () => void;
  onNewGame: () => void;
  onMenu: () => void;
}

export default function GameOverModal({
  winner,
  winReason,
  drawReason,
  humanColor,
  eloSnapshot,
  rated,
  canReview,
  onReview,
  onNewGame,
  onMenu,
}: GameOverModalProps) {
  const isDraw = !!drawReason;
  const copy = getGameEndCopy({ winner, drawReason, winReason, humanColor });

  const Icon = isDraw
    ? Handshake
    : winReason === "timeout"
      ? Clock
      : winReason === "resignation"
        ? Flag
        : Crown;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="modal-shell bg-black/75 backdrop-blur-md z-50">
      <motion.div initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }}
        className="modal-panel relative max-w-md rounded-2xl glass-panel p-6 sm:p-8 text-center overflow-hidden my-auto">
        <div className="absolute inset-0 bg-gradient-to-b from-[#81b64c]/10 to-transparent pointer-events-none" />

        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--accent-bright)] to-[var(--accent)] mb-6 shadow-lg shadow-[var(--accent-glow)] text-[#0f1209]">
          <Icon className="w-10 h-10 text-white" />
        </div>

        <div className="flex items-center justify-center gap-2 mb-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {copy.title}
          </h2>
        </div>
        <p className="text-white/50 mb-4">{copy.subtitle}</p>

        {rated !== undefined && (
          <span className={`inline-block mb-3 text-xs font-semibold px-3 py-1 rounded-full ${
            rated ? "bg-[#d4a853]/15 text-[#d4a853]" : "bg-white/10 text-white/40"
          }`}>
            {rated ? "Rated Game" : "Unrated Game"}
          </span>
        )}

        {eloSnapshot && (
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
            <span className="text-white/50 text-sm">Rating</span>
            <span className="text-white font-bold">{eloSnapshot.newElo}</span>
            <span
              className={`text-sm font-semibold ${
                eloSnapshot.change > 0
                  ? "text-[#81b64c]"
                  : eloSnapshot.change < 0
                    ? "text-red-400"
                    : "text-white/40"
              }`}
            >
              ({eloSnapshot.change > 0 ? "+" : ""}{eloSnapshot.change})
            </span>
          </div>
        )}

        {canReview && onReview && (
          <button
            type="button"
            onClick={onReview}
            className="w-full mb-4 flex items-center justify-center gap-2 py-3 rounded-xl border border-[#22d3ee]/30 bg-[#22d3ee]/10 text-[#22d3ee] font-semibold text-sm hover:bg-[#22d3ee]/15 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Review Game — Brilliant moves &amp; blunders
          </button>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={onNewGame} className="btn-primary flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl">
            <RotateCcw className="w-4 h-4" /> Play Again
          </button>
          <button onClick={onMenu} className="btn-ghost flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl">
            <Home className="w-4 h-4" /> Main Menu
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
