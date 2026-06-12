"use client";

import { posToGrid } from "@/lib/chess/boardUtils";

export interface UserArrow {
  id: string;
  from: number;
  to: number;
  color: "green" | "red" | "yellow";
}

interface BoardArrowsProps {
  arrows: UserArrow[];
  flipped: boolean;
}

const COLORS: Record<UserArrow["color"], string> = {
  green: "rgba(129, 182, 76, 0.85)",
  red: "rgba(220, 80, 80, 0.85)",
  yellow: "rgba(220, 190, 60, 0.9)",
};

export default function BoardArrows({ arrows, flipped }: BoardArrowsProps) {
  if (arrows.length === 0) return null;

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-[9]" viewBox="0 0 100 100">
      <defs>
        {(["green", "red", "yellow"] as const).map((c) => (
          <marker
            key={c}
            id={`user-arrow-${c}`}
            markerWidth="3.5"
            markerHeight="3.5"
            refX="1.75"
            refY="1.75"
            orient="auto"
          >
            <polygon points="0 0, 3.5 1.75, 0 3.5" fill={COLORS[c]} />
          </marker>
        ))}
      </defs>
      {arrows.map((a) => {
        const f = posToGrid(a.from);
        const t = posToGrid(a.to);
        const x1 = (f.col + 0.5) * 12.5;
        const y1 = (f.row + 0.5) * 12.5;
        const x2 = (t.col + 0.5) * 12.5;
        const y2 = (t.row + 0.5) * 12.5;
        const stroke = COLORS[a.color];
        const isDot = a.from === a.to;

        if (isDot) {
          return (
            <circle
              key={a.id}
              cx={x1}
              cy={y1}
              r="2.2"
              fill="none"
              stroke={stroke}
              strokeWidth="1"
            />
          );
        }

        return (
          <line
            key={a.id}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={stroke}
            strokeWidth="1.4"
            markerEnd={`url(#user-arrow-${a.color})`}
          />
        );
      })}
    </svg>
  );
}
