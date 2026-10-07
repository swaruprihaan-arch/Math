import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { emptyProgress, loadProgress, saveProgress, type ProgressStore } from '../state/progress';
import { clearPasscode, loadPasscode, saveLockout } from '../state/security';
import { loadSettings, saveSettings, type AppSettings } from '../state/settings';

interface AppContextValue {
  settings: AppSettings;
  updateSettings: (fn: (s: AppSettings) => AppSettings) => void;
  progress: ProgressStore;
  updateProgress: (fn: (p: ProgressStore) => ProgressStore) => void;
  parentUnlocked: boolean;
  unlockParent: () => void;
  lockParent: () => void;
  /** Is a passcode set? Default: none, and the grown-ups area is open until one is made. */
  hasPasscode: boolean;
  /** Call after a passcode was saved (unlocks the area for the grown-up who made it). */
  passcodeChanged: () => void;
  /** Removes the passcode: the grown-ups area is open until a new one is made. */
  resetPasscode: () => void;
  /** Clears all progress and quiz history. */
  resetProgress: () => void;
}

const Ctx = createContext<AppContextValue | null>(null);

export function AppProvider({ children, initialSettings, initialProgress }: { children: ReactNode; initialSettings?: AppSettings; initialProgress?: ProgressStore }) {
  const [settings, setSettings] = useState<AppSettings>(() => initialSettings ?? loadSettings());
  const [progress, setProgress] = useState<ProgressStore>(() => initialProgress ?? loadProgress());
  const [hasPasscode, setHasPasscode] = useState(() => loadPasscode() !== null);
  const [unlocked, setParentUnlocked] = useState(false);
  const parentUnlocked = unlocked || !hasPasscode;
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
  const passcodeChanged = useCallback(() => {
    setHasPasscode(loadPasscode() !== null);
    setParentUnlocked(true);
  }, []);
  const resetPasscode = useCallback(() => {
    clearPasscode();
    saveLockout({ failures: 0, lockedUntil: 0 });
    setHasPasscode(false);
    setParentUnlocked(false);
  }, []);
  const resetProgress = useCallback(() => updateProgress(() => emptyProgress()), [updateProgress]);

  // Auto-lock the parent area after inactivity.
  useEffect(() => {
    if (!unlocked || !hasPasscode) return;
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
  }, [unlocked, hasPasscode, settings.autoLockMinutes]);

  const value = useMemo(
    () => ({ settings, updateSettings, progress, updateProgress, parentUnlocked, unlockParent, lockParent, hasPasscode, passcodeChanged, resetPasscode, resetProgress }),
    [settings, updateSettings, progress, updateProgress, parentUnlocked, unlockParent, lockParent, hasPasscode, passcodeChanged, resetPasscode, resetProgress],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside <AppProvider>');
  return v;
}
