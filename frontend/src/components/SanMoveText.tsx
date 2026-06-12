"use client";

import type { ReactNode } from "react";
import { lichessPieceUrl } from "@/lib/chess/lichessPieces";
import type { PieceColor } from "@/lib/chess/types";

interface SanMoveTextProps {
  san: string;
  color: PieceColor;
  className?: string;
}

function PieceIcon({ letter, color }: { letter: string; color: PieceColor }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={lichessPieceUrl(color, letter)}
      alt=""
      className="san-piece-icon"
      draggable={false}
    />
  );
}

/** Render SAN with inline Lichess piece SVGs instead of K/Q/B letters. */
export default function SanMoveText({ san, color, className }: SanMoveTextProps) {
  if (san.startsWith("O-O")) {
    return <span className={className}>{san}</span>;
  }

  const nodes: ReactNode[] = [];
  let rest = san;
  let key = 0;

  const lead = rest.match(/^([KQRBN])(.*)$/);
  if (lead) {
    nodes.push(<PieceIcon key={key++} letter={lead[1]} color={color} />);
    rest = lead[2];
  }

  const chunks = rest.split(/(=[KQRBN])/);
  for (const chunk of chunks) {
    if (!chunk) continue;
    const promo = chunk.match(/^=([KQRBN])$/);
    if (promo) {
      nodes.push(<span key={key++} className="san-text">=</span>);
      nodes.push(<PieceIcon key={key++} letter={promo[1]} color={color} />);
    } else {
      nodes.push(
        <span key={key++} className="san-text">
          {chunk}
        </span>
      );
    }
  }

  return <span className={`san-move ${className ?? ""}`.trim()}>{nodes}</span>;
}
