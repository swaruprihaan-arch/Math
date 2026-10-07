import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { loadProgress, saveProgress, type ProgressStore } from '../state/progress';
import { loadSettings, saveSettings, type AppSettings } from '../state/settings';

interface AppContextValue {
  settings: AppSettings;
  updateSettings: (fn: (s: AppSettings) => AppSettings) => void;
  progress: ProgressStore;
  updateProgress: (fn: (p: ProgressStore) => ProgressStore) => void;
  parentUnlocked: boolean;
  unlockParent: () => void;
  lockParent: () => void;
}

const Ctx = createContext<AppContextValue | null>(null);

export function AppProvider({ children, initialSettings, initialProgress }: { children: ReactNode; initialSettings?: AppSettings; initialProgress?: ProgressStore }) {
  const [settings, setSettings] = useState<AppSettings>(() => initialSettings ?? loadSettings());
  const [progress, setProgress] = useState<ProgressStore>(() => initialProgress ?? loadProgress());
  const [parentUnlocked, setParentUnlocked] = useState(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateSettings = useCallback((fn: (s: AppSettings) => AppSettings) => {
    setSettings((prev) => {
      const next = fn(prev);
      saveSettings(next);
      return next;
    });
  }, []);

  const updateProgress = useCallback((fn: (p: ProgressStore) => ProgressStore) => {
    setProgress((prev) => {
      const next = fn(prev);
      saveProgress(next);
      return next;
    });
  }, []);

  const lockParent = useCallback(() => setParentUnlocked(false), []);
  const unlockParent = useCallback(() => setParentUnlocked(true), []);

  // Auto-lock the parent area after inactivity.
  useEffect(() => {
    if (!parentUnlocked) return;
    const reset = () => {
      if (lockTimer.current) clearTimeout(lockTimer.current);
      lockTimer.current = setTimeout(() => setParentUnlocked(false), settings.autoLockMinutes * 60_000);
    };
    reset();
    const events = ['pointerdown', 'keydown'] as const;
    events.forEach((e) => globalThis.addEventListener(e, reset));
    return () => {
      events.forEach((e) => globalThis.removeEventListener(e, reset));
      if (lockTimer.current) clearTimeout(lockTimer.current);
    };
  }, [parentUnlocked, settings.autoLockMinutes]);

  const value = useMemo(
    () => ({ settings, updateSettings, progress, updateProgress, parentUnlocked, unlockParent, lockParent }),
    [settings, updateSettings, progress, updateProgress, parentUnlocked, unlockParent, lockParent],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside <AppProvider>');
  return v;
}
