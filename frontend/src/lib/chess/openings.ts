import { buildAlgebraicMoveLog } from "./algebraic";
import type { MoveRecord } from "./types";

/** Longest-prefix opening names (SAN tokens, no check/mate suffix) */
const OPENINGS: [string, string][] = [
  ["e4", "King's Pawn Game"],
  ["d4", "Queen's Pawn Game"],
  ["Nf3", "Réti Opening"],
  ["c4", "English Opening"],
  ["e4 e5", "Open Game"],
  ["e4 c5", "Sicilian Defense"],
  ["e4 e6", "French Defense"],
  ["e4 c6", "Caro-Kann Defense"],
  ["e4 d5", "Scandinavian Defense"],
  ["d4 d5", "Closed Game"],
  ["d4 Nf6", "Indian Defense"],
  ["e4 e5 Nf3", "King's Knight Opening"],
  ["e4 e5 Nf3 Nc6", "Classical King's Pawn"],
  ["e4 e5 Nf3 Nc6 Bb5", "Ruy López"],
  ["e4 e5 Nf3 Nc6 Bc4", "Italian Game"],
  ["e4 e5 Nf3 Nc6 Bc4 Bc5", "Giuoco Piano"],
  ["e4 e5 Nf3 Nc6 Bc4 Nf6", "Two Knights Defense"],
  ["e4 e5 Nf3 Nf6", "Petrov's Defense"],
  ["e4 c5 Nf3", "Sicilian Defense"],
  ["e4 c5 Nf3 d6", "Sicilian Najdorf"],
  ["e4 c5 Nf3 Nc6", "Sicilian Open"],
  ["e4 c5 Nf3 e6", "Sicilian Scheveningen"],
  ["e4 e6 d4", "French Defense"],
  ["e4 e6 d4 d5", "French Classical"],
  ["e4 c6 d4", "Caro-Kann Defense"],
  ["e4 c6 d4 d5", "Caro-Kann Main Line"],
  ["d4 Nf6 c4", "Indian Game"],
  ["d4 Nf6 c4 e6", "Nimzo-Indian / Queen's Indian"],
  ["d4 Nf6 c4 g6", "King's Indian Defense"],
  ["d4 d5 c4", "Queen's Gambit"],
  ["d4 d5 c4 e6", "Queen's Gambit Declined"],
  ["d4 d5 c4 c6", "Slav Defense"],
  ["d4 d5 Nf3", "Queen's Pawn Game"],
  ["Nf3 d5", "Réti / Zukertort"],
  ["c4 e5", "English Reversed Sicilian"],
  ["c4 Nf6", "English Indian"],
];

function stripSuffix(san: string): string {
  return san.replace(/[+#]$/, "").replace(/=[NBRQnbrq]$/, "");
}

function buildMoveKey(history: MoveRecord[][]): string {
  const log = buildAlgebraicMoveLog(history);
  const tokens: string[] = [];
  log.forEach((e) => {
    if (e.white) tokens.push(stripSuffix(e.white));
    if (e.black) tokens.push(stripSuffix(e.black));
  });
  return tokens.join(" ");
}

export interface OpeningInfo {
  name: string;
  recognized: boolean;
}

export function getOpeningInfo(history: MoveRecord[][]): OpeningInfo {
  if (history.length === 0) {
    return { name: "Starting Position", recognized: true };
  }

  const key = buildMoveKey(history);
  let best: string | null = null;
  let bestLen = 0;

  for (const [prefix, name] of OPENINGS) {
    if (key === prefix || key.startsWith(prefix + " ")) {
      if (prefix.length > bestLen) {
        bestLen = prefix.length;
        best = name;
      }
    }
  }

  if (best) return { name: best, recognized: true };
  if (history.length < 2) {
    return { name: "Opening — not classified yet", recognized: false };
  }
  return { name: "Unknown Opening", recognized: false };
}

export function getOpeningName(history: MoveRecord[][]): string {
  return getOpeningInfo(history).name;
}
