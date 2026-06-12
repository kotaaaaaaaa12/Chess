"use client";

import { History } from "lucide-react";
import { lichessPawnUrl } from "@/lib/chess/lichessPieces";
import SanMoveText from "./SanMoveText";
import type { MoveLogEntry } from "@/lib/chess/useChessGame";

interface MoveListProps {
  moveLog: MoveLogEntry[];
  activePly: number | null;
  onGotoMove: (ply: number) => void;
  onExitReview?: () => void;
  inReview?: boolean;
  compact?: boolean;
}

function MoveCell({
  san,
  color,
  ply,
  activePly,
  onGotoMove,
}: {
  san: string;
  color: "white" | "black";
  ply: number;
  activePly: number | null;
  onGotoMove: (ply: number) => void;
}) {
  const displayPly = ply + 1;
  const isActive = activePly === displayPly;

  return (
    <button
      type="button"
      onClick={() => onGotoMove(displayPly)}
      className={`move-list-cell move-list-cell--${color} ${isActive ? "is-active" : ""}`}
    >
      <SanMoveText san={san} color={color} />
    </button>
  );
}

function ColumnHeader({ color, label }: { color: "white" | "black"; label: string }) {
  return (
  <span className="move-list-table__col-label">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={lichessPawnUrl(color)}
        alt=""
        className="move-list-table__header-piece"
        draggable={false}
      />
      {label}
    </span>
  );
}

export default function MoveList({
  moveLog, activePly, onGotoMove, onExitReview, inReview, compact,
}: MoveListProps) {
  return (
    <div className={`move-list-panel ${compact ? "move-list-panel--compact" : ""}`}>
      <div className="move-list-panel__head">
        <History className="w-3.5 h-3.5 text-[var(--accent)]" />
        <span>Moves</span>
        {inReview && onExitReview && (
          <button type="button" onClick={onExitReview} className="move-list-panel__back">
            Live game
          </button>
        )}
      </div>
      {!compact && (
        <p className="text-[10px] text-white/20 px-3 py-1 border-b border-white/5">
          Right-drag arrows · Shift=red · Alt=yellow · Esc=clear
        </p>
      )}
      <div className="move-list-panel__body custom-scroll">
        {moveLog.length === 0 ? (
          <p className="text-white/15 text-xs italic px-1">No moves yet</p>
        ) : (
          <table className="move-list-table">
            <thead>
              <tr>
                <th className="move-list-table__num" />
                <th className="move-list-table__col move-list-table__col--white">
                  <ColumnHeader color="white" label="White" />
                </th>
                <th className="move-list-table__col move-list-table__col--black">
                  <ColumnHeader color="black" label="Black" />
                </th>
              </tr>
            </thead>
            <tbody>
              {moveLog.map((e) => (
                <tr key={e.moveNumber}>
                  <td className="move-list-table__num">{e.moveNumber}.</td>
                  <td className="move-list-table__cell">
                    {e.white && e.whitePly !== undefined ? (
                      <MoveCell
                        san={e.white}
                        color="white"
                        ply={e.whitePly}
                        activePly={activePly}
                        onGotoMove={onGotoMove}
                      />
                    ) : (
                      <span className="move-list-cell move-list-cell--empty">…</span>
                    )}
                  </td>
                  <td className="move-list-table__cell">
                    {e.black && e.blackPly !== undefined ? (
                      <MoveCell
                        san={e.black}
                        color="black"
                        ply={e.blackPly}
                        activePly={activePly}
                        onGotoMove={onGotoMove}
                      />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
