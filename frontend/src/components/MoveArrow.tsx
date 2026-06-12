"use client";

import { posToGrid } from "@/lib/chess/boardUtils";

interface MoveArrowProps {
  from: number;
  to: number;
  flipped: boolean;
  variant?: "last" | "hint";
}

export default function MoveArrow({ from, to, flipped, variant = "last" }: MoveArrowProps) {
  const isHint = variant === "hint";
  const stroke = isHint ? "rgba(212,168,83,0.85)" : "rgba(129,182,76,0.6)";
  const fill = isHint ? "rgba(212,168,83,0.9)" : "rgba(129,182,76,0.7)";
  const dotFill = isHint ? "rgba(212,168,83,0.7)" : "rgba(129,182,76,0.5)";
  const markerId = isHint ? "arrowhead-hint" : "arrowhead-last";
  const f = posToGrid(from);
  const t = posToGrid(to);

  const x1 = (f.col + 0.5) * 12.5;
  const y1 = (f.row + 0.5) * 12.5;
  const x2 = (t.col + 0.5) * 12.5;
  const y2 = (t.row + 0.5) * 12.5;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-[8]" viewBox="0 0 100 100">
      <defs>
        <marker id={markerId} markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
          <polygon points="0 0, 4 2, 0 4" fill={fill} />
        </marker>
      </defs>
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={stroke}
        strokeWidth={isHint ? "1.5" : "1.2"}
        markerEnd={`url(#${markerId})`}
      />
      <circle cx={x1} cy={y1} r={isHint ? "2" : "1.5"} fill={dotFill} />
      {isHint && <circle cx={x2} cy={y2} r="2.2" fill="none" stroke={stroke} strokeWidth="0.6" />}
    </svg>
  );
}
