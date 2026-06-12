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
  subtitle = "Create an account or login to join multiplayer rooms",
  initialTab = "login",
  onBack,
  onSuccess,
}: AuthScreenProps) {
  const { login, register, loginWithGoogle, authError, clearAuthError } = useAuth();
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  const handleSubmit = async () => {
    setError(null);
    clearAuthError();
    setBusy(true);
    try {
      const err =
        tab === "login"
          ? await login(username, password)
          : await register(username, password, displayName || username, email);
      if (err) {
        setError(err);
        return;
      }
      onSuccess?.();
    } finally {
      setBusy(false);
    }
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
          className="setup-panel online-lobby-panel max-w-md"
        >
          <div className="setup-panel__header">
            {onBack && (
              <button type="button" onClick={onBack} className="btn-icon mr-2" disabled={busy}>
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-3 min-w-0">
              <div className="setup-panel__logo">
                <LogIn className="w-5 h-5 text-[#1a1f2e]" />
              </div>
              <div className="text-left min-w-0">
                <h1 className="setup-panel__title">{title}</h1>
                <p className="setup-panel__subtitle">{subtitle}</p>
              </div>
            </div>
          </div>

          <div className="setup-panel__body space-y-4">
            {error && (
              <div className="online-error-banner">
                <p className="font-medium text-red-300">{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={loginWithGoogle}
              disabled={busy}
              className="auth-google-btn w-full"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <div className="online-tabs">
              <button
                type="button"
                onClick={() => setTab("login")}
                className={`online-tab ${tab === "login" ? "online-tab--active" : ""}`}
              >
                <LogIn className="w-4 h-4" />
                Login
              </button>
              <button
                type="button"
                onClick={() => setTab("register")}
                className={`online-tab ${tab === "register" ? "online-tab--active" : ""}`}
              >
                <UserPlus className="w-4 h-4" />
                Register
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-white/40 text-xs uppercase tracking-wider">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="e.g. shubham"
                  className="online-join-input w-full"
                  autoComplete="username"
                />
              </div>

              {tab === "register" && (
                <>
                  <div className="space-y-2">
                    <label className="text-white/40 text-xs uppercase tracking-wider">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
                      placeholder="you@email.com (optional)"
                      className="online-join-input w-full"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-white/40 text-xs uppercase tracking-wider">Display name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value.slice(0, 32))}
                      placeholder="Name shown to opponent"
                      className="online-join-input w-full"
                      autoComplete="nickname"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-white/40 text-xs uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tab === "register" ? "Min 6 characters" : "Your password"}
                  className="online-join-input w-full"
                  autoComplete={tab === "register" ? "new-password" : "current-password"}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy || username.length < 3 || password.length < 6}
              className="btn-primary w-full flex items-center justify-center gap-2 py-4"
            >
              {busy ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : tab === "login" ? (
                <LogIn className="w-5 h-5" />
              ) : (
                <UserPlus className="w-5 h-5" />
              )}
              {busy ? "Please wait…" : tab === "login" ? "Login" : "Create account"}
            </button>

            <p className="text-center text-white/30 text-xs">
              Local & AI games work without login. Online multiplayer requires an account.
            </p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.083 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C33.64 6.053 28.991 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C33.64 6.053 28.991 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.067 0-9.426-3.117-10.937-7.579l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}
