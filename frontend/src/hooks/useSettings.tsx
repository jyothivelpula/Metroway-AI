import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppSettings } from "../types";

const STORAGE_KEY = "metroway.settings";

const DEFAULTS: AppSettings = {
  language: "en",
  largeText: false,
  highContrast: false,
  preferLifts: false,
  avoidStairs: false,
};

type SettingsContextValue = {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    document.documentElement.dataset.largeText = settings.largeText ? "true" : "false";
    document.documentElement.dataset.contrast = settings.highContrast ? "high" : "default";
  }, [settings]);

  const value = useMemo(
    () => ({
      settings,
      update: (patch: Partial<AppSettings>) => setSettings((prev) => ({ ...prev, ...patch })),
    }),
    [settings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
