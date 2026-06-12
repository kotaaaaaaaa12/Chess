"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import AnimatedPiece, { MovingPieceOverlay } from "./AnimatedPiece";
import BoardArrows, { type UserArrow } from "./BoardArrows";
import { pointToPosition, posToGrid, gridToStyle } from "@/lib/chess/boardUtils";
import MoveArrow from "./MoveArrow";
import type { BoardTheme, PieceSet } from "@/lib/settings/types";
import type { ChessPiece, PieceColor, HintMove } from "@/lib/chess/types";
import type { MoveAnimation } from "@/lib/chess/useChessGame";

interface ChessBoardProps {
  pieces: ChessPiece[];
  turn: PieceColor;
  selectedPiece: string | null;
  allowedMoves: number[];
  lastMove: { from: number; to: number } | null;
  flipped: boolean;
  inCheck: PieceColor | null;
  animating: MoveAnimation | null;
  moveDurationMs?: number;
  canInteract: boolean;
  moveCount?: number;
  squareHighlights?: Record<number, string>;
  threatSquares?: number[];
  theme?: BoardTheme;
  pieceSet?: PieceSet;
  showMoveArrow?: boolean;
  hint?: HintMove | null;
  onSquareClick: (position: number) => void;
  onPieceSelect: (pieceName: string) => void;
  onPieceDrop: (pieceName: string, position: number) => void;
}

const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

function posToSquare(rank: number, file: number) {
  return rank * 10 + file;
}

let arrowId = 0;

export default function ChessBoard({
  pieces,
  turn,
  selectedPiece,
  allowedMoves,
  lastMove,
  flipped,
  inCheck,
  animating,
  moveDurationMs = 280,
  canInteract,
  moveCount = 0,
  squareHighlights,
  threatSquares = [],
  onSquareClick,
  onPieceSelect,
  onPieceDrop,
  theme = "marble",
  pieceSet = "neo",
  showMoveArrow = true,
  hint = null,
}: ChessBoardProps) {
  const boardInnerRef = useRef<HTMLDivElement>(null);
  const rightDragRef = useRef(false);
  const [hoverSquare, setHoverSquare] = useState<number | null>(null);
  const [userArrows, setUserArrows] = useState<UserArrow[]>([]);
  const [drawingArrow, setDrawingArrow] = useState<{
    from: number;
    to: number;
    color: UserArrow["color"];
  } | null>(null);

  const ranks = RANKS;
  const files = FILES;

  const checkedKingPos = inCheck
    ? pieces.find((p) => p.rank === "king" && p.color === inCheck)?.position
    : null;

  const canMovePiece = (piece: ChessPiece) => {
    if (!canInteract) return false;
    return piece.color === turn;
  };

  const squares: { position: number; rank: number; file: string; ri: number; fi: number }[] = [];
  ranks.forEach((rank, ri) => {
    files.forEach((file, fi) => {
      squares.push({ position: posToSquare(rank, fi + 1), rank, file, ri, fi });
    });
  });

  const posFromPointer = useCallback((clientX: number, clientY: number) => {
    const rect = boardInnerRef.current?.getBoundingClientRect();
    if (!rect) return -1;
    return pointToPosition(rect, clientX, clientY, flipped);
  }, [flipped]);

  const handleDrag = (pieceName: string, clientX: number, clientY: number) => {
    const pos = posFromPointer(clientX, clientY);
    setHoverSquare(pos > 0 ? pos : null);
  };

  const handleDragEnd = (pieceName: string, clientX: number, clientY: number) => {
    setHoverSquare(null);
    const position = posFromPointer(clientX, clientY);
    if (position > 0) onPieceDrop(pieceName, position);
  };

  const finishArrowDraw = useCallback((from: number, to: number, color: UserArrow["color"]) => {
    if (from <= 0 || to <= 0) return;
    setUserArrows((prev) => {
      const idx = prev.findIndex((a) => a.from === from && a.to === to);
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      return [...prev, { id: `arrow-${++arrowId}`, from, to, color }];
    });
  }, []);

  const handleBoardPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 2) return;
    e.preventDefault();
    const pos = posFromPointer(e.clientX, e.clientY);
    if (pos <= 0) return;
    rightDragRef.current = true;
    const color: UserArrow["color"] = e.shiftKey ? "red" : e.altKey ? "yellow" : "green";
    setDrawingArrow({ from: pos, to: pos, color });
    boardInnerRef.current?.setPointerCapture(e.pointerId);
  };

  const handleBoardPointerMove = (e: React.PointerEvent) => {
    if (!drawingArrow || !rightDragRef.current) return;
    const pos = posFromPointer(e.clientX, e.clientY);
    if (pos > 0) setDrawingArrow((a) => (a ? { ...a, to: pos } : null));
  };

  const endArrowDraw = () => {
    if (!drawingArrow || !rightDragRef.current) return;
    rightDragRef.current = false;
    finishArrowDraw(drawingArrow.from, drawingArrow.to, drawingArrow.color);
    setDrawingArrow(null);
  };

  const handleBoardPointerUp = (e: React.PointerEvent) => {
    if (!rightDragRef.current) return;
    e.preventDefault();
    boardInnerRef.current?.releasePointerCapture(e.pointerId);
    endArrowDraw();
  };

  const handlePointerCancel = () => {
    rightDragRef.current = false;
    setDrawingArrow(null);
  };

  const handleContextMenu = (e: React.MouseEvent) => e.preventDefault();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUserArrows([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setUserArrows([]);
  }, [moveCount]);

  const displayArrows = drawingArrow
    ? [
        ...userArrows,
        {
          id: "drawing",
          from: drawingArrow.from,
          to: drawingArrow.to,
          color: drawingArrow.color,
        },
      ]
    : userArrows;

  return (
    <div className="w-full select-none" data-board-theme={theme}>
      <motion.div
        animate={{ rotate: flipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="chess-board-wrap"
      >
        <div
          ref={boardInnerRef}
          className="chess-board-surface relative aspect-square w-full"
          onContextMenu={handleContextMenu}
          onPointerDown={handleBoardPointerDown}
          onPointerMove={handleBoardPointerMove}
          onPointerUp={handleBoardPointerUp}
          onPointerCancel={handlePointerCancel}
        >
          <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 z-[1]">
            {squares.map(({ position, rank, file, ri, fi }) => {
              const isLight = (ri + fi) % 2 === 0;
              const piece = pieces.find((p) => p.position === position);
              const isSelected = piece?.name === selectedPiece;
              const isAllowed = allowedMoves.includes(position);
              const showMoveHint = isAllowed && !!selectedPiece;
              const isHoverTarget = hoverSquare === position && isAllowed;
              const isLastFrom = lastMove?.from === position;
              const isLastTo = lastMove?.to === position;
              const isKingInCheck = checkedKingPos === position;
              const isHintFrom = hint?.from === position;
              const isHintTo = hint?.position === position;
              const isThreatened = threatSquares.includes(position);
              const showRank = fi === 0;
              const showFile = ri === ranks.length - 1;
              const coordColor = isLight ? "sq-coord-on-light" : "sq-coord-on-dark";
              const highlight = squareHighlights?.[position];

              return (
                <button
                  key={position}
                  type="button"
                  disabled={!canInteract}
                  onClick={() => onSquareClick(position)}
                  style={highlight ? { boxShadow: `inset 0 0 0 3px ${highlight}` } : undefined}
                  className={`
                    relative outline-none
                    ${isLight ? "sq-light" : "sq-dark"}
                    ${isLastFrom && !isSelected && !isKingInCheck ? "sq-last-from" : ""}
                    ${isLastTo && !isSelected && !isKingInCheck ? "sq-last-to" : ""}
                    ${isSelected ? "sq-selected" : ""}
                    ${showMoveHint ? "sq-move-hint" : ""}
                    ${isHoverTarget ? "sq-hover-target" : ""}
                    ${isKingInCheck ? "sq-check" : ""}
                    ${isHintFrom ? "sq-hint-from" : ""}
                    ${isHintTo ? "sq-hint-to" : ""}
                    ${isThreatened && !isSelected ? "sq-threat" : ""}
                    ${canInteract ? "cursor-pointer" : "cursor-default"}
                  `}
                >
                  {showRank && (
                    <span className={`sq-coord absolute top-[3px] left-[4px] ${coordColor} ${flipped ? "rotate-180" : ""}`}>
                      {rank}
                    </span>
                  )}
                  {showFile && (
                    <span className={`sq-coord absolute bottom-[3px] right-[4px] ${coordColor} ${flipped ? "rotate-180" : ""}`}>
                      {file}
                    </span>
                  )}

                  {showMoveHint && !piece && (
                    <div className="move-hint-wrap">
                      <div className="move-hint-dot" />
                    </div>
                  )}
                  {showMoveHint && piece && piece.name !== selectedPiece && (
                    <div className="move-hint-capture" />
                  )}
                </button>
              );
            })}
          </div>

          <BoardArrows arrows={displayArrows} flipped={flipped} />

          {showMoveArrow && lastMove && (
            <MoveArrow from={lastMove.from} to={lastMove.to} flipped={flipped} variant="last" />
          )}
          {hint && (
            <MoveArrow from={hint.from} to={hint.position} flipped={flipped} variant="hint" />
          )}

          <div className="absolute inset-0 z-[10] grid grid-cols-8 grid-rows-8 pointer-events-none">
            {pieces.map((piece) => {
              if (
                animating?.pieceName === piece.name ||
                animating?.castleRook?.pieceName === piece.name
              ) return null;

              const { row, col } = posToGrid(piece.position);
              const { gridRow, gridColumn } = gridToStyle(row, col);

              return (
                <div
                  key={piece.name}
                  className="piece-cell"
                  style={{ gridRow, gridColumn }}
                >
                  <AnimatedPiece
                    piece={piece}
                    flipped={flipped}
                    pieceSet={pieceSet}
                    selected={piece.name === selectedPiece}
                    isHintPiece={hint?.pieceName === piece.name}
                    isBeingCaptured={animating?.capturedName === piece.name}
                    isKingInCheck={checkedKingPos === piece.position}
                    canDrag={canMovePiece(piece)}
                    canClick={canMovePiece(piece)}
                    onPieceClick={(name) => {
                      const p = pieces.find((x) => x.name === name);
                      if (p) onSquareClick(p.position);
                    }}
                    onDragStart={onPieceSelect}
                    onDrag={handleDrag}
                    onDragEnd={handleDragEnd}
                  />
                </div>
              );
            })}
          </div>

          {animating && (() => {
            const moving = pieces.find((p) => p.name === animating.pieceName);
            const castleRook = animating.castleRook
              ? pieces.find((p) => p.name === animating.castleRook!.pieceName)
              : null;
            if (!moving) return null;
            const castleVariant = animating.castleRook ? "castle" as const : "normal" as const;
            return (
              <>
                <MovingPieceOverlay
                  piece={moving}
                  from={animating.from}
                  to={animating.to}
                  flipped={flipped}
                  durationMs={moveDurationMs}
                  pieceSet={pieceSet}
                  variant={castleVariant}
                />
                {castleRook && animating.castleRook && (
                  <MovingPieceOverlay
                    piece={castleRook}
                    from={animating.castleRook.from}
                    to={animating.castleRook.to}
                    flipped={flipped}
                    durationMs={moveDurationMs}
                    pieceSet={pieceSet}
                    variant="castle"
                  />
                )}
              </>
            );
          })()}
        </div>
      </motion.div>
    </div>
  );
}
