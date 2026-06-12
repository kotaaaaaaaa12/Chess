"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  Play,
  Cpu,
  Sparkles,
  Zap,
  BarChart3,
  LogIn,
  UserPlus,
  Globe,
  Brain,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import UserNavMenu from "./UserNavMenu";

interface LandingPageProps {
  onPlay: () => void;
  onStats: () => void;
  onLogin?: () => void;
  onSignup?: () => void;
}

const BACK_RANK = [
  "rook",
  "knight",
  "bishop",
  "queen",
  "king",
  "bishop",
  "knight",
  "rook",
] as const;

const STARTING_PIECES = [
  ...BACK_RANK.map((rank, col) => ({
    row: 0,
    col,
    src: `/img/black-${rank}.svg`,
  })),
  ...Array.from({ length: 8 }, (_, col) => ({
    row: 1,
    col,
    src: "/img/black-pawn.svg",
  })),
  ...Array.from({ length: 8 }, (_, col) => ({
    row: 6,
    col,
    src: "/img/white-pawn.svg",
  })),
  ...BACK_RANK.map((rank, col) => ({
    row: 7,
    col,
    src: `/img/white-${rank}.svg`,
  })),
];

const FEATURES = [
  {
    icon: Cpu,
    title: "Stockfish 18",
    desc: "Grandmaster-level engine analysis",
  },
  {
    icon: Globe,
    title: "Online Play",
    desc: "Real-time multiplayer with friends",
  },
  {
    icon: Zap,
    title: "Live Eval",
    desc: "Position evaluation bar in real time",
  },
  {
    icon: Brain,
    title: "Smart Hints",
    desc: "Learn the best move when you're stuck",
  },
];

export default function LandingPage({
  onPlay,
  onStats,
  onLogin,
  onSignup,
}: LandingPageProps) {
  const { user, loading } = useAuth();
  const isLoggedIn = !!user;

  return (
    <div className={`landing-page app-bg app-bg--mesh ${isLoggedIn ? "landing-page--authed" : ""}`}>
      <motion.nav
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="landing-topnav"
      >
        <div className="landing-topnav__brand">
          <span className="landing-topnav__logo" aria-hidden="true">
            <Image src="/img/white-king.svg" alt="" width={20} height={20} />
          </span>
          <span className="landing-topnav__name">
            Chess<span className="landing-topnav__name-accent">Master</span>
          </span>
        </div>

        <div className="landing-topnav__actions">
          {loading ? (
            <div className="landing-auth-loading">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : isLoggedIn ? (
            <UserNavMenu />
          ) : (
            <div className="landing-auth-btns">
              {onLogin && (
                <button type="button" onClick={onLogin} className="landing-auth-btn landing-auth-btn--ghost">
                  <LogIn className="w-4 h-4" />
                  Login
                </button>
              )}
              {onSignup && (
                <button type="button" onClick={onSignup} className="landing-auth-btn landing-auth-btn--primary">
                  <UserPlus className="w-4 h-4" />
                  Sign Up
                </button>
              )}
            </div>
          )}
        </div>
      </motion.nav>

      <div className="landing-ambient" aria-hidden="true">
        <div className="landing-orb landing-orb--green" />
        <div className="landing-orb landing-orb--gold" />
        <div className="landing-orb landing-orb--violet" />
      </div>

      <div className="landing-shell">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="landing-visual"
        >
          <div className="landing-board-stage">
            <div className="landing-board-frame">
              <div className="landing-board-inner">
                <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
                  {Array.from({ length: 64 }, (_, i) => {
                    const row = Math.floor(i / 8);
                    const col = i % 8;
                    const isLight = (row + col) % 2 === 0;
                    return (
                      <div
                        key={i}
                        className={isLight ? "landing-sq-light" : "landing-sq-dark"}
                      />
                    );
                  })}
                </div>
                <div className="landing-board-pieces">
                  {STARTING_PIECES.map((piece) => (
                    <div
                      key={`${piece.row}-${piece.col}-${piece.src}`}
                      className="landing-piece-cell"
                      style={{
                        gridRow: piece.row + 1,
                        gridColumn: piece.col + 1,
                      }}
                    >
                      <Image
                        src={piece.src}
                        alt=""
                        width={72}
                        height={72}
                        className="landing-piece-img"
                        draggable={false}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="landing-eval-mock">
              <div className="landing-eval-fill" />
              <span>0.0</span>
            </div>
          </div>
        </motion.div>

        <div className="landing-content">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="landing-badge"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isLoggedIn ? `Welcome back, ${user.displayName.split(" ")[0]}` : "Premium browser chess"}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.6 }}
            className="landing-title"
          >
            Chess
            <span className="landing-title-accent">Master</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.18 }}
            className="landing-sub"
          >
            {isLoggedIn
              ? "You're ready for online play. Create a room or jump into a local game against Stockfish."
              : "Play against Stockfish, challenge friends online, or practice locally. Beautiful board, live evaluation, and ELO tracking — zero install."}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="landing-feature-grid"
          >
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                className="landing-feature-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32 + i * 0.06 }}
              >
                <div className="landing-feature-card__icon">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="landing-feature-card__title">{title}</p>
                  <p className="landing-feature-card__desc">{desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 120 }}
            className="landing-cta-row"
          >
            <button
              type="button"
              onClick={onPlay}
              className="btn-primary landing-play-btn"
            >
              <Play className="w-5 h-5 fill-current" />
              {isLoggedIn ? "Start Playing" : "Play Now"}
            </button>
            <button type="button" onClick={onStats} className="btn-ghost landing-stats-btn">
              <BarChart3 className="w-4 h-4" />
              Stats & History
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
