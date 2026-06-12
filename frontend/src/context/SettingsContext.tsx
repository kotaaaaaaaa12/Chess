"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { DEFAULT_SETTINGS, type AppSettings } from "@/lib/settings/types";
import { loadJSON, saveJSON } from "@/lib/storage";

const SETTINGS_KEY = "chess-master-settings";

interface SettingsContextValue {
  settings: AppSettings;
  settingsLoaded: boolean;
  updateSettings: (patch: Partial<AppSettings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  useEffect(() => {
    const loaded = loadJSON(SETTINGS_KEY, DEFAULT_SETTINGS) as AppSettings & { theme?: string };
    const theme = ["marble", "green", "brown"].includes(loaded.theme ?? "")
      ? loaded.theme as AppSettings["theme"]
      : DEFAULT_SETTINGS.theme;
    setSettings({
      ...DEFAULT_SETTINGS,
      ...loaded,
      theme,
      pieceSet: loaded.pieceSet ?? "neo",
      trackElo: loaded.trackElo ?? DEFAULT_SETTINGS.trackElo,
      showThreats: loaded.showThreats ?? DEFAULT_SETTINGS.showThreats,
    });
    setSettingsLoaded(true);
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveJSON(SETTINGS_KEY, next);
      return next;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, settingsLoaded, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
