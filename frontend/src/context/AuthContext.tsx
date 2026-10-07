"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser } from "@/lib/auth/types";
import type { UserStats } from "@/lib/stats/types";
import { mergeCloudStatsIntoLocal } from "@/lib/storage";
import { notifyStatsUpdated } from "@/lib/stats/events";

const TOKEN_KEY = "chess_auth_token";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  login: (username: string, password: string) => Promise<string | null>;
  register: (
    username: string,
    password: string,
    displayName?: string,
    email?: string
  ) => Promise<string | null>;
  loginWithGoogle: () => void;
  logout: () => void;
  updateUserStats: (stats: UserStats) => void;
  updateProfile: (input: {
    username: string;
    displayName: string;
  }) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function authRequest(
  path: "/api/auth/login" | "/api/auth/register",
  body: Record<string, string>
): Promise<{ token: string; user: AuthUser } | { error: string }> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { token?: string; user?: AuthUser; error?: string };
  if (!res.ok || !data.token || !data.user) {
    return { error: data.error ?? "Request failed" };
  }
  return { token: data.token, user: data.user };
}

async function fetchMe(token: string): Promise<AuthUser | null> {
  const res = await fetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { user: AuthUser };
  if (data.user?.stats) {
    mergeCloudStatsIntoLocal(data.user.stats);
    notifyStatsUpdated();
  }
  return data.user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const persistSession = useCallback((nextToken: string, nextUser: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    if (nextUser.stats) {
      mergeCloudStatsIntoLocal(nextUser.stats);
      notifyStatsUpdated();
    }
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const updateUserStats = useCallback((stats: UserStats) => {
    setUser((prev) => (prev ? { ...prev, stats } : prev));
    mergeCloudStatsIntoLocal(stats);
    notifyStatsUpdated();
  }, []);

  const updateProfile = useCallback(
    async (input: { username: string; displayName: string }) => {
      const activeToken = token ?? localStorage.getItem(TOKEN_KEY);
      if (!activeToken) return "Not authenticated";

      try {
        const res = await fetch("/api/auth/profile", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${activeToken}`,
          },
          body: JSON.stringify(input),
        });
        const data = (await res.json()) as {
          user?: AuthUser;
          token?: string;
          error?: string;
        };
        if (!res.ok || !data.user) {
          return data.error ?? "Failed to update profile";
        }
        if (data.token) {
          persistSession(data.token, data.user);
        } else {
          setUser(data.user);
        }
        return null;
      } catch {
        return "Network error — try again";
      }
    },
    [token, persistSession]
  );

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const loginWithGoogle = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/providers");
      const providers = await response.json() as { google?: boolean };
      if (!response.ok || !providers.google) {
        setAuthError("Google sign-in is unavailable. Use your username and password.");
        return;
      }
      window.location.href = "/api/auth/google";
    } catch {
      setAuthError("Could not connect to the sign-in service. Please try again.");
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      const params = new URLSearchParams(window.location.search);
      const oauthToken = params.get("auth_token");
      const oauthError = params.get("auth_error");

      if (oauthError) {
        setAuthError(decodeURIComponent(oauthError));
        params.delete("auth_error");
        const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
        window.history.replaceState({}, "", next);
      }

      let activeToken = oauthToken || localStorage.getItem(TOKEN_KEY);

      if (oauthToken) {
        localStorage.setItem(TOKEN_KEY, oauthToken);
        setToken(oauthToken);
        params.delete("auth_token");
        const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
        window.history.replaceState({}, "", next);
      }

      if (!activeToken) {
        setLoading(false);
        return;
      }

      const me = await fetchMe(activeToken);
      if (!me) {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setToken(activeToken);
      setUser(me);
      setLoading(false);
    };

    bootstrap();
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await authRequest("/api/auth/login", { username, password });
      if ("error" in result) return result.error;
      persistSession(result.token, result.user);
      return null;
    },
    [persistSession]
  );

  const register = useCallback(
    async (username: string, password: string, displayName?: string, email?: string) => {
      const body: Record<string, string> = { username, password };
      if (displayName?.trim()) body.displayName = displayName.trim();
      if (email?.trim()) body.email = email.trim();
      const result = await authRequest("/api/auth/register", body);
      if ("error" in result) return result.error;
      persistSession(result.token, result.user);
      return null;
    },
    [persistSession]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      authError,
      clearAuthError,
      login,
      register,
      loginWithGoogle,
      logout,
      updateUserStats,
      updateProfile,
    }),
    [user, token, loading, authError, clearAuthError, login, register, loginWithGoogle, logout, updateUserStats, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
