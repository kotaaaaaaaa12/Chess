"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

const STEPS = [
  { title: "Welcome to Chess Master!", body: "Play against AI or a friend. Drag pieces or click to move. Let's learn the basics." },
  { title: "How to Move", body: "Click your piece to see legal moves (green dots). Click a highlighted square to move. Or drag & drop pieces directly." },
  { title: "Capturing", body: "Move onto an enemy piece to capture it. Captured pieces appear in the player bar." },
  { title: "Special Moves", body: "Castling: move King 2 squares toward Rook. Promotion: Pawn reaching last rank becomes Queen (or choose piece)." },
  { title: "Check & Checkmate", body: "If your King is under attack, you're in Check — must escape. No escape? Checkmate — you lose!" },
  { title: "Timer & Controls", body: "Use keyboard: U=Undo, F=Flip, R=Resign, H=Hint, D=Draw offer. Open Settings for themes and sounds." },
];

interface TutorialProps {
  open: boolean;
  onClose: () => void;
}

export default function Tutorial({ open, onClose }: TutorialProps) {
  const [step, setStep] = useState(0);
  if (!open) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="modal-shell bg-black/80 z-[70]">
      <motion.div className="modal-panel glass-panel rounded-xl max-w-lg p-6 my-auto">
        <div className="flex justify-between items-center mb-4">
          <span className="text-white/40 text-xs">Step {step + 1}/{STEPS.length}</span>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h3 className="text-xl font-bold text-white mb-3">{STEPS[step].title}</h3>
            <p className="text-white/60 leading-relaxed">{STEPS[step].body}</p>
          </motion.div>
        </AnimatePresence>
        <div className="flex justify-between mt-6">
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
            className="btn-ghost px-4 py-2 rounded-lg text-sm flex items-center gap-1 disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(step + 1)} className="btn-primary px-4 py-2 rounded-lg text-sm flex items-center gap-1">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={onClose} className="btn-primary px-6 py-2 rounded-lg text-sm">Got it!</button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
