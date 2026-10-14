"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthUser } from "@/lib/auth/types";
import type { UserStats } from "@/lib/stats/types";
import { mergeCloudStatsIntoLocal } from "@/lib/storage";
import { notifyStatsUpdated } from "@/lib/stats/events";
const TOKEN_KEY = "chess_auth_token";
export type AuthResult = { token?: string; user?: AuthUser; error?: string; message?: string };
export type ProfileInput = { username: string; displayName: string };
interface AuthContextValue {
  user: AuthUser | null; token: string | null; loading: boolean; authError: string | null;
  clearAuthError: () => void;
  login: (username: string, password: string) => Promise<AuthResult>;
  register: (username: string, password: string, displayName?: string) => Promise<AuthResult>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUserStats: (stats: UserStats) => void;
  updateProfile: (input: ProfileInput) => Promise<string | null>;
  changePassword: (currentPassword: string, password: string) => Promise<string | null>;
}
const AuthContext = createContext<AuthContextValue | null>(null);
export async function accountRequest(path: string, body: Record<string, unknown>, token?: string): Promise<AuthResult> {
  try {
    const res = await fetch(`/api/auth/${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
    const data = await res.json() as AuthResult;
    return res.ok ? data : { ...data, error: data.error ?? "The request could not be completed." };
  } catch { return { error: "Could not connect. Please try again." }; }
}
let googleExchange: Promise<AuthResult> | undefined;
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const persistSession = useCallback((nextToken: string, nextUser: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, nextToken); setToken(nextToken); setUser(nextUser);
    mergeCloudStatsIntoLocal(nextUser.stats); notifyStatsUpdated();
  }, []);
  const clearSession = useCallback(() => { localStorage.removeItem(TOKEN_KEY); setToken(null); setUser(null); }, []);
  const refreshUser = useCallback(async () => {
    const active = token ?? localStorage.getItem(TOKEN_KEY);
    if (!active) return;
    const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${active}` } });
    if (res.status === 401) { clearSession(); return; }
    if (!res.ok) throw new Error("Could not refresh your account.");
    const data = await res.json() as { user: AuthUser }; persistSession(active, data.user);
  }, [token, clearSession, persistSession]);
  const logout = useCallback(async () => {
    const active = token ?? localStorage.getItem(TOKEN_KEY);
    const result = await accountRequest("logout", {}, active ?? undefined);
    clearSession();
    if (result.error) setAuthError("Signed out on this device. The server could not confirm session revocation.");
  }, [token, clearSession]);
  const updateUserStats = useCallback((stats: UserStats) => {
    setUser(prev => prev ? { ...prev, stats } : prev); mergeCloudStatsIntoLocal(stats); notifyStatsUpdated();
  }, []);
  const updateProfile = useCallback(async (input: ProfileInput) => {
    const active = token ?? localStorage.getItem(TOKEN_KEY);
    if (!active) return "Not authenticated";
    try {
      const res = await fetch("/api/auth/profile", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${active}` }, body: JSON.stringify(input) });
      const data = await res.json() as AuthResult;
      if (!res.ok || !data.user || !data.token) return data.error ?? "Could not save your profile.";
      persistSession(data.token, data.user); return null;
    } catch { return "Could not connect. Please try again."; }
  }, [token, persistSession]);
  const changePassword = useCallback(async (currentPassword: string, password: string) => {
    const active = token ?? localStorage.getItem(TOKEN_KEY);
    if (!active) return "Not authenticated";
    const result = await accountRequest("change-password", { currentPassword, password }, active);
    if (result.error) return result.error;
    if (!result.token || !result.user) return "Could not update your password.";
    persistSession(result.token, result.user); return null;
  }, [token, persistSession]);
  const clearAuthError = useCallback(() => setAuthError(null), []);
  useEffect(() => {
    let alive = true;
    const bootstrap = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const fragment = new URLSearchParams(window.location.hash.slice(1));
        const error = params.get("auth_error");
        const legacy = params.get("auth_token");
        if (error && alive) setAuthError(error);
        params.delete("auth_error"); params.delete("auth_token");
        const isGoogle = fragment.get("auth_action") === "google";
        if (isGoogle && !googleExchange) {
          googleExchange = accountRequest("exchange", { code: fragment.get("code") ?? "" });
          void googleExchange.finally(() => { googleExchange = undefined; });
        }
        if (error || legacy || isGoogle) window.history.replaceState({}, "", `${window.location.pathname}${params.size ? `?${params}` : ""}${isGoogle ? "" : window.location.hash}`);
        if (googleExchange) {
          const result = await googleExchange;
          if (!alive) return;
          if (result.error || !result.token || !result.user) { setAuthError(result.error ?? "Google sign-in failed."); return; }
          persistSession(result.token, result.user); return;
        }
        const active = legacy ?? localStorage.getItem(TOKEN_KEY);
        if (!active) return;
        const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${active}` } });
        if (!alive) return;
        if (res.status === 401) { clearSession(); return; }
        if (!res.ok) { setAuthError("Could not restore your session. Please refresh and try again."); return; }
        const data = await res.json() as { user: AuthUser };
        if (alive) persistSession(active, data.user);
      } catch { if (alive) setAuthError("Could not connect to your account. Please try again."); }
      finally { if (alive) setLoading(false); }
    };
    void bootstrap();
    const storageChanged = (event: StorageEvent) => { if (event.key === TOKEN_KEY) window.location.reload(); };
    window.addEventListener("storage", storageChanged);
    return () => { alive = false; window.removeEventListener("storage", storageChanged); };
  }, [persistSession, clearSession]);
  const login = useCallback(async (username: string, password: string) => {
    const result = await accountRequest("login", { username, password });
    if (result.token && result.user) persistSession(result.token, result.user);
    return result;
  }, [persistSession]);
  const register = useCallback(async (username: string, password: string, displayName?: string) => {
    const result = await accountRequest("register", { username, password, displayName });
    if (result.token && result.user) persistSession(result.token, result.user);
    return result;
  }, [persistSession]);
  const value = useMemo(() => ({ user, token, loading, authError, clearAuthError, login, register, logout, refreshUser, updateUserStats, updateProfile, changePassword }), [user, token, loading, authError, clearAuthError, login, register, logout, refreshUser, updateUserStats, updateProfile, changePassword]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
