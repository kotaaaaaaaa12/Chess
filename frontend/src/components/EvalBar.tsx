"use client";

import { motion } from "framer-motion";
import type { PositionEval } from "@/lib/chess/evalUtils";
import { evalToWhitePercent, formatEval } from "@/lib/chess/evalUtils";

interface EvalBarProps {
  eval: PositionEval;
  flipped: boolean;
  isLoading?: boolean;
}

export default function EvalBar({ eval: eval_, flipped, isLoading }: EvalBarProps) {
  const whitePercent = evalToWhitePercent(eval_);
  const label = formatEval(eval_);
  const whiteAdvantage = eval_.mate !== null ? eval_.mate > 0 : eval_.cp > 0;
  const showLabel = eval_.mate !== null || Math.abs(eval_.cp) >= 5;

  const whiteStyle = { height: `${whitePercent}%` };
  const blackStyle = { height: `${100 - whitePercent}%` };

  return (
    <div
      className={`eval-bar ${flipped ? "eval-bar--flipped" : ""} ${isLoading ? "eval-bar--loading" : ""}`}
      aria-label={`Position evaluation: ${label}`}
    >
      <div className="eval-bar__track">
        {flipped ? (
          <>
            <motion.div
              className="eval-bar__white"
              animate={whiteStyle}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
            <motion.div
              className="eval-bar__black"
              animate={blackStyle}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </>
        ) : (
          <>
            <motion.div
              className="eval-bar__black"
              animate={blackStyle}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
            <motion.div
              className="eval-bar__white"
              animate={whiteStyle}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </>
        )}

        {showLabel && (
          <motion.span
            key={label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`eval-bar__label ${whiteAdvantage ? "eval-bar__label--white" : "eval-bar__label--black"}`}
            style={{
              top: flipped
                ? `${Math.max(4, Math.min(96, 100 - whitePercent))}%`
                : `${Math.max(4, Math.min(96, whitePercent))}%`,
            }}
          >
            {label}
          </motion.span>
        )}
      </div>
    </div>
  );
}
