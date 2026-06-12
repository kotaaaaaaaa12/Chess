import { moveToAlgebraic } from "./algebraic";
import type { MoveRecord } from "./types";

export function exportPGN(
  history: MoveRecord[][],
  whiteName = "White",
  blackName = "Black",
  result = "*"
): string {
  const headers = [
    `[Event "Chess Master"]`,
    `[Site "Local"]`,
    `[Date "${new Date().toISOString().slice(0, 10).replace(/-/g, ".")}"]`,
    `[White "${whiteName}"]`,
    `[Black "${blackName}"]`,
    `[Result "${result}"]`,
    "",
  ].join("\n");

  let moves = "";
  let moveNum = 1;

  history.forEach((_, stepIndex) => {
    const step = history[stepIndex];
    const main = step.find(
      (s) => s.from !== 0 && s.to !== 0 && !(s.castling && s.piece.rank === "rook")
    );
    if (!main) return;

    const notation = moveToAlgebraic(history, stepIndex);
    if (main.piece.color === "white") {
      moves += `${moveNum}. ${notation} `;
    } else {
      moves += `${notation} `;
      moveNum++;
    }
  });

  return `${headers}${moves.trim()} ${result}`;
}

export function downloadPGN(pgn: string, filename = "game.pgn") {
  const blob = new Blob([pgn], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
