"use client";

import { useEffect, useRef, useState } from "react";
import type { PositionEval } from "@/lib/chess/evalUtils";
import { requestEval } from "@/lib/chess/stockfishEngine";

const DEFAULT_EVAL: PositionEval = { cp: 0, mate: null };

export function usePositionEval(fen: string | null, enabled: boolean) {
  const [eval_, setEval] = useState<PositionEval>(DEFAULT_EVAL);
  const [isLoading, setIsLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (!enabled || !fen) {
      setEval(DEFAULT_EVAL);
      setIsLoading(false);
      return;
    }

    const id = ++requestId.current;
    setIsLoading(true);

    const timer = setTimeout(() => {
      requestEval(fen)
        .then((result) => {
          if (requestId.current === id) {
            setEval(result);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (requestId.current === id) {
            setEval(DEFAULT_EVAL);
            setIsLoading(false);
          }
        });
    }, 350);

    return () => clearTimeout(timer);
  }, [fen, enabled]);

  return { eval: eval_, isLoading };
}
