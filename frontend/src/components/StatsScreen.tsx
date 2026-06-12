"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, Trophy, TrendingDown, Minus,
  Crown, BarChart3, Play, Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePlayerStats } from "@/hooks/usePlayerStats";
import { fetchGameDetail, fetchGameHistory } from "@/lib/games/client";
import type { GameDetail, GameSummary } from "@/lib/games/types";
import type { GameRecord } from "@/lib/settings/types";
import GameReplayModal from "./GameReplayModal";

interface StatsScreenProps {
  onBack: () => void;
}

function formatDate(ts: number | string) {
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function opponentLabelFromSummary(g: GameSummary | GameRecord) {
  if (g.playAgainst === "online") {
    return `vs ${"opponentName" in g && g.opponentName ? g.opponentName : "Opponent"}`;
  }
  if (g.playAgainst === "human") return "vs Human";
  const engine = g.playAgainst === "stockfish" ? "Stockfish" : "Minimax";
  return `${engine} · ${g.aiDifficulty ?? "medium"}`;
}

export default function StatsScreen({ onBack }: StatsScreenProps) {
  const { user, token } = useAuth();
  const playerStats = usePlayerStats();
  const [dbGames, setDbGames] = useState<GameSummary[]>([]);
  const [loadingDb, setLoadingDb] = useState(!!token);
  const [replayGame, setReplayGame] = useState<GameDetail | null>(null);
  const [replayOpen, setReplayOpen] = useState(false);
  const [loadingReplay, setLoadingReplay] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoadingDb(false);
      return;
    }
    fetchGameHistory()
      .then(setDbGames)
      .finally(() => setLoadingDb(false));
  }, [token]);

  const ratedGames = playerStats.gameHistory.filter((g) => g.rated);
  const winRate = playerStats.gamesPlayed > 0
    ? Math.round((playerStats.wins / playerStats.gamesPlayed) * 100)
    : 0;

  const displayGames: Array<
    | { source: "db"; game: GameSummary }
    | { source: "local"; game: GameRecord }
  > = token && dbGames.length > 0
    ? dbGames.map((g) => ({ source: "db" as const, game: g }))
    : playerStats.gameHistory.map((g) => ({ source: "local" as const, game: g }));

  const handleReplay = useCallback(async (gameId: string) => {
    setLoadingReplay(gameId);
    const detail = await fetchGameDetail(gameId);
    setLoadingReplay(null);
    if (!detail) return;
    setReplayGame(detail);
    setReplayOpen(true);
  }, []);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="setup-screen app-bg--mesh"
      >
        <div className="setup-screen__center">
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="setup-panel stats-panel"
          >
            <div className="setup-panel__header">
              <button type="button" onClick={onBack} className="stats-back-btn">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="setup-panel__title">Your Stats</h1>
                <p className="setup-panel__subtitle">
                  {user ? "Cloud ELO & saved games with replay" : "Local game history"}
                </p>
              </div>
            </div>

            <div className="setup-panel__body custom-scroll">
              <div className="stats-hero">
                <div className="stats-hero__elo">
                  <Trophy className="w-5 h-5 text-[#d4a853]" />
                  <span className="stats-hero__elo-num">{playerStats.elo}</span>
                  <span className="text-white/40 text-xs">
                    ELO{user ? " · cloud" : ""}
                  </span>
                </div>
                <div className="stats-hero__grid">
                  <div className="stats-pill stats-pill--win">
                    <span className="stats-pill__num">{playerStats.wins}</span>
                    <span>Wins</span>
                  </div>
                  <div className="stats-pill stats-pill--loss">
                    <span className="stats-pill__num">{playerStats.losses}</span>
                    <span>Losses</span>
                  </div>
                  <div className="stats-pill stats-pill--draw">
                    <span className="stats-pill__num">{playerStats.draws}</span>
                    <span>Draws</span>
                  </div>
                </div>
                <div className="stats-winrate">
                  <BarChart3 className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>{winRate}% win rate</span>
                  <span className="text-white/30">· {playerStats.gamesPlayed} games played</span>
                </div>
              </div>

              {ratedGames.length > 0 && (
                <section className="setup-section">
                  <p className="setup-label">Rated Summary</p>
                  <div className="stats-rated-summary">
                    <span>{ratedGames.length} rated games</span>
                    <span className="text-[#81b64c]">
                      +{ratedGames.filter((g) => g.eloChange > 0).reduce((s, g) => s + g.eloChange, 0)} total gained
                    </span>
                  </div>
                </section>
              )}

              <section className="setup-section">
                <p className="setup-label">
                  {user ? "Saved Games (Database)" : "Recent Games"}
                </p>
                {loadingDb ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-white/40 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading saved games…
                  </div>
                ) : displayGames.length === 0 ? (
                  <p className="text-white/30 text-sm text-center py-8">
                    {user
                      ? "No saved games yet. Play while logged in!"
                      : "No games played yet. Start a match!"}
                  </p>
                ) : (
                  <div className="stats-game-list">
                    {displayGames.map((entry) => {
                      const g = entry.game;
                      const key = entry.source === "db" ? g.id : (g as GameRecord).id;
                      const playedAt = entry.source === "db"
                        ? (g as GameSummary).playedAt
                        : (g as GameRecord).playedAt;
                      const canReplay = entry.source === "db";

                      return (
                        <div key={key} className="stats-game-row">
                          <div className={`stats-result-icon stats-result-icon--${g.result}`}>
                            {g.result === "win" ? (
                              <Crown className="w-3.5 h-3.5" />
                            ) : g.result === "loss" ? (
                              <TrendingDown className="w-3.5 h-3.5" />
                            ) : (
                              <Minus className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white/90 capitalize">
                                {g.result}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                g.rated ? "bg-[#d4a853]/15 text-[#d4a853]" : "bg-white/10 text-white/35"
                              }`}>
                                {g.rated ? "Rated" : "Casual"}
                              </span>
                            </div>
                            <p className="text-xs text-white/40 truncate">
                              {opponentLabelFromSummary(g)} · {g.moveCount} moves · {g.openingName ?? "—"}
                            </p>
                            <p className="text-[10px] text-white/25">{formatDate(playedAt)}</p>
                          </div>
                          {canReplay ? (
                            <button
                              type="button"
                              onClick={() => handleReplay((g as GameSummary).id)}
                              disabled={loadingReplay === g.id}
                              className="stats-replay-btn"
                            >
                              {loadingReplay === g.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Play className="w-3.5 h-3.5 fill-current" />
                              )}
                              Replay
                            </button>
                          ) : g.rated && g.eloChange !== 0 ? (
                            <span className={`text-sm font-bold shrink-0 ${
                              g.eloChange > 0 ? "text-[#81b64c]" : "text-red-400"
                            }`}>
                              {g.eloChange > 0 ? "+" : ""}{g.eloChange}
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <GameReplayModal
        open={replayOpen}
        game={replayGame}
        onClose={() => {
          setReplayOpen(false);
          setReplayGame(null);
        }}
      />
    </>
  );
}
