import { Game } from "./game";
import { getAllowedMoves } from "./piece";
import type { ChessPiece, PieceColor, PieceRank } from "./types";

export class SimulationGame extends Game {
  override startNewGame(
    pieces: ChessPiece[],
    turn: PieceColor,
    enPassantSquare: number | null = null
  ): void {
    this._setPieces(pieces);
    this.turn = turn;
    this.clickedPiece = null;
    this.enPassantSquare = enPassantSquare;
    this.halfMoveClock = 0;
  }

  override saveHistory(): void {}
  override addToHistory(): void {}
  override triggerEvent(): void {}
  override clearEvents(): void {}
  override undo(): boolean { return false; }

  override movePiece(pieceName: string, position: number, promotionRank?: PieceRank): boolean {
    return super.movePiece(pieceName, position, promotionRank);
  }

  override king_checked(color: PieceColor): boolean {
    const piece = this.clickedPiece;
    const king = this.getPieceByName(color + "King");
    if (!king) return true;
    const enemyColor = color === "white" ? "black" : "white";

    for (const enemy of this.getPiecesByColor(enemyColor)) {
      this.setClickedPiece(enemy);
      const moves = this.unblockedPositions(enemy, getAllowedMoves(enemy), false);
      if (moves.indexOf(king.position) !== -1) {
        this.setClickedPiece(piece);
        return true;
      }
    }
    this.setClickedPiece(piece);
    return false;
  }

  override checkmate(): void {}
}
