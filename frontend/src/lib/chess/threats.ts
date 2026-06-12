import { getAllowedMoves } from "./piece";
import type { Game } from "./game";
import type { PieceColor } from "./types";

/** All squares attacked by pieces of the given color. */
export function getAttackedSquares(game: Game, attackerColor: PieceColor): number[] {
  const squares = new Set<number>();
  const saved = game.clickedPiece;

  for (const piece of game.getPiecesByColor(attackerColor)) {
    game.setClickedPiece(piece);
    const moves = game.unblockedPositions(piece, getAllowedMoves(piece), false);
    for (const m of moves) squares.add(m);
  }

  game.setClickedPiece(saved);
  return [...squares];
}

/** Squares where the defender's pieces (except king) are under attack. */
export function getThreatenedSquares(game: Game, defenderColor: PieceColor): number[] {
  const attacker = defenderColor === "white" ? "black" : "white";
  const attacked = new Set(getAttackedSquares(game, attacker));
  const threatened: number[] = [];

  for (const piece of game.getPiecesByColor(defenderColor)) {
    if (piece.rank === "king") continue;
    if (attacked.has(piece.position)) threatened.push(piece.position);
  }

  return threatened;
}
