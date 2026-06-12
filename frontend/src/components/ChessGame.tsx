"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Crown, Settings, Lightbulb } from "lucide-react";
import LandingPage from "./LandingPage";
import StatsScreen from "./StatsScreen";
import OnlineLobby from "./OnlineLobby";
import AuthScreen from "./AuthScreen";
import { useAuth } from "@/context/AuthContext";
import { useOnlineMultiplayer } from "@/hooks/useOnlineMultiplayer";
import type { SavedGame } from "@/lib/storage";
import ChessBoard from "./ChessBoard";
import StartScreen from "./StartScreen";
import GameSidebar from "./GameSidebar";
import OpeningStrip from "./OpeningStrip";
import MoveList from "./MoveList";
import GameToolbar from "./GameToolbar";
import PromotionModal from "./PromotionModal";
import GameOverModal from "./GameOverModal";
import GameReviewModal from "./GameReviewModal";
import PlayerBar, { getPlayerLabel } from "./PlayerBar";
import GameClockRail from "./GameClockRail";
import SettingsPanel from "./SettingsPanel";
import Tutorial from "./Tutorial";
import ConfettiCelebration from "./ConfettiCelebration";
import BoardSkeleton from "./BoardSkeleton";
import EvalBar from "./EvalBar";
import ConfirmModal from "./ConfirmModal";
import { useSettings } from "@/context/SettingsContext";
import { usePositionEval } from "@/hooks/usePositionEval";
import { useChessGame } from "@/lib/chess/useChessGame";
import { ANIMATION_MS } from "@/lib/settings/types";
import { usePlayerStats } from "@/hooks/usePlayerStats";
import { getOpponentElo } from "@/lib/chess/elo";
import { getTurnStatusCopy } from "@/lib/chess/gameEnd";
import { isComputerMode, isOnlineMode } from "@/lib/chess/types";
import type { GameOptions } from "@/lib/chess/types";
import type { TimeControl } from "@/lib/settings/types";

type Screen = "landing" | "setup" | "online" | "game" | "stats" | "auth";

export default function ChessGame() {
  const { settings, settingsLoaded, updateSettings } = useSettings();
  const { user, token, loading: authLoading } = useAuth();
  const {
    started, state, initGame, tryMove, attemptMove, selectPiece, promote,
    undo, flipBoard, reset, resign, offerDraw, showHint,
    exportGamePGN, exportGameFEN, gotoMove, exitReview, getGameHistory, resumeGame,
    applyRemoteMove, setOnlineMoveSender, setShowThreats, applyOnlineGameOver, setOpponentName, canPlayerMove,
  } = useChessGame(settings.soundEnabled, settings.animationSpeed);

  const online = useOnlineMultiplayer();
  const onlineTimeControlRef = useRef<TimeControl>(300);

  const [screen, setScreen] = useState<Screen>("landing");
  const [options, setOptions] = useState<GameOptions | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [resignConfirmOpen, setResignConfirmOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewHistory, setReviewHistory] = useState<ReturnType<typeof getGameHistory>>([]);
  const [loading, setLoading] = useState(true);
  const [drawOfferIncoming, setDrawOfferIncoming] = useState(false);
  const [pendingJoinCode, setPendingJoinCode] = useState("");
  const [authTab, setAuthTab] = useState<"login" | "register">("login");

  const playerStats = usePlayerStats();
  const playerElo = playerStats.elo;

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    if (settings.showTutorialOnStart) {
      setTutorialOpen(true);
      updateSettings({ showTutorialOnStart: false });
    }
  }, [settingsLoaded, settings.showTutorialOnStart, updateSettings]);

  useEffect(() => {
    setShowThreats(settings.showThreats);
  }, [settings.showThreats, setShowThreats]);

  // Invite link: ?join=ABC123 → open online lobby with code pre-filled
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const join = params.get("join")?.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (join && join.length === 6) {
      setPendingJoinCode(join);
      setScreen("online");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleStart = (opts: GameOptions) => {
    setOptions(opts);
    setScreen("game");
    initGame(opts);
  };

  const handleResume = (saved: SavedGame) => {
    setOptions(saved.options);
    setScreen("game");
    resumeGame(saved);
  };

  const handleNewGame = () => { if (options) initGame(options); };
  const handleMenu = () => {
    online.reset();
    reset();
    setOptions(null);
    setDrawOfferIncoming(false);
    setScreen("landing");
  };

  const handleOnlineLobby = (tc: TimeControl) => {
    onlineTimeControlRef.current = tc;
    setScreen("online");
  };

  const startOnlineGame = useCallback((data: {
    roomId: string;
    color: "white" | "black";
    timeControl: TimeControl;
    opponentName?: string;
  }) => {
    const myColor = data.color;
    const opts: GameOptions = {
      playAgainst: "online",
      humanColor: myColor,
      aiColor: myColor === "white" ? "black" : "white",
      aiDifficulty: "medium",
      timeControl: data.timeControl,
      trackElo: false,
      onlineRoomId: data.roomId,
      opponentName: data.opponentName,
    };
    setOptions(opts);
    setScreen("game");
    initGame(opts);
    if (data.opponentName) setOpponentName(data.opponentName);
    setOnlineMoveSender((move) => online.sendMove(move.pieceName, move.position, move.promotionRank));
  }, [initGame, online, setOnlineMoveSender, setOpponentName]);

  const applyRemoteMoveRef = useRef(applyRemoteMove);
  const applyOnlineGameOverRef = useRef(applyOnlineGameOver);
  applyRemoteMoveRef.current = applyRemoteMove;
  applyOnlineGameOverRef.current = applyOnlineGameOver;

  useEffect(() => {
    online.setMoveHandler((move) => {
      applyRemoteMoveRef.current(move.pieceName, move.position, move.promotionRank);
    });
    online.setGameOverHandler((data) => {
      applyOnlineGameOverRef.current(data);
    });
  }, [online.setMoveHandler, online.setGameOverHandler]);

  useEffect(() => {
    if (online.drawOffered) setDrawOfferIncoming(true);
  }, [online.drawOffered]);

  useEffect(() => {
    const data = online.pendingGameStart;
    if (!data || screen === "game") return;
    startOnlineGame(data);
    online.consumeGameStart();
  }, [online.pendingGameStart, screen, startOnlineGame, online.consumeGameStart]);

  const gameOver = !!(state.winner || state.drawReason);
  const inReview = state.viewPly !== null;
  const canInteract = !state.isAiThinking && !gameOver && !state.isAnimating && !inReview;
  const showTimer = (options?.timeControl ?? 0) > 0;

  const pendingPiece = state.pendingPromotion
    ? state.pieces.find((p) => p.name === state.pendingPromotion!.pieceName) : null;

  const playerNames = useMemo(
    () => ({ userName: user?.displayName, opponentName: online.opponentName }),
    [user?.displayName, online.opponentName]
  );
  const blackInfo = getPlayerLabel("black", options, playerNames);
  const whiteInfo = getPlayerLabel("white", options, playerNames);

  const trackElo = options?.trackElo ?? false;
  const opponentElo = trackElo && options && isComputerMode(options.playAgainst)
    ? getOpponentElo(options.playAgainst, options.aiDifficulty)
    : undefined;

  const blackRating = trackElo
    ? (blackInfo.isAi ? opponentElo : (options?.humanColor === "black" ? playerElo : undefined))
    : undefined;
  const whiteRating = trackElo
    ? (whiteInfo.isAi ? opponentElo : (options?.humanColor === "white" ? playerElo : undefined))
    : undefined;

  const humanColor = options?.humanColor ?? "white";
  const opponentColor: "white" | "black" = humanColor === "white" ? "black" : "white";
  const vsComputer = options ? isComputerMode(options.playAgainst) : false;
  const isOnline = options ? isOnlineMode(options.playAgainst) : false;
  const boardFlipped = isOnline ? humanColor === "black" : state.flipped;
  const canMoveNow = canInteract && canPlayerMove();

  const shortClockLabel = (label: string) => {
    const short = label.split(" · ")[0]?.trim() || label;
    return short.length > 14 ? `${short.slice(0, 13)}…` : short;
  };

  const renderPlayerBar = (color: "white" | "black") => {
    const info = color === "black" ? blackInfo : whiteInfo;
    const rating = color === "black" ? blackRating : whiteRating;
    return (
      <PlayerBar
        color={color}
        isActive={state.turn === color && !gameOver}
        isAi={info.isAi}
        label={info.label}
        rating={rating}
        captured={state.captured}
        pieceSet={settings.pieceSet}
        isThinking={state.isAiThinking && options?.aiColor === color}
        showTimer={showTimer}
      />
    );
  };

  const turnText = state.winner || state.drawReason
    ? getTurnStatusCopy({
        winner: state.winner,
        drawReason: state.drawReason,
        winReason: state.winReason,
        humanColor: options?.humanColor,
      })
      : inReview
        ? `Reviewing move ${state.viewPly}`
        : online.opponentDisconnected && isOnline
          ? "Opponent disconnected"
          : state.isAiThinking
        ? options?.playAgainst === "stockfish"
          ? "Stockfish thinking..."
          : "Minimax thinking..."
        : isOnline && state.turn !== humanColor
          ? "Opponent's turn"
        : state.inCheck
          ? `${state.turn} is in check!`
          : `${state.turn === "white" ? "White" : "Black"} to move`;

  const requestResign = useCallback(() => {
    if (!gameOver) setResignConfirmOpen(true);
  }, [gameOver]);

  const confirmResign = useCallback(() => {
    setResignConfirmOpen(false);
    if (options && isOnlineMode(options.playAgainst)) {
      online.resign();
      const winner = options.humanColor === "white" ? "black" : "white";
      applyOnlineGameOver({ winner, winReason: "resignation" });
      return;
    }
    resign();
  }, [resign, options, online, applyOnlineGameOver]);

  const handleOfferDraw = useCallback(() => {
    if (options && isOnlineMode(options.playAgainst)) {
      online.offerDraw();
      return;
    }
    offerDraw();
  }, [offerDraw, options, online]);

  const gameActions = {
    onUndo: undo,
    onFlip: flipBoard,
    onReset: handleMenu,
    onNewGame: handleNewGame,
    onResign: requestResign,
    onOfferDraw: handleOfferDraw,
    onHint: showHint,
    onExportPGN: exportGamePGN,
    onExportFEN: exportGameFEN,
    onOpenSettings: () => setSettingsOpen(true),
  };

  const toolbarProps = {
    gameOver,
    inReview,
    isAnimating: state.isAnimating,
    isHintLoading: state.isHintLoading,
    hintsUsed: state.hintsUsed,
    allowDraw: !vsComputer,
    allowFlip: !isOnline,
    ...gameActions,
    onOfferDraw: handleOfferDraw,
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (screen !== "game" || !started) return;
    if (e.target instanceof HTMLInputElement) return;
    switch (e.key.toLowerCase()) {
      case "u": undo(); break;
      case "f": flipBoard(); break;
      case "r": requestResign(); break;
      case "h": if (!gameOver) showHint(); break;
      case "d": if (!gameOver) handleOfferDraw(); break;
      case "escape":
        setResignConfirmOpen(false);
        setSettingsOpen(false);
        break;
    }
  }, [screen, started, undo, flipBoard, requestResign, showHint, handleOfferDraw, gameOver]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const humanWon = state.winner && options?.humanColor === state.winner;
  const { eval: positionEval, isLoading: evalLoading } = usePositionEval(
    state.positionFen,
    started && screen === "game"
  );

  if (loading && screen === "landing") {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center p-8">
        <div className="w-full max-w-md"><BoardSkeleton /></div>
      </div>
    );
  }

  const turnPillClass = state.winner || state.drawReason
    ? "turn-pill"
    : state.inCheck
      ? "turn-pill turn-pill--check"
      : "turn-pill turn-pill--active";

  return (
    <div className="min-h-screen app-bg app-bg--mesh relative">
      <ConfettiCelebration active={!!humanWon} />

      {screen === "landing" && (
        <LandingPage
          onPlay={() => setScreen("setup")}
          onStats={() => setScreen("stats")}
          onLogin={() => { setAuthTab("login"); setScreen("auth"); }}
          onSignup={() => { setAuthTab("register"); setScreen("auth"); }}
        />
      )}
      {screen === "auth" && (
        <AuthScreen
          initialTab={authTab}
          title={authTab === "register" ? "Create your account" : "Welcome back"}
          subtitle={authTab === "register" ? "Sign up to play online with friends" : "Login to join multiplayer rooms"}
          onBack={() => setScreen("landing")}
          onSuccess={() => setScreen("landing")}
        />
      )}
      {screen === "setup" && (
        <StartScreen
          onStart={handleStart}
          onOnline={handleOnlineLobby}
          onResume={handleResume}
          onStats={() => setScreen("stats")}
        />
      )}
      {screen === "online" && (
        authLoading ? (
          <div className="min-h-screen app-bg flex items-center justify-center">
            <div className="text-white/50 text-sm">Loading account…</div>
          </div>
        ) : !user || !token ? (
          <AuthScreen
            initialTab="login"
            title="Login for online play"
            subtitle="Multiplayer rooms require a free account"
            onBack={() => { online.reset(); setPendingJoinCode(""); setScreen("setup"); }}
            onSuccess={() => setScreen("online")}
          />
        ) : (
          <OnlineLobby
            timeControl={onlineTimeControlRef.current}
            status={online.status}
            roomId={online.roomId}
            error={online.error}
            initialJoinCode={pendingJoinCode}
            assignedColor={online.color}
            userName={user.displayName}
            onBack={() => { online.reset(); setPendingJoinCode(""); setScreen("setup"); }}
            onCreateRoom={() => online.createRoom(onlineTimeControlRef.current, token)}
            onJoinRoom={(code) => online.joinRoom(code, token)}
          />
        )
      )}
      {screen === "stats" && (
        <StatsScreen onBack={() => setScreen("landing")} />
      )}

      {screen === "game" && started && (
        <div className="relative z-10 min-h-screen flex flex-col">
          <header className="game-header">
            <button onClick={handleMenu} className="game-header__brand">
              <span className="game-header__logo">
                <Crown className="w-4 h-4" />
              </span>
              <span className="hidden sm:inline">Chess Master</span>
            </button>
            <div className="flex items-center gap-2 min-w-0">
              {isOnline && (
                <span className={`online-color-badge online-color-badge--${humanColor}`}>
                  {humanColor === "white" ? "♔ White" : "♚ Black"}
                </span>
              )}
              <div className={`${turnPillClass} min-w-0`} title={turnText}>
                {!state.winner && !state.drawReason && !state.isAiThinking && !inReview && (
                  <span className="turn-pill__dot" />
                )}
                <span className="truncate">{turnText}</span>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={showHint}
                disabled={!canInteract || state.isHintLoading}
                title="Hint (H)"
                className="btn-icon btn-icon--gold lg:hidden disabled:opacity-30"
              >
                <Lightbulb className={`w-5 h-5 ${state.isHintLoading ? "animate-pulse" : ""}`} />
              </button>
              <button onClick={() => setSettingsOpen(true)} className="btn-icon" title="Settings">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </header>

          <div className="game-layout flex-1 flex justify-center items-start lg:items-center gap-4 lg:gap-5 px-2 sm:px-4 py-2 lg:py-4">
            <div className="game-board-column flex flex-col gap-1.5 min-h-0 min-w-0">
              {renderPlayerBar(opponentColor)}

              <OpeningStrip
                name={state.openingName}
                recognized={state.openingRecognized}
              />

              <div className="board-play-area flex-1 min-h-0">
                {showTimer && (
                  <GameClockRail
                    topColor={opponentColor}
                    bottomColor={humanColor}
                    topActive={state.turn === opponentColor && !gameOver}
                    bottomActive={state.turn === humanColor && !gameOver}
                    topLabel={shortClockLabel(opponentColor === "white" ? whiteInfo.label : blackInfo.label)}
                    bottomLabel={shortClockLabel(humanColor === "white" ? whiteInfo.label : blackInfo.label)}
                  />
                )}
                <div className="board-eval-row flex-1 min-h-0">
                <EvalBar
                  eval={positionEval}
                  flipped={boardFlipped}
                  isLoading={evalLoading}
                />
                <ChessBoard
                  pieces={state.pieces}
                  turn={state.turn}
                  selectedPiece={state.selectedPiece}
                  allowedMoves={state.allowedMoves}
                  lastMove={state.lastMove}
                  flipped={boardFlipped}
                  inCheck={state.inCheck}
                  animating={state.animating}
                  moveDurationMs={ANIMATION_MS[settings.animationSpeed]}
                  canInteract={canMoveNow}
                  theme={settings.theme}
                  pieceSet={settings.pieceSet}
                  showMoveArrow={settings.showMoveArrow}
                  hint={state.hint}
                  moveCount={state.moveCount}
                  threatSquares={settings.showThreats ? state.threatenedSquares : []}
                  onSquareClick={tryMove}
                  onPieceSelect={selectPiece}
                  onPieceDrop={attemptMove}
                />
                </div>
              </div>

              {renderPlayerBar(humanColor)}

              {state.hint && !inReview && !state.isHintLoading && (
                <p className="hint-banner text-center text-xs text-[#d4a853] font-mono">
                  Hint: {state.hint.notation}
                </p>
              )}

              <div className="lg:hidden flex flex-col gap-2 min-h-0">
                <MoveList
                  moveLog={state.moveLog}
                  activePly={state.viewPly}
                  onGotoMove={gotoMove}
                  onExitReview={exitReview}
                  inReview={inReview}
                  compact
                />
                <GameToolbar {...toolbarProps} compact />
              </div>
            </div>

            <div className="hidden lg:flex game-right-panel-wrap shrink-0">
              <GameSidebar
                state={state}
                allowDraw={!vsComputer}
                allowFlip={!isOnline}
                onGotoMove={gotoMove}
                onExitReview={exitReview}
                {...gameActions}
              />
            </div>
          </div>
        </div>
      )}

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)}
        onOpenTutorial={() => { setSettingsOpen(false); setTutorialOpen(true); }} />
      <Tutorial open={tutorialOpen} onClose={() => setTutorialOpen(false)} />

      {state.pendingPromotion && pendingPiece && (
        <PromotionModal color={pendingPiece.color} onSelect={promote} />
      )}

      <ConfirmModal
        open={resignConfirmOpen}
        title="Resign game?"
        message={trackElo
          ? "Are you sure you want to resign? This will count as a loss and may lower your rating."
          : "Are you sure you want to resign? This will count as a loss."}
        confirmLabel="Yes, resign"
        cancelLabel="Keep playing"
        danger
        onConfirm={confirmResign}
        onCancel={() => setResignConfirmOpen(false)}
      />

      <ConfirmModal
        open={drawOfferIncoming}
        title="Draw offered"
        message="Your opponent has offered a draw. Do you accept?"
        confirmLabel="Accept draw"
        cancelLabel="Decline"
        onConfirm={() => {
          online.acceptDraw();
          setDrawOfferIncoming(false);
        }}
        onCancel={() => {
          online.declineDraw();
          setDrawOfferIncoming(false);
        }}
      />

      {gameOver && (
        <GameOverModal
          winner={state.winner}
          winReason={state.winReason}
          drawReason={state.drawReason}
          humanColor={options?.humanColor}
          eloSnapshot={state.eloSnapshot}
          rated={vsComputer ? trackElo : undefined}
          canReview={vsComputer && state.moveLog.length > 0}
          onReview={() => {
            setReviewHistory(getGameHistory());
            setReviewOpen(true);
          }}
          onNewGame={handleNewGame}
          onMenu={handleMenu}
        />
      )}

      <GameReviewModal
        open={reviewOpen}
        history={reviewHistory}
        humanColor={humanColor}
        onClose={() => setReviewOpen(false)}
      />
    </div>
  );
}
