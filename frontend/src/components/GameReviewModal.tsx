"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import ChessBoard from "./ChessBoard";
import SanMoveText from "./SanMoveText";
import {
  analyzeGame,
  CLASSIFICATION_META,
  type ReviewedMove,
} from "@/lib/chess/gameReview";
import { getCastleRookAnimation } from "@/lib/chess/castleAnimation";
import { getMainMove, replayToPly } from "@/lib/chess/replay";
import { useSettings } from "@/context/SettingsContext";
import { ANIMATION_MS } from "@/lib/settings/types";
import type { MoveAnimation } from "@/lib/chess/useChessGame";
import type { ChessPiece, MoveRecord, PieceColor } from "@/lib/chess/types";

interface GameReviewModalProps {
  open: boolean;
  history: MoveRecord[][];
  humanColor: PieceColor;
  onClose: () => void;
}

export default function GameReviewModal({
  open, history, humanColor, onClose,
}: GameReviewModalProps) {
  const { settings } = useSettings();
  const moveDuration = ANIMATION_MS[settings.animationSpeed];
  const [moves, setMoves] = useState<ReviewedMove[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [renderPly, setRenderPly] = useState(0);
  const [animating, setAnimating] = useState<MoveAnimation | null>(null);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAnimTimer = useCallback(() => {
    if (animTimerRef.current) {
      clearTimeout(animTimerRef.current);
      animTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open || history.length === 0) return;
    setLoading(true);
    setError(null);
    setMoves([]);
    setSelectedIdx(0);
    setRenderPly(0);
    setAnimating(null);
    setProgress({ done: 0, total: 0 });

    analyzeGame(history, humanColor, (done, total) => {
      setProgress({ done, total });
    })
      .then(setMoves)
      .catch(() => setError("Analysis failed. Try again."))
      .finally(() => setLoading(false));
  }, [open, history, humanColor]);

  useEffect(() => () => clearAnimTimer(), [clearAnimTimer]);

  const selected = moves[selectedIdx] ?? null;
  const targetPly = selected?.ply ?? 0;

  useEffect(() => {
    if (!open || loading || !selected || targetPly === renderPly) return;

    clearAnimTimer();
    setAnimating(null);

    if (targetPly < renderPly) {
      setRenderPly(targetPly);
      return;
    }

    const step = history[targetPly - 1];
    const main = step ? getMainMove(step) : null;
    if (!main) {
      setRenderPly(targetPly);
      return;
    }

    const kingPiece: ChessPiece = { ...main.piece, position: main.from };
    const castleRook =
      main.castling && main.piece.rank === "king"
        ? getCastleRookAnimation(kingPiece, main.to) ?? undefined
        : undefined;

    setAnimating({
      pieceName: main.piece.name,
      from: main.from,
      to: main.to,
      castleRook,
    });

    animTimerRef.current = setTimeout(() => {
      setAnimating(null);
      setRenderPly(targetPly);
    }, moveDuration);
  }, [
    open,
    loading,
    selected,
    targetPly,
    renderPly,
    history,
    moveDuration,
    clearAnimTimer,
  ]);

  const displayPly = animating ? Math.max(0, targetPly - 1) : renderPly;

  const boardState = useMemo(() => {
    if (!selected) return null;
    return replayToPly(history, displayPly);
  }, [selected, history, displayPly]);

  const squareHighlights = useMemo(() => {
    if (!selected || animating) return undefined;
    const meta = CLASSIFICATION_META[selected.classification];
    const color = meta.color;
    return {
      [selected.from]: `${color}88`,
      [selected.to]: color,
    };
  }, [selected, animating]);

  const flipped = humanColor === "black";

  const goTo = useCallback((idx: number) => {
    clearAnimTimer();
    setAnimating(null);
    setSelectedIdx(idx);
  }, [clearAnimTimer]);

  if (!open) return null;

  const counts = moves.reduce<Record<string, number>>((acc, m) => {
    acc[m.classification] = (acc[m.classification] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="modal-shell bg-black/85 backdrop-blur-md z-[55]"
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        className="modal-panel glass-panel rounded-xl review-modal w-full max-w-4xl p-4 sm:p-5 my-auto max-h-[92vh] flex flex-col"
      >
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#22d3ee]" />
            <h2 className="text-lg font-bold text-white">Game Review</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading && (
          <div className="flex flex-col items-center py-12 gap-3">
            <Loader2 className="w-8 h-8 text-[#81b64c] animate-spin" />
            <p className="text-white/60 text-sm">Analyzing your moves with Stockfish...</p>
            {progress.total > 0 && (
              <p className="text-white/40 text-xs">{progress.done} / {progress.total}</p>
            )}
          </div>
        )}

        {error && <p className="text-red-400 text-sm text-center py-8">{error}</p>}

        {!loading && !error && moves.length > 0 && boardState && selected && (
          <div className="review-modal__layout flex-1 min-h-0">
            <div className="review-modal__board-col">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selected.ply}
                  initial={{ opacity: 0.6, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0.6, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="review-classification-badge"
                  style={{
                    borderColor: `${CLASSIFICATION_META[selected.classification].color}44`,
                    color: CLASSIFICATION_META[selected.classification].color,
                  }}
                >
                  <span className="text-lg font-bold">
                    {CLASSIFICATION_META[selected.classification].emoji}
                  </span>
                  <span className="font-semibold">
                    {CLASSIFICATION_META[selected.classification].label}
                  </span>
                  <SanMoveText san={selected.san} color={selected.color} className="text-white/70" />
                  {selected.cpLoss > 0 && (
                    <span className="text-white/35 text-xs ml-auto">-{selected.cpLoss}cp</span>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="review-board-wrap">
                <ChessBoard
                  pieces={boardState.pieces}
                  turn={boardState.turn}
                  selectedPiece={null}
                  allowedMoves={[]}
                  lastMove={animating ? null : boardState.lastMove}
                  flipped={flipped}
                  inCheck={boardState.inCheck}
                  animating={animating}
                  moveDurationMs={moveDuration}
                  canInteract={false}
                  theme={settings.theme}
                  pieceSet={settings.pieceSet}
                  showMoveArrow={!animating}
                  squareHighlights={squareHighlights}
                  onSquareClick={() => {}}
                  onPieceSelect={() => {}}
                  onPieceDrop={() => {}}
                />
              </div>

              <div className="review-nav">
                <button
                  type="button"
                  disabled={selectedIdx <= 0}
                  onClick={() => goTo(Math.max(0, selectedIdx - 1))}
                  className="review-nav__btn"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-white/50">
                  Move {selectedIdx + 1} of {moves.length}
                </span>
                <button
                  type="button"
                  disabled={selectedIdx >= moves.length - 1}
                  onClick={() => goTo(Math.min(moves.length - 1, selectedIdx + 1))}
                  className="review-nav__btn"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="review-modal__moves-col">
              <div className="flex flex-wrap gap-1.5 mb-3 shrink-0">
                {(["brilliant", "great", "best", "mistake", "blunder"] as const).map((k) =>
                  counts[k] ? (
                    <span
                      key={k}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: `${CLASSIFICATION_META[k].color}22`,
                        color: CLASSIFICATION_META[k].color,
                      }}
                    >
                      {counts[k]} {CLASSIFICATION_META[k].label}
                    </span>
                  ) : null
                )}
              </div>

              <div className="custom-scroll overflow-y-auto flex-1 min-h-0 space-y-1">
                {moves.map((m, idx) => {
                  const meta = CLASSIFICATION_META[m.classification];
                  const active = idx === selectedIdx;
                  return (
                    <button
                      key={m.ply}
                      type="button"
                      onClick={() => goTo(idx)}
                      className={`review-move-btn w-full ${active ? "review-move-btn--active" : ""}`}
                    >
                      <span className="text-white/25 text-xs w-6 shrink-0">{m.moveNumber}.</span>
                      <span className="text-sm text-white/90 min-w-[2.5rem] shrink-0 text-left">
                        <SanMoveText san={m.san} color={m.color} />
                      </span>
                      <span className="text-xs font-bold shrink-0" style={{ color: meta.color }}>
                        {meta.emoji} {meta.label}
                      </span>
                      {m.cpLoss > 0 && (
                        <span className="text-white/25 text-xs ml-auto">-{m.cpLoss}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {!loading && !error && moves.length === 0 && (
          <p className="text-white/40 text-sm text-center py-8">No moves to review.</p>
        )}
      </motion.div>
    </motion.div>
  );
}
