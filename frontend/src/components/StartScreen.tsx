"use client";

import { motion } from "framer-motion";
import { Bot, Users, Crown, Swords, Zap, Brain, Flame, Cpu, TrendingUp, Globe } from "lucide-react";
import type { AiDifficulty, GameOptions, PieceColor, PlayMode, TimeControl } from "@/lib/chess/types";
import { isComputerMode, isOnlineMode } from "@/lib/chess/types";
import { useSettings } from "@/context/SettingsContext";
import { BOARD_THEMES } from "@/lib/settings/boardThemes";
import { TIME_CONTROL_LABELS } from "@/lib/settings/types";
import { usePlayerStats } from "@/hooks/usePlayerStats";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { BarChart3 } from "lucide-react";
import ResumeGameBanner from "./ResumeGameBanner";
import type { SavedGame } from "@/lib/storage";

interface StartScreenProps {
  onStart: (options: GameOptions) => void;
  onOnline: (timeControl: TimeControl) => void;
  onResume: (saved: SavedGame) => void;
  onStats: () => void;
}

const MODE_OPTIONS: {
  value: PlayMode;
  label: string;
  sub: string;
  icon: typeof Users;
}[] = [
  { value: "human", label: "vs Human", sub: "Local", icon: Users },
  { value: "minimax", label: "Minimax", sub: "Classic AI", icon: Brain },
  { value: "stockfish", label: "Stockfish", sub: "Pro engine", icon: Cpu },
  { value: "online", label: "Online", sub: "Play friend", icon: Globe },
];

const DIFFICULTY_META: Record<AiDifficulty, { icon: typeof Zap; desc: string }> = {
  easy: { icon: Zap, desc: "Casual" },
  medium: { icon: Brain, desc: "Balanced" },
  hard: { icon: Flame, desc: "Tough" },
};

const TIME_CONTROLS: TimeControl[] = [0, 180, 300, 600, 900];

export default function StartScreen({ onStart, onOnline, onResume, onStats }: StartScreenProps) {
  const { settings, updateSettings } = useSettings();
  const [showResume, setShowResume] = useState(true);
  const [mode, setMode] = useState<PlayMode>("minimax");
  const [humanColor, setHumanColor] = useState<PieceColor>("white");
  const [difficulty, setDifficulty] = useState<AiDifficulty>("medium");
  const [timeControl, setTimeControl] = useState<TimeControl>(300);
  const { user } = useAuth();
  const playerStats = usePlayerStats();
  const playerElo = playerStats.elo;

  const vsComputer = isComputerMode(mode);
  const isOnline = isOnlineMode(mode);

  const handleStart = () => {
    if (isOnline) {
      onOnline(timeControl);
      return;
    }
    onStart({
      playAgainst: mode,
      humanColor: vsComputer ? humanColor : "white",
      aiColor: vsComputer ? (humanColor === "white" ? "black" : "white") : "black",
      aiDifficulty: difficulty,
      timeControl,
      trackElo: vsComputer ? settings.trackElo : false,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="setup-screen app-bg--mesh"
    >
      <div className="setup-screen__center">
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="setup-panel"
        >
          {/* Header — compact */}
          <div className="setup-panel__header">
            <div className="flex items-center gap-3">
              <div className="setup-panel__logo">
                <Crown className="w-5 h-5 text-[#1a1f2e]" />
              </div>
              <div className="text-left min-w-0">
                <h1 className="setup-panel__title">Chess Master</h1>
                <p className="setup-panel__subtitle">Local · AI · Online multiplayer</p>
              </div>
              {vsComputer && settings.trackElo && (
                <div className="setup-panel__elo ml-auto shrink-0" title={user ? "Cloud synced ELO" : "Local ELO"}>
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{playerElo}</span>
                  {user && <span className="text-[9px] opacity-50 ml-0.5">☁</span>}
                </div>
              )}
            </div>
          </div>

          {/* Scrollable options */}
          <div className="setup-panel__body custom-scroll">
            {showResume && (
              <ResumeGameBanner
                onResume={onResume}
                onDismiss={() => setShowResume(false)}
              />
            )}

            <section className="setup-section">
              <p className="setup-label">Choose Opponent</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {MODE_OPTIONS.map(({ value, label, sub, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value)}
                    className={`option-card setup-option ${mode === value ? "selected" : ""}`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${mode === value ? "text-[#d4a853]" : "text-white/40"}`} />
                    <span className={`setup-option__title ${mode === value ? "text-white" : "text-white/70"}`}>
                      {label}
                    </span>
                    <span className="setup-option__sub">{sub}</span>
                  </button>
                ))}
              </div>
            </section>

            {vsComputer && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <section className="setup-section">
                  <p className="setup-label">Your Color</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["white", "black"] as PieceColor[]).map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setHumanColor(color)}
                        className={`option-card setup-color-btn ${humanColor === color ? "selected" : ""}`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full border-2 shrink-0
                            ${color === "white"
                              ? "bg-gradient-to-br from-stone-100 to-stone-300 border-stone-300"
                              : "bg-gradient-to-br from-stone-700 to-stone-900 border-stone-600"
                            }`}
                        />
                        <span className={`capitalize text-sm font-medium ${humanColor === color ? "text-white" : "text-white/60"}`}>
                          {color}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="setup-section">
                  <p className="setup-label">Difficulty</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["easy", "medium", "hard"] as AiDifficulty[]).map((value) => {
                      const { icon: Icon, desc } = DIFFICULTY_META[value];
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setDifficulty(value)}
                          className={`option-card setup-diff-btn ${difficulty === value ? "selected" : ""}`}
                        >
                          <Icon className={`w-4 h-4 ${difficulty === value ? "text-[#d4a853]" : "text-white/40"}`} />
                          <span className={`text-xs font-semibold capitalize ${difficulty === value ? "text-white" : "text-white/60"}`}>
                            {value}
                          </span>
                          <span className="text-[9px] text-white/25">{desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </motion.div>
            )}

            <section className="setup-section">
              <p className="setup-label">Board Theme</p>
              <div className="grid grid-cols-3 gap-2">
                {BOARD_THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => updateSettings({ theme: t.id })}
                    className={`option-card setup-theme-btn ${settings.theme === t.id ? "selected" : ""}`}
                  >
                    <div className="setup-theme-swatch">
                      <div style={{ background: t.light }} />
                      <div style={{ background: t.dark }} />
                    </div>
                    <span className={`text-[10px] font-medium ${settings.theme === t.id ? "text-white" : "text-white/50"}`}>
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="setup-section">
              <p className="setup-label">Time Control</p>
              <div className="time-control-grid">
                {TIME_CONTROLS.map((tc) => (
                  <button
                    key={tc}
                    type="button"
                    onClick={() => setTimeControl(tc)}
                    className={`option-card time-control-btn ${timeControl === tc ? "selected" : ""}`}
                  >
                    {TIME_CONTROL_LABELS[tc]}
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Sticky footer — rated toggle + start always visible */}
          <div className="setup-panel__footer">
            <button type="button" onClick={onStats} className="stats-link-btn mb-3">
              <BarChart3 className="w-4 h-4" />
              View Stats &amp; Game History
            </button>
            {vsComputer && (
              <div className="rated-toggle mb-3">
                <p className="setup-label text-center mb-2">Game Type</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateSettings({ trackElo: true })}
                    className={`rated-toggle__btn ${settings.trackElo ? "rated-toggle__btn--active" : ""}`}
                  >
                    <TrendingUp className="w-4 h-4 shrink-0" />
                    <span className="font-semibold">Rated</span>
                    <span className="text-[10px] opacity-60">ELO counts</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSettings({ trackElo: false })}
                    className={`rated-toggle__btn ${!settings.trackElo ? "rated-toggle__btn--active" : ""}`}
                  >
                    <Swords className="w-4 h-4 shrink-0" />
                    <span className="font-semibold">Unrated</span>
                    <span className="text-[10px] opacity-60">Casual play</span>
                  </button>
                </div>
              </div>
            )}
            <motion.button
              type="button"
              whileTap={{ scale: 0.99 }}
              onClick={handleStart}
              className="btn-primary setup-start-btn"
            >
              {isOnline ? <Globe className="w-5 h-5" /> : vsComputer ? <Bot className="w-5 h-5" /> : <Swords className="w-5 h-5" />}
              {isOnline
                ? "Play Online"
                : vsComputer
                  ? settings.trackElo
                    ? "Start Rated Game"
                    : "Start Unrated Game"
                  : "Start Game"}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
