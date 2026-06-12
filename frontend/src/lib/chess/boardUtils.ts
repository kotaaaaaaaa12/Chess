/** Convert board position (e.g. 34 = c4) to grid row/col (0-7, pre-rotation DOM space) */
export function posToGrid(position: number): { row: number; col: number } {
  const rank = Math.floor(position / 10);
  const file = position % 10;
  return { row: 8 - rank, col: file - 1 };
}

export function gridToPosition(row: number, col: number): number {
  if (row < 0 || row > 7 || col < 0 || col > 7) return -1;
  const rank = 8 - row;
  const file = col + 1;
  return rank * 10 + file;
}

/** Map pointer coords to a square; invert when the board wrapper is rotated 180° */
export function pointToPosition(
  boardRect: DOMRect,
  clientX: number,
  clientY: number,
  flipped: boolean
): number {
  const relX = clientX - boardRect.left;
  const relY = clientY - boardRect.top;
  let col = Math.floor((relX / boardRect.width) * 8);
  let row = Math.floor((relY / boardRect.height) * 8);
  col = Math.max(0, Math.min(7, col));
  row = Math.max(0, Math.min(7, row));
  if (flipped) {
    row = 7 - row;
    col = 7 - col;
  }
  return gridToPosition(row, col);
}

/** Grid cell placement (top-left of square) */
export function gridToStyle(row: number, col: number): { gridRow: number; gridColumn: number } {
  return { gridRow: row + 1, gridColumn: col + 1 };
}
