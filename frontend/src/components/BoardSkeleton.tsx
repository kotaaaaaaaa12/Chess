"use client";

export default function BoardSkeleton() {
  return (
    <div className="w-full aspect-square chess-board-wrap animate-pulse">
      <div className="chess-board-surface w-full h-full grid grid-cols-8 grid-rows-8">
        {Array.from({ length: 64 }, (_, i) => (
          <div key={i} className={(i + Math.floor(i / 8)) % 2 === 0 ? "bg-white/5" : "bg-white/10"} />
        ))}
      </div>
    </div>
  );
}
