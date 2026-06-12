"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Copy,
  Globe,
  Link2,
  Loader2,
  UserPlus,
  Wifi,
} from "lucide-react";
import type { TimeControl } from "@/lib/settings/types";
import { TIME_CONTROL_LABELS } from "@/lib/settings/types";
import type { OnlineStatus } from "@/hooks/useOnlineMultiplayer";
import type { PieceColor } from "@/lib/chess/types";
import { buildInviteLink } from "@/lib/multiplayer/share";

type LobbyTab = "create" | "join";

interface OnlineLobbyProps {
  timeControl: TimeControl;
  status: OnlineStatus;
  roomId: string | null;
  error: string | null;
  initialJoinCode?: string;
  assignedColor?: PieceColor | null;
  userName?: string;
  onBack: () => void;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
}

type CopyKind = "code" | "link" | null;

export default function OnlineLobby({
  timeControl,
  status,
  roomId,
  error,
  initialJoinCode = "",
  assignedColor = null,
  userName,
  onBack,
  onCreateRoom,
  onJoinRoom,
}: OnlineLobbyProps) {
  const [tab, setTab] = useState<LobbyTab>(initialJoinCode ? "join" : "create");
  const [joinCode, setJoinCode] = useState(initialJoinCode);
  const [copied, setCopied] = useState<CopyKind>(null);

  useEffect(() => {
    if (initialJoinCode) {
      setJoinCode(initialJoinCode);
      setTab("join");
    }
  }, [initialJoinCode]);

  const flashCopied = (kind: CopyKind) => {
    setCopied(kind);
    setTimeout(() => setCopied(null), 2500);
  };

  const copyText = async (text: string, kind: CopyKind) => {
    try {
      await navigator.clipboard.writeText(text);
      flashCopied(kind);
    } catch {
      /* fallback ignored */
    }
  };

  const copyCode = () => roomId && copyText(roomId, "code");
  const copyLink = () => roomId && copyText(buildInviteLink(roomId), "link");

  const busy = status === "connecting";
  const waiting = status === "waiting" && !!roomId;
  const timeLabel = TIME_CONTROL_LABELS[timeControl];

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
          className="setup-panel online-lobby-panel max-w-md"
        >
          {/* Header */}
          <div className="setup-panel__header">
            <button type="button" onClick={onBack} className="btn-icon mr-2" disabled={busy && !waiting}>
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 min-w-0">
              <div className="setup-panel__logo">
                <Globe className="w-5 h-5 text-[#1a1f2e]" />
              </div>
              <div className="text-left min-w-0">
                <h1 className="setup-panel__title">Play Online</h1>
                <p className="setup-panel__subtitle">{timeLabel} · Friend ke saath</p>
              </div>
            </div>
          </div>

          <div className="setup-panel__body space-y-4">
            {userName && (
              <div className="online-user-pill">
                Playing as <strong>{userName}</strong>
              </div>
            )}

            {error && (
              <div className="online-error-banner">
                <p className="font-medium text-red-300">{error}</p>
                {error.includes("Server") && (
                  <p className="text-red-300/70 text-xs mt-1">Terminal mein chalao: npm run server</p>
                )}
              </div>
            )}

            <AnimatePresence mode="wait">
              {waiting ? (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* Room created — share screen */}
                  <div className="online-share-card">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="online-share-badge">Room Ready</span>
                    </div>
                    <p className="text-white/50 text-xs text-center mb-3">
                      Ye code apne friend ko bhejo
                    </p>

                    <div className="online-code-display">
                      {roomId!.split("").map((ch, i) => (
                        <span key={i} className="online-code-char">{ch}</span>
                      ))}
                    </div>

                    <p className="text-center text-white/35 text-xs mt-3">
                      Timer: {timeLabel} · Tum <strong className="text-white/60">White</strong> kheloge
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={copyCode} className="online-share-btn online-share-btn--gold">
                      {copied === "code" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied === "code" ? "Copied!" : "Copy Code"}
                    </button>
                    <button type="button" onClick={copyLink} className="online-share-btn">
                      {copied === "link" ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                      {copied === "link" ? "Copied!" : "Copy Link"}
                    </button>
                  </div>

                  <div className="online-waiting-row">
                    <Loader2 className="w-5 h-5 text-[#81b64c] animate-spin shrink-0" />
                    <span>Opponent ka wait ho raha hai…</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="lobby"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* Tabs */}
                  <div className="online-tabs">
                    <button
                      type="button"
                      onClick={() => setTab("create")}
                      className={`online-tab ${tab === "create" ? "online-tab--active" : ""}`}
                    >
                      <Wifi className="w-4 h-4" />
                      Create Room
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab("join")}
                      className={`online-tab ${tab === "join" ? "online-tab--active" : ""}`}
                    >
                      <UserPlus className="w-4 h-4" />
                      Join Room
                    </button>
                  </div>

                  {tab === "create" ? (
                    <div className="space-y-3">
                      <div className="online-info-card">
                        <p className="font-semibold text-white text-sm mb-2">Room banane ka tarika</p>
                        <ol className="online-steps-list online-steps-list--compact">
                          <li><span>1</span> Neeche button dabao — 6-letter code milega</li>
                          <li><span>2</span> Code ya link friend ko bhejo</li>
                          <li><span>3</span> Friend join kare — game auto start</li>
                        </ol>
                      </div>

                      <button
                        type="button"
                        onClick={onCreateRoom}
                        disabled={busy}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base"
                      >
                        {busy ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Wifi className="w-5 h-5" />
                        )}
                        {busy ? "Connecting…" : "Create Room & Get Code"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="online-info-card">
                        <p className="font-semibold text-white text-sm mb-1">Friend ne code bheja?</p>
                        <p className="text-white/40 text-xs">6-letter code enter karo ya invite link kholo</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-white/40 text-xs uppercase tracking-wider">Room Code</label>
                        <input
                          type="text"
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                          placeholder="e.g. XK4M2P"
                          maxLength={6}
                          className="online-join-input w-full"
                          autoComplete="off"
                          spellCheck={false}
                        />
                        <p className="text-white/25 text-xs text-center">
                          {joinCode.length}/6 characters
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => joinCode.length === 6 && onJoinRoom(joinCode)}
                        disabled={joinCode.length !== 6 || busy}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-4"
                      >
                        {busy ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <UserPlus className="w-5 h-5" />
                        )}
                        {busy ? "Joining…" : "Join Game"}
                      </button>

                      {assignedColor === "black" && busy && (
                        <p className="text-center text-sm text-white/50">
                          Tum <strong className="text-white/80">Black ♚</strong> side se kheloge
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
