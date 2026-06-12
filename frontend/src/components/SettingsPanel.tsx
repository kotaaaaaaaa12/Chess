"use client";

import { motion } from "framer-motion";
import { X, Volume2, VolumeX, Palette, Gauge, Crown, TrendingUp, ShieldAlert } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { BOARD_THEMES } from "@/lib/settings/boardThemes";
import type { PieceSet, AnimationSpeed } from "@/lib/settings/types";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  onOpenTutorial: () => void;
}

const PIECE_SETS: { id: PieceSet; label: string }[] = [
  { id: "neo", label: "Neo" },
  { id: "classic", label: "Classic" },
];

export default function SettingsPanel({ open, onClose, onOpenTutorial }: SettingsPanelProps) {
  const { settings, updateSettings } = useSettings();
  if (!open) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="modal-shell bg-black/70 backdrop-blur-sm z-[60]">
      <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} className="modal-panel glass-panel rounded-xl max-w-md p-6 my-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Settings</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wider mb-2">
              <Palette className="w-3.5 h-3.5" /> Board Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {BOARD_THEMES.map((t) => (
                <button key={t.id} onClick={() => updateSettings({ theme: t.id })}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all
                    ${settings.theme === t.id ? "border-[#81b64c]" : "border-white/10"}`}>
                  <div className="flex w-full h-6 rounded overflow-hidden">
                    <div className="flex-1" style={{ background: t.light }} />
                    <div className="flex-1" style={{ background: t.dark }} />
                  </div>
                  <span className="text-[10px] text-white/60">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wider mb-2">
              <Crown className="w-3.5 h-3.5" /> Piece Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PIECE_SETS.map((p) => (
                <button key={p.id} onClick={() => updateSettings({ pieceSet: p.id })}
                  className={`py-2.5 rounded-lg border text-sm font-medium
                    ${settings.pieceSet === p.id ? "border-[#81b64c] text-[#81b64c] bg-[#81b64c]/10" : "border-white/10 text-white/50"}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wider mb-2">
              <Gauge className="w-3.5 h-3.5" /> Animation Speed
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["slow", "normal", "fast"] as AnimationSpeed[]).map((s) => (
                <button key={s} onClick={() => updateSettings({ animationSpeed: s })}
                  className={`py-2 rounded-lg border text-sm capitalize
                    ${settings.animationSpeed === s ? "border-[#81b64c] text-[#81b64c] bg-[#81b64c]/10" : "border-white/10 text-white/50"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-white/10 hover:bg-white/5">
            <span className="text-white/70 text-sm">Sound Effects</span>
            {settings.soundEnabled ? <Volume2 className="w-5 h-5 text-[#81b64c]" /> : <VolumeX className="w-5 h-5 text-white/30" />}
          </button>

          <button onClick={() => updateSettings({ trackElo: !settings.trackElo })}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-white/10 hover:bg-white/5">
            <span className="flex items-center gap-2 text-white/70 text-sm">
              <TrendingUp className="w-4 h-4" /> Default Game Type
            </span>
            <span className={`text-xs px-2 py-0.5 rounded font-semibold ${settings.trackElo ? "bg-[#d4a853]/20 text-[#d4a853]" : "bg-white/10 text-white/30"}`}>
              {settings.trackElo ? "Rated" : "Unrated"}
            </span>
          </button>

          <button onClick={() => updateSettings({ showMoveArrow: !settings.showMoveArrow })}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-white/10 hover:bg-white/5">
            <span className="text-white/70 text-sm">Move Arrows</span>
            <span className={`text-xs px-2 py-0.5 rounded ${settings.showMoveArrow ? "bg-[#81b64c]/20 text-[#81b64c]" : "bg-white/10 text-white/30"}`}>
              {settings.showMoveArrow ? "ON" : "OFF"}
            </span>
          </button>

          <button onClick={() => updateSettings({ showThreats: !settings.showThreats })}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-white/10 hover:bg-white/5">
            <span className="flex items-center gap-2 text-white/70 text-sm">
              <ShieldAlert className="w-4 h-4" /> Threat Highlights
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${settings.showThreats ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white/30"}`}>
              {settings.showThreats ? "ON" : "OFF"}
            </span>
          </button>

          <button onClick={onOpenTutorial} className="w-full py-2.5 rounded-lg btn-ghost text-sm">
            How to Play (Tutorial)
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
