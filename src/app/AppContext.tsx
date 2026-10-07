import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  addChild as addChildTo,
  checkPasscode as checkAccountPasscode,
  deleteAccount,
  getAccount,
  loadChildProgress,
  loadChildSettings,
  loadSignIn,
  removeChild as removeChildFrom,
  renameChild as renameChildIn,
  resetProgress as resetAccountProgress,
  saveAccount,
  saveChildProgress,
  saveChildSettings,
  saveSignIn,
  setParents as setParentsOn,
  withNewPasscode,
  type Account,
  type ChildProfile,
  type SignIn,
  type SignInResult,
} from '../state/accounts';
import { load, save } from '../state/persistence';
import { emptyProgress, loadProgress, saveProgress, type ProgressStore } from '../state/progress';
import { clearPasscode, createPasscode, loadPasscode, saveLockout, savePasscode, verifyPasscode } from '../state/security';
import { loadSettings, saveSettings, type AppSettings } from '../state/settings';

interface AppContextValue {
  /** Settings of the child playing now (in family mode every child has their own). */
  settings: AppSettings;
  updateSettings: (fn: (s: AppSettings) => AppSettings) => void;
  progress: ProgressStore;
  updateProgress: (fn: (p: ProgressStore) => ProgressStore) => void;
  parentUnlocked: boolean;
  unlockParent: () => void;
  lockParent: () => void;
  /** Is a passcode set? Without family mode the default is none (the grown-ups area is open). */
  hasPasscode: boolean;
  /** Checks a passcode (the family account's in family mode). */
  checkPasscode: (pin: string) => Promise<boolean>;
  /** Saves a new passcode and opens the grown-ups area. */
  setPasscode: (pin: string) => Promise<void>;
  /** Removes the passcode (not in family mode: an account always has one). */
  resetPasscode: () => void;
  /** Clears progress of the child playing now. */
  resetProgress: () => void;
  /** Clears progress of every child on the family account. */
  resetAllProgress: () => void;

  /* ---------- family mode ---------- */
  familyMode: boolean;
  setFamilyMode: (on: boolean) => void;
  signIn: SignIn | null;
  account: Account | null;
  activeChild: ChildProfile | null;
  completeSignIn: (result: SignInResult) => void;
  signOut: () => void;
  /** Deletes a family account (and its children's data); signs out if it was the signed-in one. */
  removeAccount: (accountId: string) => void;
  switchChild: (id: string) => void;
  addChild: (name: string) => void;
  removeChild: (id: string) => void;
  renameChild: (id: string, name: string) => void;
  setParents: (names: string[]) => void;
}

const Ctx = createContext<AppContextValue | null>(null);
const FAMILY_KEY = 'family-mode';
/** Family mode is ON by default: the site opens on Sign in / Sign up until someone chooses to play without an account. */
const familyModeStored = () => load<boolean>(FAMILY_KEY) !== false;

export function AppProvider({ children, initialSettings, initialProgress }: { children: ReactNode; initialSettings?: AppSettings; initialProgress?: ProgressStore }) {
  // Tests (and embeds) that pass their own settings start without family mode.
  const [familyMode, setFamilyModeState] = useState(() => initialSettings === undefined && familyModeStored());
  const [signIn, setSignIn] = useState<SignIn | null>(() => (initialSettings === undefined && familyModeStored() ? loadSignIn() : null));
  const [account, setAccount] = useState<Account | null>(() => (signIn ? getAccount(signIn.accountId) : null));
  const childId = account?.activeChildId ?? null;
  const [settings, setSettings] = useState<AppSettings>(() => initialSettings ?? (childId ? loadChildSettings(childId) : loadSettings()));
  const [progress, setProgress] = useState<ProgressStore>(() => initialProgress ?? (childId ? loadChildProgress(childId) : loadProgress()));
  const [hasLocalPasscode, setHasLocalPasscode] = useState(() => loadPasscode() !== null);
  const [unlocked, setParentUnlocked] = useState(() => signIn?.role === 'PARENT');
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const childRef = useRef<string | null>(childId);
  childRef.current = childId;

  const hasPasscode = familyMode ? !!account : hasLocalPasscode;
  const parentUnlocked = familyMode ? !!account && unlocked : unlocked || !hasLocalPasscode;

  const updateSettings = useCallback((fn: (s: AppSettings) => AppSettings) => {
    setSettings((prev) => {
      const next = fn(prev);
      if (childRef.current) saveChildSettings(childRef.current, next);
      else saveSettings(next);
      return next;
    });
  }, []);

  const updateProgress = useCallback((fn: (p: ProgressStore) => ProgressStore) => {
    setProgress((prev) => {
      const next = fn(prev);
      if (childRef.current) saveChildProgress(childRef.current, next);
      else saveProgress(next);
      return next;
    });
  }, []);

  const loadChild = useCallback((id: string | null) => {
    childRef.current = id;
    setSettings(id ? loadChildSettings(id) : loadSettings());
    setProgress(id ? loadChildProgress(id) : loadProgress());
  }, []);

  const commit = useCallback((next: Account) => {
    saveAccount(next);
    setAccount(next);
  }, []);

  const completeSignIn = useCallback(
    (result: SignInResult) => {
      saveSignIn(result.signIn);
      setSignIn(result.signIn);
      setAccount(result.account);
      loadChild(result.account.activeChildId);
      setParentUnlocked(result.signIn.role === 'PARENT');
      saveLockout({ failures: 0, lockedUntil: 0 });
      // Children go straight to the math; grown-ups land on the grown-ups area.
      if (globalThis.location) globalThis.location.hash = result.signIn.role === 'PARENT' ? '#/parent' : '#/';
    },
    [loadChild],
  );

  const signOut = useCallback(() => {
    saveSignIn(null);
    setSignIn(null);
    setAccount(null);
    setParentUnlocked(false);
    loadChild(null);
  }, [loadChild]);

  const removeAccount = useCallback(
    (accountId: string) => {
      deleteAccount(accountId);
      if (account?.id === accountId) signOut();
    },
    [account, signOut],
  );

  const setFamilyMode = useCallback(
    (on: boolean) => {
      save(FAMILY_KEY, on);
      setFamilyModeState(on);
      if (!on) signOut();
      else setParentUnlocked(false); // the Sign in / Sign up screen shows next
    },
    [signOut],
  );

  const switchChild = useCallback(
    (id: string) => {
      if (!account || !account.children.some((c) => c.id === id) || account.activeChildId === id) return;
      commit({ ...account, activeChildId: id });
      loadChild(id);
    },
    [account, commit, loadChild],
  );

  const addChild = useCallback((name: string) => void (account && commit(addChildTo(account, name))), [account, commit]);
  const renameChild = useCallback((id: string, name: string) => void (account && commit(renameChildIn(account, id, name))), [account, commit]);
  const setParents = useCallback((names: string[]) => void (account && commit(setParentsOn(account, names))), [account, commit]);
  const removeChild = useCallback(
    (id: string) => {
      if (!account) return;
      const next = removeChildFrom(account, id);
      if (next === account) return;
      commit(next);
      if (next.activeChildId !== account.activeChildId) loadChild(next.activeChildId);
    },
    [account, commit, loadChild],
  );

  const checkPasscode = useCallback(
    async (pin: string) => {
      if (familyMode) return account ? checkAccountPasscode(account, pin) : false;
      const rec = loadPasscode();
      return rec ? verifyPasscode(pin, rec) : true;
    },
    [familyMode, account],
  );

  const setPasscode = useCallback(
    async (pin: string) => {
      if (familyMode) {
        if (account) commit(await withNewPasscode(account, pin));
      } else {
        savePasscode((await createPasscode(pin)).record);
        setHasLocalPasscode(true);
      }
      setParentUnlocked(true);
    },
    [familyMode, account, commit],
  );

  const resetPasscode = useCallback(() => {
    if (familyMode) return;
    clearPasscode();
    saveLockout({ failures: 0, lockedUntil: 0 });
    setHasLocalPasscode(false);
    setParentUnlocked(false);
  }, [familyMode]);

  const resetProgress = useCallback(() => updateProgress(() => emptyProgress()), [updateProgress]);
  const resetAllProgress = useCallback(() => {
    if (account) resetAccountProgress(account);
    updateProgress(() => emptyProgress());
  }, [account, updateProgress]);

  const lockParent = useCallback(() => setParentUnlocked(false), []);
  const unlockParent = useCallback(() => setParentUnlocked(true), []);

  // Auto-lock the parent area after inactivity (only when a passcode can unlock it again).
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

  const activeChild = account ? (account.children.find((c) => c.id === account.activeChildId) ?? account.children[0] ?? null) : null;

  const value = useMemo(
    () => ({
      settings,
      updateSettings,
      progress,
      updateProgress,
      parentUnlocked,
      unlockParent,
      lockParent,
      hasPasscode,
      checkPasscode,
      setPasscode,
      resetPasscode,
      resetProgress,
      resetAllProgress,
      familyMode,
      setFamilyMode,
      signIn,
      account,
      activeChild,
      completeSignIn,
      signOut,
      removeAccount,
      switchChild,
      addChild,
      removeChild,
      renameChild,
      setParents,
    }),
    [settings, updateSettings, progress, updateProgress, parentUnlocked, unlockParent, lockParent, hasPasscode, checkPasscode, setPasscode, resetPasscode, resetProgress, resetAllProgress, familyMode, setFamilyMode, signIn, account, activeChild, completeSignIn, signOut, removeAccount, switchChild, addChild, removeChild, renameChild, setParents],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside <AppProvider>');
  return v;
}
