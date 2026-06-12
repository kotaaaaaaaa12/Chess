"use client";

import { motion, useAnimation } from "framer-motion";
import { posToGrid } from "@/lib/chess/boardUtils";
import { getPieceSrc, isNeoPieceSet } from "@/lib/chess/pieceAssets";
import type { PieceSet } from "@/lib/settings/types";
import type { ChessPiece } from "@/lib/chess/types";

const MOVE_EASE = [0.25, 0.1, 0.25, 1] as const;

interface PieceVisualProps {
  piece: ChessPiece;
  flipped: boolean;
  pieceSet: PieceSet;
  lifted?: boolean;
  inCheck?: boolean;
}

function PieceVisual({ piece, flipped, pieceSet, lifted = false, inCheck = false }: PieceVisualProps) {
  const src = getPieceSrc(piece, pieceSet);
  const neo = isNeoPieceSet(pieceSet);

  return (
    <motion.div
      className={`piece-body ${inCheck ? "piece-in-check" : ""}`}
      animate={{ y: lifted ? -4 : 0, rotateZ: flipped ? 180 : 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <div className="piece-ground-shadow" />
      <div className={`piece-img-wrap ${neo ? "piece-img-wrap--neo" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className={neo ? "piece-neo-img" : "piece-classic-img"}
          draggable={false}
        />
      </div>
    </motion.div>
  );
}

export function MovingPieceOverlay({
  piece,
  from,
  to,
  flipped,
  durationMs,
  pieceSet = "neo",
  variant = "normal",
}: {
  piece: ChessPiece;
  from: number;
  to: number;
  flipped: boolean;
  durationMs: number;
  pieceSet?: PieceSet;
  variant?: "normal" | "castle";
}) {
  const fromG = posToGrid(from);
  const toG = posToGrid(to);
  const dur = durationMs / 1000;
  const isCastle = variant === "castle";

  return (
    <motion.div
      className="piece-float"
      initial={{
        left: `${fromG.col * 12.5}%`,
        top: `${fromG.row * 12.5}%`,
      }}
      animate={{
        left: `${toG.col * 12.5}%`,
        top: `${toG.row * 12.5}%`,
      }}
      transition={{ duration: dur, ease: MOVE_EASE }}
    >
      <motion.div
        className="piece-slot w-full h-full"
        animate={isCastle ? { y: 0 } : { y: [0, -8, 0] }}
        transition={
          isCastle
            ? { duration: dur, ease: MOVE_EASE }
            : { duration: dur, ease: MOVE_EASE, times: [0, 0.42, 1] }
        }
      >
        <PieceVisual piece={piece} flipped={flipped} pieceSet={pieceSet} />
      </motion.div>
    </motion.div>
  );
}

interface AnimatedPieceProps {
  piece: ChessPiece;
  flipped: boolean;
  pieceSet: PieceSet;
  selected: boolean;
  isHintPiece?: boolean;
  isBeingCaptured: boolean;
  isKingInCheck?: boolean;
  canDrag: boolean;
  canClick: boolean;
  onPieceClick: (pieceName: string) => void;
  onDragStart: (pieceName: string) => void;
  onDrag: (pieceName: string, clientX: number, clientY: number) => void;
  onDragEnd: (pieceName: string, clientX: number, clientY: number) => void;
}

export default function AnimatedPiece({
  piece,
  flipped,
  pieceSet,
  selected,
  isHintPiece = false,
  isBeingCaptured,
  isKingInCheck = false,
  canDrag,
  canClick,
  onPieceClick,
  onDragStart,
  onDrag,
  onDragEnd,
}: AnimatedPieceProps) {
  const controls = useAnimation();
  const interactive = canDrag || canClick;

  return (
    <motion.div
      className={`piece-slot ${interactive ? "pointer-events-auto" : "pointer-events-none"} ${canDrag ? "cursor-grab" : canClick ? "cursor-pointer" : ""} ${selected ? "is-selected" : ""} ${isHintPiece ? "is-hint-piece" : ""}`}
      style={{
        zIndex: selected ? 40 : isBeingCaptured ? 2 : 20,
        touchAction: canDrag ? "none" : "auto",
      }}
      initial={false}
      animate={controls}
      drag={canDrag}
      dragMomentum={false}
      dragElastic={0}
      dragListener={canDrag}
      onTap={() => { if (canClick) onPieceClick(piece.name); }}
      onDragStart={() => { if (canDrag) onDragStart(piece.name); }}
      onDrag={(_, info) => onDrag(piece.name, info.point.x, info.point.y)}
      onDragEnd={(_, info) => {
        onDragEnd(piece.name, info.point.x, info.point.y);
        controls.set({ x: 0, y: 0 });
      }}
      whileDrag={{
        scale: 1.1,
        zIndex: 100,
        cursor: "grabbing",
        transition: { duration: 0.08 },
      }}
      whileHover={canDrag ? { scale: 1.03 } : undefined}
    >
      <motion.div
        className="piece-inner"
        animate={{
          scale: isBeingCaptured ? 0.2 : 1,
          opacity: isBeingCaptured ? 0 : 1,
        }}
        transition={
          isBeingCaptured
            ? { duration: 0.2, delay: 0.08, ease: "easeIn" }
            : { duration: 0 }
        }
      >
        <PieceVisual
          piece={piece}
          flipped={flipped}
          pieceSet={pieceSet}
          lifted={selected}
          inCheck={isKingInCheck}
        />
      </motion.div>
    </motion.div>
  );
}
