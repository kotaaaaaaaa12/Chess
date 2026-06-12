"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { STATS_EVENT } from "@/lib/stats/events";
import { loadLeaderboard } from "@/lib/storage";
import type { LeaderboardStats } from "@/lib/settings/types";

export function usePlayerStats(): LeaderboardStats {
  const { user } = useAuth();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const handler = () => setRevision((r) => r + 1);
    window.addEventListener(STATS_EVENT, handler);
    return () => window.removeEventListener(STATS_EVENT, handler);
  }, []);

  return useMemo(() => loadLeaderboard(), [user?.id, user?.stats?.elo, revision]);
}
