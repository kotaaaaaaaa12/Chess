"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpCircle } from "lucide-react";
import type { PieceColor, PieceRank } from "@/lib/chess/types";

const PROMOTION_PIECES: { rank: PieceRank; label: string }[] = [
  { rank: "queen", label: "Queen" },
  { rank: "rook", label: "Rook" },
  { rank: "bishop", label: "Bishop" },
  { rank: "knight", label: "Knight" },
];

interface PromotionModalProps {
  color: PieceColor;
  onSelect: (rank: PieceRank) => void;
}

export default function PromotionModal({ color, onSelect }: PromotionModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="modal-shell bg-black/70 backdrop-blur-md z-50"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="modal-panel glass-panel rounded-2xl p-6 sm:p-8 max-w-sm my-auto"
      >
        <div className="flex items-center justify-center gap-2 mb-6">
          <ArrowUpCircle className="w-5 h-5 text-[#d4a853]" />
          <h3 className="text-white font-semibold text-lg">Promote Your Pawn</h3>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {PROMOTION_PIECES.map(({ rank, label }, i) => (
            <motion.button
              key={rank}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSelect(rank)}
              className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10
                hover:border-[#d4a853]/50 hover:bg-[#d4a853]/10 transition-all duration-200"
            >
              <div className="relative w-12 h-12 group-hover:scale-110 transition-transform">
                <Image
                  src={`/img/${color}-${rank}.svg`}
                  alt={label}
                  fill
                  className="object-contain drop-shadow-md"
                />
              </div>
              <span className="text-[10px] text-white/50 group-hover:text-[#d4a853] transition-colors">
                {label}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
