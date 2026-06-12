import { CASTLE_HOME, CASTLE_KING_TO, INITIAL_PIECES, clonePieces } from "./constants";
import { History } from "./history";
import { isInsufficientMaterial, type DrawReason } from "./draw";
import { getPositionKey } from "./fen";
import { changePosition, getAllowedMoves } from "./piece";
import { getMainMove, getPromotionRank } from "./replay";
import type { ChessPiece, GameEvent, MoveRecord, PieceColor, PieceRank } from "./types";

type EventCallback = (params?: unknown) => void;

export class Game {
  pieces: ChessPiece[] = [];
  playerPieces: Record<PieceColor, ChessPiece[]> = { white: [], black: [] };
  turn: PieceColor = "white";
  clickedPiece: ChessPiece | null = null;
  history = new History();
  halfMoveClock = 0;
  /** Square a pawn may capture en passant (the passed-over square) */
  enPassantSquare: number | null = null;
  private positionKeys: string[] = [];
  private _events: Partial<Record<GameEvent, EventCallback[]>> = {};

  constructor(pieces: ChessPiece[], turn: PieceColor) {
    this.startNewGame(pieces, turn);
  }

  startNewGame(pieces: ChessPiece[], turn: PieceColor): void {
    this._setPieces(pieces);
    this.turn = turn;
    this.clickedPiece = null;
    this._events = {
      pieceMove: [], kill: [], check: [], promotion: [],
      checkMate: [], stalemate: [], draw: [], resign: [], turnChange: [],
    };
    this.history = new History();
    this.halfMoveClock = 0;
    this.enPassantSquare = null;
    this.positionKeys = [getPositionKey(this.pieces, this.turn, this.enPassantSquare)];
  }

  protected getEnPassantCapturedPos(landingSquare: number, capturerColor: PieceColor): number {
    return landingSquare + (capturerColor === "white" ? 10 : -10);
  }

  protected getEnPassantMoves(piece: ChessPiece): number[] {
    if (piece.rank !== "pawn" || this.enPassantSquare === null) return [];
    const ep = this.enPassantSquare;
    const attacks = piece.color === "white"
      ? [piece.position + 9, piece.position + 11]
      : [piece.position - 9, piece.position - 11];
    if (!attacks.includes(ep)) return [];

    const victimPos = this.getEnPassantCapturedPos(ep, piece.color);
    const victim = this.getPieceByPos(victimPos);
    if (!victim || victim.rank !== "pawn") return [];
    if (!this.canEnPassant(piece, ep, victim)) return [];
    return [ep];
  }

  protected canEnPassant(piece: ChessPiece, landing: number, victim: ChessPiece): boolean {
    const orig = piece.position;
    changePosition(piece, landing);
    this._removePiece(victim);
    const legal = !this.king_checked(piece.color);
    this._addPiece(victim);
    changePosition(piece, orig);
    return legal;
  }

  protected _setPieces(pieces: ChessPiece[]): void {
    this.pieces = pieces.map((p) => ({ ...p }));
    this.playerPieces = {
      white: this.pieces.filter((p) => p.color === "white"),
      black: this.pieces.filter((p) => p.color === "black"),
    };
  }

  private _removePiece(piece: ChessPiece): void {
    this.pieces.splice(this.pieces.indexOf(piece), 1);
    this.playerPieces[piece.color].splice(
      this.playerPieces[piece.color].indexOf(piece), 1
    );
  }

  private _addPiece(piece: ChessPiece): void {
    this.pieces.push(piece);
    this.playerPieces[piece.color].push(piece);
  }

  saveHistory(): void { this.history.save(); }
  addToHistory(move: MoveRecord): void { this.history.add(move); }
  clearEvents(): void { this._events = {}; }

  undo(): boolean {
    const steps = this.history.getAll();
    if (steps.length === 0) return false;
    this.restoreFromHistory(steps.slice(0, -1));
    return true;
  }

  restoreFromHistory(steps: MoveRecord[][]): void {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SimulationGame } = require("./simulationGame") as {
      SimulationGame: new (pieces: ChessPiece[], turn: PieceColor) => InstanceType<typeof Game>;
    };
    const sim = new SimulationGame(clonePieces(INITIAL_PIECES), "white");
    this.positionKeys = [getPositionKey(sim.pieces, sim.turn, sim.enPassantSquare)];

    for (const step of steps) {
      const main = getMainMove(step);
      if (!main) continue;
      sim.movePiece(main.piece.name, main.to, getPromotionRank(step));
      this.positionKeys.push(getPositionKey(sim.pieces, sim.turn, sim.enPassantSquare));
    }

    this._setPieces(sim.pieces);
    this.turn = sim.turn;
    this.halfMoveClock = sim.halfMoveClock;
    this.enPassantSquare = sim.enPassantSquare;
    this.clickedPiece = null;
    this.history.loadSteps(steps);
  }

  on(eventName: GameEvent, callback: EventCallback): void {
    if (this._events[eventName] && typeof callback === "function") {
      this._events[eventName]!.push(callback);
    }
  }

  softChangeTurn(): void {
    this.turn = this.turn === "white" ? "black" : "white";
    this.triggerEvent("turnChange", this.turn);
  }

  changeTurn(): void {
    this.softChangeTurn();
    this.saveHistory();
  }

  getPiecesByColor(color: PieceColor): ChessPiece[] {
    return this.playerPieces[color];
  }

  getPlayerPositions(color: PieceColor): number[] {
    return this.getPiecesByColor(color).map((p) => p.position);
  }

  filterPositions(positions: number[]): number[] {
    return positions.filter((pos) => {
      const x = pos % 10;
      return pos > 10 && pos < 89 && x !== 9 && x !== 0;
    });
  }

  unblockedPositions(
    piece: ChessPiece,
    allowedPositions: number[][],
    checking = true
  ): number[] {
    const unblocked: number[] = [];
    const myColor = piece.color;
    const otherColor = myColor === "white" ? "black" : "white";
    const myBlocked = this.getPlayerPositions(myColor);
    const otherBlocked = this.getPlayerPositions(otherColor);

    if (piece.rank === "pawn") {
      for (const move of allowedPositions[0]) {
        if (checking && this.myKingChecked(move)) continue;
        if (otherBlocked.indexOf(move) !== -1) unblocked.push(move);
      }
      for (const move of allowedPositions[1]) {
        if (myBlocked.indexOf(move) !== -1 || otherBlocked.indexOf(move) !== -1) break;
        else if (checking && this.myKingChecked(move, false)) continue;
        unblocked.push(move);
      }
    } else {
      allowedPositions.forEach((group) => {
        for (const move of group) {
          if (myBlocked.indexOf(move) !== -1) break;
          else if (checking && this.myKingChecked(move)) {
            if (otherBlocked.indexOf(move) !== -1) break;
            continue;
          }
          unblocked.push(move);
          if (otherBlocked.indexOf(move) !== -1) break;
        }
      });
    }
    return this.filterPositions(unblocked);
  }

  getPieceAllowedMoves(pieceName: string): number[] {
    const piece = this.getPieceByName(pieceName);
    if (!piece || this.turn !== piece.color) return [];

    this.setClickedPiece(piece);
    let moves = getAllowedMoves(piece);
    if (piece.rank === "king") {
      moves = this.getCastlingSquares(piece, moves);
    }
    const legal = this.unblockedPositions(piece, moves, true);
    if (piece.rank === "pawn") {
      for (const ep of this.getEnPassantMoves(piece)) {
        if (!legal.includes(ep)) legal.push(ep);
      }
    }
    return legal;
  }

  /** Resolve king-on-rook drops to the castling destination square. */
  resolveMoveDestination(pieceName: string, position: number): number {
    const piece = this.getPieceByName(pieceName);
    if (!piece) return position;
    if (piece.rank === "king") return this.resolveCastlingDestination(piece, position);
    return position;
  }

  private canCastleQueenside(king: ChessPiece, rook: ChessPiece): boolean {
    const home = CASTLE_HOME[king.color];
    const dest = CASTLE_KING_TO[king.color].queenside;
    if (rook.position !== home.rook1) return false;

    return (
      !this.positionHasExistingPiece(dest - 1) &&
      !this.positionHasExistingPiece(dest) &&
      !this.myKingChecked(dest, true) &&
      !this.positionHasExistingPiece(dest + 1) &&
      !this.myKingChecked(dest + 1, true)
    );
  }

  private canCastleKingside(king: ChessPiece, rook: ChessPiece): boolean {
    const home = CASTLE_HOME[king.color];
    const dest = CASTLE_KING_TO[king.color].kingside;
    if (rook.position !== home.rook2) return false;

    return (
      !this.positionHasExistingPiece(dest - 1) &&
      !this.myKingChecked(dest - 1, true) &&
      !this.positionHasExistingPiece(dest) &&
      !this.myKingChecked(dest, true)
    );
  }

  getCastlingSquares(king: ChessPiece, allowedMoves: number[][]): number[][] {
    const home = CASTLE_HOME[king.color];
    if (!king.ableToCastle || king.position !== home.king || this.king_checked(this.turn)) {
      return allowedMoves;
    }

    const rook1 = this.getPieceByName(king.color + "Rook1");
    const rook2 = this.getPieceByName(king.color + "Rook2");
    const targets: number[] = [];

    if (rook1?.ableToCastle && this.canCastleQueenside(king, rook1)) {
      targets.push(CASTLE_KING_TO[king.color].queenside);
    }
    if (rook2?.ableToCastle && this.canCastleKingside(king, rook2)) {
      targets.push(CASTLE_KING_TO[king.color].kingside);
    }

    for (const sq of targets) {
      allowedMoves.push([sq]);
    }
    return allowedMoves;
  }

  /** King dropped on own rook → resolve to the castling king destination. */
  private resolveCastlingDestination(king: ChessPiece, position: number): number {
    const home = CASTLE_HOME[king.color];
    const target = this.getPieceByPos(position);
    if (!target || target.rank !== "rook" || target.color !== king.color) return position;
    if (king.position !== home.king || !king.ableToCastle) return position;

    const prevClicked = this.clickedPiece;
    this.setClickedPiece(king);
    try {
      if (target.position === home.rook2 && target.ableToCastle && this.canCastleKingside(king, target)) {
        return CASTLE_KING_TO[king.color].kingside;
      }
      if (target.position === home.rook1 && target.ableToCastle && this.canCastleQueenside(king, target)) {
        return CASTLE_KING_TO[king.color].queenside;
      }
    } finally {
      this.setClickedPiece(prevClicked);
    }
    return position;
  }

  getPieceByName(name: string): ChessPiece | undefined {
    return this.pieces.find((p) => p.name === name);
  }

  getPieceByPos(position: number): ChessPiece | undefined {
    return this.pieces.find((p) => p.position === position);
  }

  positionHasExistingPiece(position: number): boolean {
    return this.getPieceByPos(position) !== undefined;
  }

  setClickedPiece(piece: ChessPiece | null): void {
    this.clickedPiece = piece;
  }

  triggerEvent(eventName: GameEvent, params?: unknown): void {
    this._events[eventName]?.forEach((cb) => cb(params));
  }

  movePiece(pieceName: string, position: number, promotionRank?: PieceRank): boolean {
    const piece = this.getPieceByName(pieceName);
    position = parseInt(String(position));
    if (!piece) return false;

    if (piece.rank === "king") {
      const dropTarget = this.getPieceByPos(position);
      if (dropTarget?.rank === "rook" && dropTarget.color === piece.color) {
        position = this.resolveCastlingDestination(piece, position);
        // Never capture own rook — invalid castle attempt
        if (this.getPieceByPos(position)?.rank === "rook") return false;
      } else {
        position = this.resolveCastlingDestination(piece, position);
      }
    }

    if (this.getPieceAllowedMoves(piece.name).indexOf(position) === -1) {
      return false;
    }

    const enPassantTarget = this.enPassantSquare;
    this.enPassantSquare = null;

    const prevPosition = piece.position;
    const isEnPassant = piece.rank === "pawn" && position === enPassantTarget;
    let existedPiece = this.getPieceByPos(position);

    if (isEnPassant) {
      const victimPos = this.getEnPassantCapturedPos(position, piece.color);
      const victim = this.getPieceByPos(victimPos);
      if (victim) this.kill(victim);
      existedPiece = victim;
    } else if (existedPiece) {
      this.kill(existedPiece);
    }

    const isCastleMove =
      piece.rank === "king" &&
      !isEnPassant &&
      !existedPiece &&
      Math.abs(position - prevPosition) === 2;

    if (isCastleMove) {
      if (position - prevPosition === 2) this.castleRook(piece.color + "Rook2");
      else this.castleRook(piece.color + "Rook1");
      changePosition(piece, position, true);
    } else {
      changePosition(piece, position);
    }

    const move: MoveRecord = { from: prevPosition, to: position, piece, castling: isCastleMove };
    this.addToHistory(move);
    this.triggerEvent("pieceMove", move);

    if (piece.rank === "pawn" && (position > 80 || position < 20)) {
      this.promote(piece, promotionRank ?? "queen");
    }

    if (piece.rank === "pawn" || existedPiece || isEnPassant) this.halfMoveClock = 0;
    else this.halfMoveClock++;

    if (piece.rank === "pawn" && Math.abs(position - prevPosition) === 20) {
      this.enPassantSquare = prevPosition + (piece.color === "white" ? 10 : -10);
    }

    this.changeTurn();
    this._recordPosition();
    this._checkGameEnd(piece.color);
    return true;
  }

  private _recordPosition(): void {
    const key = getPositionKey(this.pieces, this.turn, this.enPassantSquare);
    this.positionKeys.push(key);
    if (this.positionKeys.filter((k) => k === key).length >= 3) {
      this.draw("threefold-repetition");
    }
  }

  private _checkGameEnd(lastMover: PieceColor): void {
    const current = this.turn;

    if (this.king_checked(current)) {
      this.triggerEvent("check", current);
      if (this.king_dead(current)) {
        this.checkmate(lastMover);
        return;
      }
    } else if (this.king_dead(current)) {
      this.stalemate();
      return;
    }

    if (this.halfMoveClock >= 100) {
      this.draw("fifty-move");
      return;
    }
    if (isInsufficientMaterial(this.pieces)) {
      this.draw("insufficient-material");
    }
  }

  kill(piece: ChessPiece): void {
    this._removePiece(piece);
    this.addToHistory({ from: piece.position, to: 0, piece });
    this.triggerEvent("kill", piece);
  }

  castleRook(rookName: string): void {
    const rook = this.getPieceByName(rookName)!;
    const prevPosition = rook.position;
    const newPosition = rookName.indexOf("Rook2") !== -1
      ? rook.position - 2 : rook.position + 3;
    changePosition(rook, newPosition);
    const move: MoveRecord = { from: prevPosition, to: newPosition, piece: rook, castling: true };
    this.triggerEvent("pieceMove", move);
    this.addToHistory(move);
  }

  promote(pawn: ChessPiece, rank: PieceRank = "queen"): void {
    pawn.name = pawn.name.replace("Pawn", rank.charAt(0).toUpperCase() + rank.slice(1));
    pawn.rank = rank;
    this.addToHistory({ from: 0, to: pawn.position, piece: pawn });
    this.triggerEvent("promotion", pawn);
  }

  myKingChecked(pos: number, kill = true): boolean {
    const piece = this.clickedPiece!;
    const originalPosition = piece.position;
    const originalCastle = piece.ableToCastle;
    const otherPiece = this.getPieceByPos(pos);
    const shouldKill = kill && otherPiece && otherPiece.rank !== "king";

    changePosition(piece, pos);
    if (shouldKill) this._removePiece(otherPiece!);

    const checked = this.king_checked(piece.color);
    changePosition(piece, originalPosition);
    piece.ableToCastle = originalCastle;
    if (shouldKill) this._addPiece(otherPiece!);
    return checked;
  }

  king_dead(color: PieceColor): boolean {
    for (const piece of this.getPiecesByColor(color)) {
      this.setClickedPiece(piece);
      const moves = this.unblockedPositions(piece, getAllowedMoves(piece), true);
      if (moves.length) {
        this.setClickedPiece(null);
        return false;
      }
    }
    this.setClickedPiece(null);
    return true;
  }

  king_checked(color: PieceColor): boolean {
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

  checkmate(color: PieceColor): void {
    this.triggerEvent("checkMate", color);
    this.clearEvents();
  }

  stalemate(): void {
    this.triggerEvent("stalemate", this.turn);
    this.clearEvents();
  }

  draw(reason: DrawReason): void {
    this.triggerEvent("draw", reason);
    this.clearEvents();
  }

  resign(color: PieceColor): void {
    const winner = color === "white" ? "black" : "white";
    this.triggerEvent("resign", winner);
    this.clearEvents();
  }
}
