"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

export default function ConfettiCelebration({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;
    const duration = 2500;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ["#81b64c", "#d4a853", "#ffffff"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["#81b64c", "#d4a853", "#ffffff"],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [active]);
  return null;
}
