"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchHint } from "./hints";
import { buildAlgebraicMoveLog, type AlgebraicMoveEntry } from "./algebraic";
import { createChessEngine, type ChessEngine } from "./engine";
import { getOpeningInfo } from "./openings";
import { getMainMove, getPromotionRank, replayToPly } from "./replay";
import { SimulationGame } from "./simulationGame";
import { INITIAL_PIECES, clonePieces } from "./constants";
import { getCastleRookAnimation } from "./castleAnimation";
import { notifyStatsUpdated } from "@/lib/stats/events";
import type { DrawReason } from "./draw";
import type { WinReason } from "./gameEnd";
import { exportPGN, downloadPGN } from "./pgn";
import { saveGameToCloud } from "@/lib/games/client";
import { exportFEN, copyFEN } from "./fen";
import { Game } from "./game";
import { getThreatenedSquares } from "./threats";
import {
  gameClockMs,
  getClockSnapshot,
  initClockStore,
  msToDisplaySeconds,
  resetClockStore,
  restoreClockStore,
  setClockSnapshot,
  switchClockTurn,
} from "./gameClock";
import type {
  ChessPiece,
  GameOptions,
  HintMove,
  MoveRecord,
  PieceColor,
  PieceRank,
} from "./types";
import { isComputerMode, isOnlineMode } from "./types";
import { applyEloChange, getOpponentElo } from "./elo";
import {
  loadLeaderboard, saveLeaderboard, saveGame, clearSavedGame,
  addGameRecord, type SavedGame,
} from "@/lib/storage";
import type { GameRecord } from "@/lib/settings/types";
import type { EloSnapshot } from "@/lib/settings/types";
import {
  playMoveSound, playCaptureSound, playCheckSound,
  playCheckmateSound, playDrawSound, playHintSound,
} from "@/lib/sounds";
import { ANIMATION_MS, type AnimationSpeed } from "@/lib/settings/types";

export interface CapturedPiece { piece: ChessPiece; color: PieceColor; }
export type MoveLogEntry = AlgebraicMoveEntry;
export interface MoveAnimation {
  pieceName: string;
  from: number;
  to: number;
  capturedName?: string;
  castleRook?: { pieceName: string; from: number; to: number };
}

export interface GameState {
  pieces: ChessPiece[];
  turn: PieceColor;
  selectedPiece: string | null;
  allowedMoves: number[];
  lastMove: { from: number; to: number } | null;
  captured: CapturedPiece[];
  inCheck: PieceColor | null;
  winner: PieceColor | null;
  winReason: WinReason | null;
  drawReason: DrawReason | null;
  isAiThinking: boolean;
  isAnimating: boolean;
  flipped: boolean;
  moveLog: MoveLogEntry[];
  pendingPromotion: { pieceName: string; position: number } | null;
  animating: MoveAnimation | null;
  whiteTime: number;
  blackTime: number;
  hint: HintMove | null;
  isHintLoading: boolean;
  hintsUsed: number;
  moveCount: number;
  clockStarted: boolean;
  openingName: string;
  openingRecognized: boolean;
  viewPly: number | null;
  positionFen: string;
  eloSnapshot: EloSnapshot | null;
  threatenedSquares: number[];
}

function buildMoveLog(history: MoveRecord[][]): MoveLogEntry[] {
  return buildAlgebraicMoveLog(history);
}

function detectInCheck(game: Game): PieceColor | null {
  return game.king_checked(game.turn) ? game.turn : null;
}

function fenAtPly(history: MoveRecord[][], ply: number): string {
  const sim = new SimulationGame(clonePieces(INITIAL_PIECES), "white");
  for (let i = 0; i < ply && i < history.length; i++) {
    const main = getMainMove(history[i]);
    if (main) sim.movePiece(main.piece.name, main.to, getPromotionRank(history[i]));
  }
  return exportFEN(sim.pieces, sim.turn, sim.enPassantSquare, sim.halfMoveClock);
}

function withMeta(game: Game): { moveLog: MoveLogEntry[]; openingName: string; openingRecognized: boolean } {
  const history = game.history.getAll();
  const opening = getOpeningInfo(history);
  return {
    moveLog: buildMoveLog(history),
    openingName: opening.name,
    openingRecognized: opening.recognized,
  };
}

const EMPTY: GameState = {
  pieces: clonePieces(INITIAL_PIECES), turn: "white", selectedPiece: null,
  allowedMoves: [], lastMove: null, captured: [], inCheck: null,
  winner: null, winReason: null, drawReason: null, isAiThinking: false, isAnimating: false,
  flipped: false, moveLog: [], pendingPromotion: null, animating: null,
  whiteTime: 0, blackTime: 0, hint: null, isHintLoading: false, hintsUsed: 0,
  moveCount: 0, clockStarted: false,
  openingName: "Starting Position", openingRecognized: true, viewPly: null,
  positionFen: exportFEN(clonePieces(INITIAL_PIECES), "white"),
  eloSnapshot: null,
  threatenedSquares: [],
};

function computeThreats(game: Game, humanColor: PieceColor, enabled: boolean): number[] {
  if (!enabled) return [];
  return getThreatenedSquares(game, humanColor);
}

export function useChessGame(
  soundEnabled: boolean,
  animSpeed: AnimationSpeed
) {
  const gameRef = useRef<Game | null>(null);
  const optionsRef = useRef<GameOptions | null>(null);
  const engineRef = useRef<ChessEngine | null>(null);
  const selectedRef = useRef<string | null>(null);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockRunningRef = useRef(false);
  const hintLoadingRef = useRef(false);
  const sessionGenRef = useRef(0);
  const isRemoteMoveRef = useRef(false);
  const onlineMoveRef = useRef<
    ((move: { pieceName: string; position: number; promotionRank?: PieceRank }) => void) | null
  >(null);
  const showThreatsRef = useRef(true);

  const [started, setStarted] = useState(false);
  const [state, setState] = useState<GameState>(EMPTY);
  const stateRef = useRef(state);
  stateRef.current = state;

  const moveDuration = ANIMATION_MS[animSpeed];

  const playSound = (fn: () => void) => { if (soundEnabled) fn(); };

  const clearAnimTimer = () => {
    if (animTimerRef.current) { clearTimeout(animTimerRef.current); animTimerRef.current = null; }
  };

  const clearTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    clockRunningRef.current = false;
    setClockSnapshot({ running: false });
  };

  const isGameOver = () => !!(state.winner || state.drawReason);

  const canPlayerMove = useCallback(() => {
    const game = gameRef.current;
    const options = optionsRef.current;
    if (!game || blockedRef.current || state.isAnimating) return false;
    if (state.winner || state.drawReason || state.viewPly !== null) return false;
    if (options && isComputerMode(options.playAgainst) && game.turn === options.aiColor) return false;
    if (options && isOnlineMode(options.playAgainst) && game.turn !== options.humanColor) return false;
    return true;
  }, [state.winner, state.drawReason, state.viewPly, state.isAnimating]);

  const gameRecordedRef = useRef(false);
  const opponentNameRef = useRef<string | null>(null);

  const recordGameEnd = useCallback((
    winner: PieceColor | null,
    draw: boolean,
    drawReason?: DrawReason
  ) => {
    if (gameRecordedRef.current) return;
    const options = optionsRef.current;
    const game = gameRef.current;
    if (!options || !game) return;

    const history = game.history.getAll();
    if (history.length === 0) return;
    gameRecordedRef.current = true;

    const humanWon = winner === options.humanColor;
    const result = draw ? "draw" : humanWon ? "win" : "loss";
    const stats = loadLeaderboard();
    const eloBefore = stats.elo;
    let eloChange = 0;

    if (isComputerMode(options.playAgainst)) {
      if (draw) stats.draws++;
      else if (humanWon) stats.wins++;
      else stats.losses++;
      stats.gamesPlayed++;

      if (options.trackElo) {
        const opponentElo = getOpponentElo(options.playAgainst, options.aiDifficulty);
        const { newElo, change } = applyEloChange(stats.elo, opponentElo, result);
        eloChange = change;
        stats.elo = newElo;
        setState((prev) => ({ ...prev, eloSnapshot: { change, newElo } }));
      }

      saveLeaderboard(stats);
      notifyStatsUpdated();

      const opening = getOpeningInfo(history);
      const record: GameRecord = {
        id: `${Date.now()}`,
        playedAt: Date.now(),
        playAgainst: options.playAgainst,
        aiDifficulty: options.aiDifficulty,
        humanColor: options.humanColor,
        result,
        rated: options.trackElo,
        eloBefore,
        eloChange,
        moveCount: game.history.getMoveCount(),
        openingName: opening.name,
      };
      addGameRecord(record);
    }

    clearSavedGame();

    const opening = getOpeningInfo(history);
    const opponentName =
      options.opponentName ??
      opponentNameRef.current ??
      (isOnlineMode(options.playAgainst) ? "Opponent" : null);

    const whiteName =
      options.humanColor === "white"
        ? "You"
        : opponentName ?? (options.playAgainst === "stockfish" ? "Stockfish" : options.playAgainst === "minimax" ? "Minimax" : "Opponent");
    const blackName =
      options.humanColor === "black"
        ? "You"
        : opponentName ?? (options.playAgainst === "stockfish" ? "Stockfish" : options.playAgainst === "minimax" ? "Minimax" : "Opponent");

    const pgnResult = draw ? "1/2-1/2" : winner === "white" ? "1-0" : winner === "black" ? "0-1" : "*";

    void saveGameToCloud({
      playAgainst: options.playAgainst,
      aiDifficulty: options.aiDifficulty,
      humanColor: options.humanColor,
      result,
      rated: options.trackElo && isComputerMode(options.playAgainst),
      eloBefore,
      eloChange,
      moveCount: game.history.getMoveCount(),
      openingName: opening.name,
      timeControl: options.timeControl,
      opponentName,
      drawReason: drawReason ?? null,
      winner,
      pgn: exportPGN(history, whiteName, blackName, pgnResult),
      history,
    });
  }, []);

  const finishMove = useCallback((pieceName: string, position: number, promotionRank?: PieceRank) => {
    const game = gameRef.current;
    if (!game) return;
    const ok = game.movePiece(pieceName, position, promotionRank);
    selectedRef.current = null;
    blockedRef.current = false;
    if (!ok) {
      blockedRef.current = false;
      setState((prev) => ({
        ...prev,
        isAnimating: false,
        animating: null,
        isAiThinking: false,
      }));
      return;
    }
    isRemoteMoveRef.current = false;
    const options = optionsRef.current;

    setState((prev) => ({
      ...prev, pieces: clonePieces(game.pieces), turn: game.turn,
      selectedPiece: null, allowedMoves: [], isAnimating: false, animating: null,
      hint: null, moveCount: prev.moveCount + 1, viewPly: null,
      inCheck: detectInCheck(game),
      positionFen: exportFEN(game.pieces, game.turn, game.enPassantSquare, game.halfMoveClock),
      threatenedSquares: computeThreats(
        game,
        options?.humanColor ?? "white",
        showThreatsRef.current
      ),
      ...withMeta(game),
    }));
  }, []);

  const beginClock = useCallback(() => {
    if (clockRunningRef.current) return;
    clockRunningRef.current = true;
    gameClockMs.lastTick = Date.now();
    setClockSnapshot({ started: true, running: true });
    setState((prev) => ({ ...prev, clockStarted: true }));
  }, []);

  const playMoveAnimation = useCallback((
    pieceName: string, to: number, promotionRank?: PieceRank, fromAi = false
  ) => {
    const game = gameRef.current;
    // AI/remote callbacks run while blockedRef is held during thinking
    if (!game || (blockedRef.current && !fromAi)) return;
    const piece = game.getPieceByName(pieceName);
    if (!piece) return;
    const victim = game.getPieceByPos(to);
    clearAnimTimer();
    selectedRef.current = null;
    blockedRef.current = true;
    const options = optionsRef.current;
    if (options?.timeControl) {
      beginClock();
      switchClockTurn();
    }

    // Online: send immediately so opponent isn't waiting for local animation
    if (!fromAi && options && isOnlineMode(options.playAgainst)) {
      onlineMoveRef.current?.({ pieceName, position: to, promotionRank });
    }

    if (victim) playSound(playCaptureSound);
    else playSound(playMoveSound);

    const castleRook =
      piece.rank === "king" && !victim
        ? getCastleRookAnimation(piece, to) ?? undefined
        : undefined;

    setState((prev) => ({
      ...prev, selectedPiece: null, allowedMoves: [], isAnimating: true,
      isAiThinking: fromAi ? false : prev.isAiThinking,
      animating: {
        pieceName,
        from: piece.position,
        to,
        capturedName: victim?.name,
        castleRook,
      },
    }));
    animTimerRef.current = setTimeout(() => finishMove(pieceName, to, promotionRank), moveDuration);
  }, [finishMove, moveDuration, soundEnabled, beginClock]);

  const resolveAiMoveOrEndgame = useCallback((
    g: Game,
    opts: GameOptions,
    result: { move: { pieceName: string; position: number; promotion?: PieceRank } | null }
  ) => {
    if (result.move) {
      const allowed = g.getPieceAllowedMoves(result.move.pieceName);
      if (allowed.includes(result.move.position)) {
        setState((prev) => ({ ...prev, isAiThinking: false }));
        playMoveAnimation(
          result.move!.pieceName,
          result.move!.position,
          result.move!.promotion,
          true
        );
        return;
      }
    }

    setState((prev) => ({ ...prev, isAiThinking: false }));
    const aiColor = opts.aiColor;

    if (g.king_dead(aiColor)) {
      blockedRef.current = true;
      if (g.king_checked(aiColor)) {
        g.checkmate(opts.humanColor);
      } else {
        g.stalemate();
      }
      return;
    }

    for (const piece of g.getPiecesByColor(aiColor)) {
      const moves = g.getPieceAllowedMoves(piece.name);
      if (moves.length > 0) {
        playMoveAnimation(piece.name, moves[0], undefined, true);
        return;
      }
    }

    blockedRef.current = false;
  }, [playMoveAnimation]);

  const triggerAiTurn = useCallback(() => {
    const game = gameRef.current;
    const options = optionsRef.current;
    const engine = engineRef.current;
    if (!game || !options || !engine || blockedRef.current) return;
    if (!isComputerMode(options.playAgainst) || game.turn !== options.aiColor) return;

    blockedRef.current = true;
    setState((prev) => ({ ...prev, isAiThinking: true, selectedPiece: null, allowedMoves: [], hint: null }));

    const fen = exportFEN(game.pieces, game.turn, game.enPassantSquare, game.halfMoveClock);
    const gen = sessionGenRef.current;
    engine.play(clonePieces(game.pieces), fen, (result) => {
      if (gen !== sessionGenRef.current) return;
      const g = gameRef.current;
      const opts = optionsRef.current;
      if (!g || !opts || g.turn !== opts.aiColor) return;
      resolveAiMoveOrEndgame(g, opts, result);
    });
  }, [resolveAiMoveOrEndgame]);

  const startTimer = useCallback((
    timeControl: number,
    initial?: { white: number; black: number; running?: boolean; turn?: PieceColor }
  ) => {
    clearTimer();
    if (!timeControl) return;

    const turn = initial?.turn ?? gameRef.current?.turn ?? "white";
    if (initial) {
      restoreClockStore(initial.white, initial.black, turn, initial.running ?? false);
    } else {
      initClockStore(timeControl, turn);
    }
    clockRunningRef.current = initial?.running ?? false;

    timerRef.current = setInterval(() => {
      if (!clockRunningRef.current) return;

      const now = Date.now();
      const live = stateRef.current;
      if (live.winner || live.drawReason || live.pendingPromotion) {
        gameClockMs.lastTick = now;
        return;
      }

      const elapsed = now - gameClockMs.lastTick;
      const turnNow = getClockSnapshot().turn;
      let whiteMs = gameClockMs.white;
      let blackMs = gameClockMs.black;
      if (turnNow === "white") whiteMs = Math.max(0, whiteMs - elapsed);
      else blackMs = Math.max(0, blackMs - elapsed);

      const whiteTime = msToDisplaySeconds(whiteMs);
      const blackTime = msToDisplaySeconds(blackMs);

      if (whiteMs <= 0 || blackMs <= 0) {
        gameClockMs.white = whiteMs;
        gameClockMs.black = blackMs;
        gameClockMs.lastTick = now;
        const loser = whiteMs <= 0 ? "white" : "black";
        const winner = loser === "white" ? "black" : "white";
        blockedRef.current = true;
        clearTimer();
        recordGameEnd(winner, false);
        playSound(playCheckmateSound);
        setClockSnapshot({
          whiteTime: loser === "white" ? 0 : whiteTime,
          blackTime: loser === "black" ? 0 : blackTime,
          running: false,
        });
        setState((prev) => {
          if (prev.winner || prev.drawReason) return prev;
          return {
            ...prev,
            whiteTime: loser === "white" ? 0 : whiteTime,
            blackTime: loser === "black" ? 0 : blackTime,
            winner,
            winReason: "timeout",
          };
        });
        return;
      }

      setClockSnapshot({ whiteTime, blackTime, turn: turnNow });
    }, 250);
  }, [recordGameEnd, soundEnabled]);

  const bindGameEvents = useCallback((game: Game) => {
    game.on("pieceMove", (move) => {
      const m = move as MoveRecord;
      const options = optionsRef.current;
      setState((prev) => ({
        ...prev,
        pieces: clonePieces(game.pieces),
        lastMove: { from: m.from, to: m.to },
        threatenedSquares: computeThreats(
          game,
          options?.humanColor ?? "white",
          showThreatsRef.current
        ),
      }));
    });
    game.on("kill", (piece) => {
      const p = piece as ChessPiece;
      setState((prev) => ({ ...prev, captured: [...prev.captured, { piece: { ...p }, color: p.color }] }));
    });
    game.on("check", (color) => {
      playSound(playCheckSound);
      setState((prev) => ({ ...prev, inCheck: color as PieceColor }));
    });
    game.on("checkMate", (color) => {
      blockedRef.current = true;
      clearTimer();
      playSound(playCheckmateSound);
      recordGameEnd(color as PieceColor, false);
      setState((prev) => ({
        ...prev,
        winner: color as PieceColor,
        winReason: "checkmate",
        inCheck: null,
        isAiThinking: false,
        isAnimating: false,
      }));
    });
    game.on("stalemate", () => {
      blockedRef.current = true;
      clearTimer();
      playSound(playDrawSound);
      recordGameEnd(null, true, "stalemate");
      setState((prev) => ({ ...prev, drawReason: "stalemate", isAiThinking: false, isAnimating: false }));
    });
    game.on("draw", (reason) => {
      blockedRef.current = true;
      clearTimer();
      playSound(playDrawSound);
      recordGameEnd(null, true, reason as DrawReason);
      setState((prev) => ({ ...prev, drawReason: reason as DrawReason, isAiThinking: false, isAnimating: false }));
    });
    game.on("resign", (winner) => {
      blockedRef.current = true;
      clearTimer();
      recordGameEnd(winner as PieceColor, false);
      setState((prev) => ({
        ...prev,
        winner: winner as PieceColor,
        winReason: "resignation",
        isAiThinking: false,
      }));
    });
    game.on("turnChange", (turn) => {
      setState((prev) => ({
        ...prev, turn: turn as PieceColor,
        ...withMeta(game),
      }));
    });
    game.on("promotion", () => setState((prev) => ({ ...prev, pieces: clonePieces(game.pieces) })));
  }, [recordGameEnd, soundEnabled]);

  const setupEngine = useCallback((options: GameOptions) => {
    engineRef.current?.dispose?.();
    if (isComputerMode(options.playAgainst)) {
      engineRef.current = createChessEngine(
        options.playAgainst,
        options.aiColor,
        options.aiDifficulty
      );
      engineRef.current?.reset();
    } else {
      engineRef.current = null;
    }
  }, []);

  const initGame = useCallback((options: GameOptions) => {
    sessionGenRef.current += 1;
    clearAnimTimer();
    clearTimer();
    blockedRef.current = false;
    gameRecordedRef.current = false;
    const game = new Game(clonePieces(INITIAL_PIECES), "white");
    gameRef.current = game;
    optionsRef.current = options;
    hintLoadingRef.current = false;
    setupEngine(options);
    selectedRef.current = null;
    clearSavedGame();

    const tc = options.timeControl || 0;
    bindGameEvents(game);

    setState({
      ...EMPTY, pieces: clonePieces(INITIAL_PIECES),
      whiteTime: tc, blackTime: tc,
      flipped: options.humanColor === "black",
      openingName: "Starting Position",
      openingRecognized: true,
      positionFen: exportFEN(game.pieces, game.turn, game.enPassantSquare, game.halfMoveClock),
      eloSnapshot: null,
      isHintLoading: false,
      hintsUsed: 0,
      threatenedSquares: computeThreats(game, options.humanColor, showThreatsRef.current),
    });
    setStarted(true);
    startTimer(tc);
  }, [startTimer, bindGameEvents, setupEngine]);

  const resumeGame = useCallback((saved: SavedGame) => {
    sessionGenRef.current += 1;
    clearAnimTimer();
    clearTimer();
    blockedRef.current = false;
    hintLoadingRef.current = false;
    selectedRef.current = null;

    const game = new Game(clonePieces(INITIAL_PIECES), "white");
    game.restoreFromHistory(saved.history);
    gameRef.current = game;
    optionsRef.current = saved.options;
    setupEngine(saved.options);
    bindGameEvents(game);

    const snapshot = replayToPly(saved.history, saved.history.length);
    const tc = saved.options.timeControl || 0;

    setState({
      ...EMPTY,
      pieces: clonePieces(game.pieces),
      turn: game.turn,
      lastMove: snapshot.lastMove,
      captured: snapshot.captured,
      inCheck: snapshot.inCheck,
      moveCount: saved.moveCount,
      hintsUsed: saved.hintsUsed,
      clockStarted: saved.clockStarted,
      flipped: saved.flipped,
      whiteTime: saved.whiteTime,
      blackTime: saved.blackTime,
      positionFen: exportFEN(game.pieces, game.turn, game.enPassantSquare, game.halfMoveClock),
      ...withMeta(game),
    });
    setStarted(true);
    startTimer(tc, {
      white: saved.whiteTime,
      black: saved.blackTime,
      running: saved.clockStarted,
      turn: game.turn,
    });
  }, [startTimer, bindGameEvents, setupEngine]);

  useEffect(() => {
    if (!started || blockedRef.current || state.winner || state.drawReason || state.viewPly !== null) return;
    const options = optionsRef.current;
    if (
      options &&
      isComputerMode(options.playAgainst) &&
      state.turn === options.aiColor &&
      !state.isAiThinking
    ) {
      triggerAiTurn();
    }
  }, [state.turn, state.winner, state.drawReason, state.isAiThinking, state.viewPly, started, triggerAiTurn]);

  useEffect(() => () => { clearAnimTimer(); clearTimer(); }, []);

  const persistSavedGame = useCallback(() => {
    const options = optionsRef.current;
    const snap = stateRef.current;
    if (!started || !options || snap.winner || snap.drawReason) return;
    if (isOnlineMode(options.playAgainst)) return;
    const game = gameRef.current;
    if (!game) return;
    const clock = getClockSnapshot();
    saveGame({
      history: game.history.getAll(),
      options,
      whiteTime: clock.whiteTime,
      blackTime: clock.blackTime,
      moveCount: snap.moveCount,
      hintsUsed: snap.hintsUsed,
      clockStarted: clock.started,
      flipped: snap.flipped,
      savedAt: Date.now(),
    });
  }, [started]);

  // Auto-save on moves (not on every clock tick)
  useEffect(() => {
    persistSavedGame();
  }, [state.pieces, state.turn, state.moveCount, persistSavedGame]);

  // Periodic save while clock is running
  useEffect(() => {
    if (!started || state.winner || state.drawReason) return;
    const id = setInterval(persistSavedGame, 5000);
    return () => clearInterval(id);
  }, [started, state.winner, state.drawReason, persistSavedGame]);

  const selectPiece = useCallback((pieceName: string) => {
    const game = gameRef.current;
    if (!game || !canPlayerMove()) return;
    const piece = game.getPieceByName(pieceName);
    if (!piece || piece.color !== game.turn) return;
    const moves = game.getPieceAllowedMoves(pieceName);
    selectedRef.current = pieceName;
    setState((prev) => ({ ...prev, selectedPiece: pieceName, allowedMoves: moves, hint: null }));
  }, [canPlayerMove]);

  const attemptMove = useCallback((pieceName: string, position: number) => {
    const game = gameRef.current;
    if (!game || !canPlayerMove()) return;
    const piece = game.getPieceByName(pieceName);
    if (!piece || piece.color !== game.turn) return;
    const allowed = game.getPieceAllowedMoves(pieceName);
    const resolved = game.resolveMoveDestination(pieceName, position);
    if (!allowed.includes(resolved)) {
      const target = game.getPieceByPos(position);
      if (target?.color === game.turn && !(piece.rank === "king" && target.rank === "rook")) {
        selectPiece(target.name);
      }
      return;
    }
    if (piece.rank === "pawn" && ((piece.color === "white" && position > 80) || (piece.color === "black" && position < 20))) {
      setState((prev) => ({ ...prev, pendingPromotion: { pieceName, position } }));
      return;
    }
    playMoveAnimation(pieceName, resolved);
  }, [canPlayerMove, selectPiece, playMoveAnimation]);

  const tryMove = useCallback((position: number) => {
    const game = gameRef.current;
    if (!game || !canPlayerMove()) return;

    const pieceAtPos = game.getPieceByPos(position);

    // Click own piece → select & show legal moves (click again to deselect)
    if (pieceAtPos && pieceAtPos.color === game.turn) {
      const selected = selectedRef.current;
      const selectedPiece = selected ? game.getPieceByName(selected) : null;
      if (selected && selectedPiece?.rank === "king" && pieceAtPos.rank === "rook") {
        attemptMove(selected, position);
        return;
      }
      if (selectedRef.current === pieceAtPos.name) {
        selectedRef.current = null;
        setState((prev) => ({ ...prev, selectedPiece: null, allowedMoves: [], hint: null }));
      } else {
        selectPiece(pieceAtPos.name);
      }
      return;
    }

    // Click destination square → move selected piece
    const selected = selectedRef.current;
    if (selected) attemptMove(selected, position);
  }, [canPlayerMove, selectPiece, attemptMove]);

  const promote = useCallback((rank: PieceRank) => {
    if (!state.pendingPromotion) return;
    const { pieceName, position } = state.pendingPromotion;
    setState((prev) => ({ ...prev, pendingPromotion: null }));
    playMoveAnimation(pieceName, position, rank);
  }, [state.pendingPromotion, playMoveAnimation]);

  const resign = useCallback(() => {
    const game = gameRef.current;
    if (!game || blockedRef.current) return;
    game.resign(game.turn);
  }, []);

  const offerDraw = useCallback(() => {
    const game = gameRef.current;
    const options = optionsRef.current;
    if (!game || blockedRef.current) return;
    if (options && isComputerMode(options.playAgainst)) return;
    if (options && isOnlineMode(options.playAgainst)) return;
    game.draw("agreement");
  }, []);

  const showHint = useCallback(() => {
    const game = gameRef.current;
    const options = optionsRef.current;
    if (!game || !options || !canPlayerMove() || hintLoadingRef.current) return;
    if (isOnlineMode(options.playAgainst)) return;

    hintLoadingRef.current = true;
    playSound(playHintSound);
    setState((prev) => ({ ...prev, isHintLoading: true, hint: null }));

    const pieces = clonePieces(game.pieces);
    const fen = exportFEN(game.pieces, game.turn, game.enPassantSquare, game.halfMoveClock);

    fetchHint(options, pieces, game.turn, fen)
      .then((hint) => {
        hintLoadingRef.current = false;
        if (!gameRef.current || gameRef.current.turn !== game.turn) {
          setState((prev) => ({ ...prev, isHintLoading: false }));
          return;
        }
        if (hint) {
          selectedRef.current = hint.pieceName;
          setState((prev) => ({
            ...prev,
            isHintLoading: false,
            hint,
            hintsUsed: prev.hintsUsed + 1,
            selectedPiece: hint.pieceName,
            allowedMoves: [hint.position],
          }));
        } else {
          setState((prev) => ({ ...prev, isHintLoading: false }));
        }
      })
      .catch(() => {
        hintLoadingRef.current = false;
        setState((prev) => ({ ...prev, isHintLoading: false }));
      });
  }, [canPlayerMove, soundEnabled]);

  const undo = useCallback(() => {
    const game = gameRef.current;
    const options = optionsRef.current;
    if (!game || blockedRef.current) return;
    if (options && isOnlineMode(options.playAgainst)) return;
    clearAnimTimer();
    blockedRef.current = false;
    let undone = game.undo();
    if (options && isComputerMode(options.playAgainst)) undone = game.undo() || undone;
    if (undone) {
      const ply = game.history.getMoveCount();
      const snapshot = replayToPly(game.history.getAll(), ply);
      selectedRef.current = null;
      setState((prev) => ({
        ...prev, pieces: clonePieces(game.pieces), turn: game.turn,
        selectedPiece: null, allowedMoves: [], lastMove: snapshot.lastMove,
        captured: snapshot.captured,
        isAnimating: false, animating: null, hint: null,
        moveCount: Math.max(
          0,
          prev.moveCount - (options && isComputerMode(options.playAgainst) ? 2 : 1)
        ),
        viewPly: null,
        inCheck: detectInCheck(game),
        positionFen: exportFEN(game.pieces, game.turn, game.enPassantSquare, game.halfMoveClock),
        ...withMeta(game),
      }));
    }
  }, []);

  const gotoMove = useCallback((ply: number) => {
    const game = gameRef.current;
    if (!game) return;
    clearAnimTimer();
    blockedRef.current = false;
    selectedRef.current = null;

    const maxPly = game.history.getMoveCount();
    if (ply >= maxPly) {
      const live = replayToPly(game.history.getAll(), maxPly);
      setState((prev) => ({
        ...prev,
        viewPly: null,
        pieces: clonePieces(game.pieces),
        turn: game.turn,
        selectedPiece: null,
        allowedMoves: [],
        lastMove: live.lastMove,
        captured: live.captured,
        hint: null,
        isAnimating: false,
        animating: null,
        inCheck: live.inCheck,
        positionFen: exportFEN(game.pieces, game.turn, game.enPassantSquare, game.halfMoveClock),
        ...withMeta(game),
      }));
      return;
    }

    const snapshot = replayToPly(game.history.getAll(), ply);
    setState((prev) => ({
      ...prev,
      viewPly: ply,
      pieces: snapshot.pieces,
      turn: snapshot.turn,
      lastMove: snapshot.lastMove,
      captured: snapshot.captured,
      selectedPiece: null,
      allowedMoves: [],
      hint: null,
      isAnimating: false,
      animating: null,
      inCheck: snapshot.inCheck,
      positionFen: fenAtPly(game.history.getAll(), ply),
      ...(() => {
        const opening = getOpeningInfo(game.history.getAll().slice(0, ply));
        return { openingName: opening.name, openingRecognized: opening.recognized };
      })(),
    }));
  }, []);

  const exitReview = useCallback(() => {
    gotoMove(gameRef.current?.history.getMoveCount() ?? 0);
  }, [gotoMove]);

  const flipBoard = useCallback(() => setState((prev) => ({ ...prev, flipped: !prev.flipped })), []);

  const reset = useCallback(() => {
    sessionGenRef.current += 1;
    clearAnimTimer(); clearTimer(); blockedRef.current = false;
    hintLoadingRef.current = false;
    engineRef.current?.dispose?.();
    gameRef.current = null; optionsRef.current = null; engineRef.current = null;
    selectedRef.current = null;
    resetClockStore();
    setStarted(false); setState(EMPTY);
  }, []);

  const exportGamePGN = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    const result = state.winner ? (state.winner === "white" ? "1-0" : "0-1") : state.drawReason ? "1/2-1/2" : "*";
    downloadPGN(exportPGN(game.history.getAll(), "White", "Black", result));
  }, [state.winner, state.drawReason]);

  const exportGameFEN = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    copyFEN(exportFEN(game.pieces, game.turn, game.enPassantSquare, game.halfMoveClock));
  }, []);

  const getGameHistory = useCallback(() => gameRef.current?.history.getAll() ?? [], []);

  const applyRemoteMove = useCallback((
    pieceName: string,
    position: number,
    promotionRank?: PieceRank
  ) => {
    const game = gameRef.current;
    const options = optionsRef.current;
    if (!game || !options || !isOnlineMode(options.playAgainst)) return;

    const piece = game.getPieceByName(pieceName);
    if (!piece) return;

    // Ignore echoes / duplicates — only apply opponent moves
    if (piece.color === options.humanColor) return;
    if (piece.position === position) return;
    if (game.turn !== piece.color) return;

    const allowed = game.getPieceAllowedMoves(pieceName);
    if (!allowed.includes(position)) return;

    const resolved = game.resolveMoveDestination(pieceName, position);
    const isCastle =
      piece.rank === "king" &&
      Math.abs(resolved - piece.position) === 2;

    isRemoteMoveRef.current = true;
    if (options.timeControl) {
      beginClock();
      switchClockTurn();
    }

    // Castling needs animation so both king and rook move together
    if (isCastle) {
      playMoveAnimation(pieceName, resolved, promotionRank, true);
      return;
    }

    const victim = game.getPieceByPos(resolved);
    if (victim) playSound(playCaptureSound);
    else playSound(playMoveSound);

    finishMove(pieceName, resolved, promotionRank);
  }, [finishMove, beginClock, playMoveAnimation, soundEnabled]);

  const setOnlineMoveSender = useCallback((
    sender: ((move: { pieceName: string; position: number; promotionRank?: PieceRank }) => void) | null
  ) => {
    onlineMoveRef.current = sender;
  }, []);

  const setShowThreats = useCallback((enabled: boolean) => {
    showThreatsRef.current = enabled;
    const game = gameRef.current;
    const options = optionsRef.current;
    if (!game) return;
    setState((prev) => ({
      ...prev,
      threatenedSquares: computeThreats(game, options?.humanColor ?? "white", enabled),
    }));
  }, []);

  const applyOnlineGameOver = useCallback((data: {
    winner?: PieceColor;
    drawReason?: DrawReason;
    winReason?: WinReason;
  }) => {
    const snap = stateRef.current;
    if (snap.winner || snap.drawReason) return;

    blockedRef.current = true;
    clearTimer();
    if (data.drawReason) {
      recordGameEnd(null, true, data.drawReason);
      setState((prev) => ({
        ...prev,
        drawReason: data.drawReason!,
        isAnimating: false,
        isAiThinking: false,
      }));
    } else if (data.winner) {
      recordGameEnd(data.winner, false);
      setState((prev) => ({
        ...prev,
        winner: data.winner!,
        winReason: data.winReason ?? "checkmate",
        inCheck: null,
        isAnimating: false,
        isAiThinking: false,
      }));
    }
  }, [recordGameEnd]);

  const setOpponentName = useCallback((name: string) => {
    opponentNameRef.current = name;
    if (optionsRef.current) {
      optionsRef.current = { ...optionsRef.current, opponentName: name };
    }
  }, []);

  return {
    started, state, initGame, resumeGame, selectPiece, tryMove, attemptMove, promote,
    undo, flipBoard, reset, resign, offerDraw, showHint,
    exportGamePGN, exportGameFEN, canPlayerMove, gotoMove, exitReview,
    getGameHistory, applyRemoteMove, setOnlineMoveSender, setShowThreats, applyOnlineGameOver, setOpponentName,
  };
}
