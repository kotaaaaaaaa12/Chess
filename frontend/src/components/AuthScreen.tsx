"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

type AuthTab = "login" | "register";
interface AuthScreenProps {
  title?: string;
  subtitle?: string;
  initialTab?: AuthTab;
  onBack?: () => void;
  onSuccess?: () => void;
}

export default function AuthScreen({
  title = "Sign in to play online",
  subtitle = "Use your user ID and password to join multiplayer rooms",
  initialTab = "login",
  onBack,
  onSuccess,
}: AuthScreenProps) {
  const { login, register, authError, clearAuthError } = useAuth();
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setTab(initialTab); }, [initialTab]);
  useEffect(() => { if (authError) setError(authError); }, [authError]);

  const handleSubmit = async () => {
    setError(null);
    clearAuthError();
    setBusy(true);
    try {
      const result = tab === "login" ? await login(username, password) : await register(username, password);
      if (result.error) { setError(result.error); return; }
      if (!result.token || !result.user) { setError("Could not sign in. Please try again."); return; }
      onSuccess?.();
    } finally { setBusy(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="setup-screen app-bg--mesh">
      <div className="setup-screen__center">
        <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="setup-panel online-lobby-panel max-w-md">
          <div className="setup-panel__header">
            {onBack && <button type="button" onClick={onBack} className="btn-icon mr-2" disabled={busy} aria-label="Back"><ArrowLeft className="w-5 h-5" /></button>}
            <div className="flex items-center gap-3 min-w-0">
              <div className="setup-panel__logo"><LogIn className="w-5 h-5 text-[#1a1f2e]" /></div>
              <div className="text-left min-w-0"><h1 className="setup-panel__title">{title}</h1><p className="setup-panel__subtitle">{subtitle}</p></div>
            </div>
          </div>
          <div className="setup-panel__body space-y-4">
            {error && <div className="online-error-banner" role="alert"><p className="font-medium text-red-300">{error}</p></div>}
            <div className="online-tabs">
              <button type="button" disabled={busy} onClick={() => { setTab("login"); setError(null); }} className={`online-tab ${tab === "login" ? "online-tab--active" : ""}`}><LogIn className="w-4 h-4" />Login</button>
              <button type="button" disabled={busy} onClick={() => { setTab("register"); setError(null); }} className={`online-tab ${tab === "register" ? "online-tab--active" : ""}`}><UserPlus className="w-4 h-4" />Register</button>
            </div>
            <form onSubmit={event => { event.preventDefault(); if (!busy) void handleSubmit(); }} className="space-y-3">
              <label className="block space-y-2">
                <span className="text-white/40 text-xs uppercase tracking-wider">User ID</span>
                <input type="text" value={username} onChange={event => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="your_user_id" className="online-join-input w-full" autoComplete="username" autoCapitalize="none" spellCheck={false} minLength={3} maxLength={32} pattern="[a-z0-9_]{3,32}" required disabled={busy} />
                {tab === "register" && <p className="text-xs text-white/50">3–32 letters, numbers, or underscores. Your user ID is also your initial display name.</p>}
              </label>
              <label className="block space-y-2">
                <span className="text-white/40 text-xs uppercase tracking-wider">Password</span>
                <input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder={tab === "register" ? "Min 8 characters" : "Your password"} className="online-join-input w-full" autoComplete={tab === "register" ? "new-password" : "current-password"} minLength={tab === "register" ? 8 : 1} maxLength={128} required disabled={busy} />
              </label>
              <button type="submit" disabled={busy} className="btn-primary w-full flex items-center justify-center gap-2 py-4">
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : tab === "login" ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                {busy ? "Please wait…" : tab === "login" ? "Login" : "Create account"}
              </button>
            </form>
            <p className="text-center text-white/30 text-xs">Local &amp; AI games work without login. Online multiplayer requires an account.</p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
