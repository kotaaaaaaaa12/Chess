"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, SkipBack, SkipForward } from "lucide-react";
import ChessBoard from "./ChessBoard";
import { replayToPly } from "@/lib/chess/replay";
import { useSettings } from "@/context/SettingsContext";
import type { GameDetail } from "@/lib/games/types";
import type { PieceColor } from "@/lib/chess/types";

interface GameReplayModalProps {
  open: boolean;
  game: GameDetail | null;
  onClose: () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function opponentLabel(game: GameDetail) {
  if (game.playAgainst === "online") return game.opponentName ?? "Opponent";
  if (game.playAgainst === "human") return "vs Human";
  const engine = game.playAgainst === "stockfish" ? "Stockfish" : "Minimax";
  return `${engine} · ${game.aiDifficulty ?? "medium"}`;
}

export default function GameReplayModal({ open, game, onClose }: GameReplayModalProps) {
  const { settings } = useSettings();
  const [ply, setPly] = useState(0);

  const humanColor = game?.humanColor ?? "white";
  const maxPly = game?.history.length ?? 0;

  useEffect(() => {
    if (open) setPly(0);
  }, [open, game?.id]);

  const boardState = useMemo(() => {
    if (!game || maxPly === 0) return null;
    return replayToPly(game.history, ply);
  }, [game, ply, maxPly]);

  if (!open || !game || !boardState) return null;

  const lastMove =
    ply > 0
      ? (() => {
          const step = game.history[ply - 1];
          const main = step?.find(
            (s) => s.from !== 0 && s.to !== 0 && !(s.castling && s.piece.rank === "rook")
          );
          return main ? { from: main.from, to: main.to } : null;
        })()
      : null;

  const goTo = (next: number) => setPly(Math.max(0, Math.min(maxPly, next)));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="modal-shell bg-black/85 backdrop-blur-md z-[55]"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="replay-modal"
      >
        <div className="replay-modal__header">
          <div className="min-w-0">
            <h2 className="replay-modal__title">Game Replay</h2>
            <p className="replay-modal__meta">
              {formatDate(game.playedAt)} · {opponentLabel(game)} ·{" "}
              <span className="capitalize">{game.result}</span>
              {game.openingName ? ` · ${game.openingName}` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-icon">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="replay-modal__body">
          <div className="replay-modal__board">
            <ChessBoard
              pieces={boardState.pieces}
              turn={boardState.turn}
              selectedPiece={null}
              allowedMoves={[]}
              lastMove={lastMove}
              flipped={humanColor === "black"}
              inCheck={boardState.inCheck}
              animating={null}
              canInteract={false}
              theme={settings.theme}
              pieceSet={settings.pieceSet}
              showMoveArrow={settings.showMoveArrow}
              onSquareClick={() => {}}
              onPieceSelect={() => {}}
              onPieceDrop={() => {}}
            />
          </div>

          <div className="replay-modal__controls">
            <div className="replay-modal__ply">
              Move {ply} / {maxPly}
            </div>
            <div className="replay-modal__buttons">
              <button type="button" onClick={() => goTo(0)} className="replay-modal__btn" title="Start">
                <SkipBack className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => goTo(ply - 1)} disabled={ply <= 0} className="replay-modal__btn">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button type="button" onClick={() => goTo(ply + 1)} disabled={ply >= maxPly} className="replay-modal__btn">
                <ChevronRight className="w-5 h-5" />
              </button>
              <button type="button" onClick={() => goTo(maxPly)} className="replay-modal__btn" title="End">
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
