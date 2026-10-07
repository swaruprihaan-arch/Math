/**
 * Family accounts (this browser only; the site has no server).
 *
 * An account holds the grown-ups' names, one profile per child and ONE family passcode (stored only as a salted
 * PBKDF2 hash). Each child has their OWN settings and progress, stored under `settings:<childId>` / `progress:<childId>`.
 *
 * Signing in needs a name that is on the account (a grown-up or a child) AND the account's passcode.
 * Several families can share one device: each has its own account.
 */
import { deserialize, load, remove, save, serialize } from './persistence';
import { emptyProgress, type ProgressStore } from './progress';
import { createPasscode, verifyPasscode, type PasscodeRecord } from './security';
import { defaultSettings, sanitizeSettings, type AppSettings } from './settings';

export interface ChildProfile {
  readonly id: string;
  readonly name: string;
}

export interface Account {
  readonly id: string;
  readonly parents: readonly string[];
  readonly children: readonly ChildProfile[];
  readonly activeChildId: string;
  readonly passcode: PasscodeRecord;
}

export type Role = 'PARENT' | 'CHILD';

/** Who is signed in on this tab (kept in sessionStorage, so closing the tab signs out). */
export interface SignIn {
  readonly accountId: string;
  readonly role: Role;
  readonly name: string;
}

const KEY = 'accounts';
const SESSION_KEY = 'rihaan-math:v2:signin';
export const MAX_CHILDREN = 12;
export const MAX_PARENTS = 6;
export const MAX_NAME = 30;

const settingsKey = (id: string) => `settings:${id}`;
const progressKey = (id: string) => `progress:${id}`;

function randomId(prefix: string): string {
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return `${prefix}${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export function cleanName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
}

const same = (a: string, b: string) => cleanName(a).toLocaleLowerCase() === cleanName(b).toLocaleLowerCase();

/** Unique, non-empty names (first spelling kept). */
export function cleanNames(names: readonly string[], max: number): string[] {
  const out: string[] = [];
  for (const n of names) {
    const c = cleanName(n);
    if (c && !out.some((o) => same(o, c))) out.push(c);
  }
  return out.slice(0, max);
}

function sanitizeAccount(raw: unknown): Account | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<Account>;
  if (typeof r.id !== 'string' || !r.passcode || typeof r.passcode.hash !== 'string' || typeof r.passcode.salt !== 'string') return null;
  const children = (Array.isArray(r.children) ? r.children : [])
    .filter((c): c is ChildProfile => !!c && typeof c.id === 'string' && /^[a-z0-9]{1,40}$/i.test(c.id) && typeof c.name === 'string')
    .map((c) => ({ id: c.id, name: cleanName(c.name) || 'Child' }))
    .slice(0, MAX_CHILDREN);
  const parents = cleanNames(Array.isArray(r.parents) ? r.parents.filter((p): p is string => typeof p === 'string') : [], MAX_PARENTS);
  if (children.length === 0 || parents.length === 0) return null;
  const activeChildId = children.some((c) => c.id === r.activeChildId) ? (r.activeChildId as string) : (children[0] as ChildProfile).id;
  return { id: r.id, parents, children, activeChildId, passcode: r.passcode };
}

export function loadAccounts(): Account[] {
  const raw = load<unknown[]>(KEY);
  return Array.isArray(raw) ? raw.map(sanitizeAccount).filter((a): a is Account => a !== null) : [];
}

function saveAccounts(list: readonly Account[]): void {
  save(KEY, list);
}

export function getAccount(id: string): Account | null {
  return loadAccounts().find((a) => a.id === id) ?? null;
}

/** Saves (inserts or replaces) one account. */
export function saveAccount(account: Account): void {
  const list = loadAccounts();
  const i = list.findIndex((a) => a.id === account.id);
  saveAccounts(i >= 0 ? list.map((a) => (a.id === account.id ? account : a)) : [...list, account]);
}

/* ---------- per-child data ---------- */

export function loadChildSettings(id: string): AppSettings {
  const raw = load<AppSettings>(settingsKey(id));
  return raw ? sanitizeSettings(raw) : defaultSettings();
}
export function saveChildSettings(id: string, s: AppSettings): void {
  save(settingsKey(id), s);
}
export function loadChildProgress(id: string): ProgressStore {
  const raw = load<ProgressStore>(progressKey(id));
  return raw && raw.version === 1 ? { ...emptyProgress(), ...raw } : emptyProgress();
}
export function saveChildProgress(id: string, p: ProgressStore): void {
  save(progressKey(id), p);
}

/** Settings for a brand-new child: the defaults with the child's name filled in. */
export function settingsForNewChild(name: string, base: AppSettings = defaultSettings()): AppSettings {
  return { ...base, child: { ...base.child, name, nickname: name.split(' ')[0] ?? name } };
}

/* ---------- sign up / sign in ---------- */

export interface SignUpInput {
  parents: readonly string[];
  children: readonly string[];
  passcode: string;
}

export function validateSignUp(input: SignUpInput): string | null {
  const parents = cleanNames(input.parents, MAX_PARENTS);
  const children = cleanNames(input.children, MAX_CHILDREN);
  if (parents.length === 0) return 'Add at least one grown-up’s name.';
  if (children.length === 0) return 'Add at least one child’s name.';
  if (parents.some((p) => children.some((c) => same(p, c)))) return 'Each name can only be used once.';
  return null;
}

/** Creates an account. The first account on a device takes over settings/progress saved before accounts existed. */
export async function createAccount(input: SignUpInput): Promise<Account> {
  const problem = validateSignUp(input);
  if (problem) throw new Error(problem);
  const parents = cleanNames(input.parents, MAX_PARENTS);
  const names = cleanNames(input.children, MAX_CHILDREN);
  const { record } = await createPasscode(input.passcode);
  const legacySettings = loadAccounts().length === 0 ? load<AppSettings>('settings') : null;
  const legacyProgress = loadAccounts().length === 0 ? load<ProgressStore>('progress') : null;
  const children = names.map((name, i) => {
    const id = randomId('c');
    const base = i === 0 && legacySettings ? sanitizeSettings(legacySettings) : defaultSettings();
    saveChildSettings(id, settingsForNewChild(name, base));
    saveChildProgress(id, i === 0 && legacyProgress?.version === 1 ? { ...emptyProgress(), ...legacyProgress } : emptyProgress());
    return { id, name };
  });
  const account: Account = { id: randomId('a'), parents, children, activeChildId: (children[0] as ChildProfile).id, passcode: record };
  saveAccount(account);
  return account;
}

/** Accounts that have this name (grown-up or child). */
export function accountsWithName(name: string): { account: Account; role: Role; childId?: string }[] {
  const out: { account: Account; role: Role; childId?: string }[] = [];
  for (const account of loadAccounts()) {
    if (account.parents.some((p) => same(p, name))) out.push({ account, role: 'PARENT' });
    const child = account.children.find((c) => same(c.name, name));
    if (child) out.push({ account, role: 'CHILD', childId: child.id });
  }
  return out;
}

export interface SignInResult {
  readonly account: Account;
  readonly signIn: SignIn;
}

/** Name must be on the account and the passcode must match. Returns null otherwise (no hint which part was wrong). */
export async function signInWith(name: string, passcode: string): Promise<SignInResult | null> {
  for (const m of accountsWithName(name)) {
    if (await verifyPasscode(passcode, m.account.passcode)) {
      let account = m.account;
      if (m.role === 'CHILD' && m.childId && account.activeChildId !== m.childId) {
        account = { ...account, activeChildId: m.childId };
        saveAccount(account);
      }
      const shown = m.role === 'PARENT' ? (account.parents.find((p) => same(p, name)) ?? name) : (account.children.find((c) => c.id === m.childId)?.name ?? name);
      return { account, signIn: { accountId: account.id, role: m.role, name: shown } };
    }
  }
  return null;
}

/** Is this passcode right for this account? */
export function checkPasscode(account: Account, passcode: string): Promise<boolean> {
  return verifyPasscode(passcode, account.passcode);
}

export async function withNewPasscode(account: Account, passcode: string): Promise<Account> {
  const { record } = await createPasscode(passcode);
  return { ...account, passcode: record };
}

/* ---------- session ---------- */

export function loadSignIn(): SignIn | null {
  try {
    const raw = globalThis.sessionStorage?.getItem(SESSION_KEY);
    const s = raw ? (JSON.parse(raw) as SignIn) : null;
    if (!s || typeof s.accountId !== 'string' || (s.role !== 'PARENT' && s.role !== 'CHILD') || typeof s.name !== 'string') return null;
    return getAccount(s.accountId) ? s : null;
  } catch {
    return null;
  }
}

export function saveSignIn(s: SignIn | null): void {
  try {
    if (s) globalThis.sessionStorage?.setItem(SESSION_KEY, JSON.stringify(s));
    else globalThis.sessionStorage?.removeItem(SESSION_KEY);
  } catch {
    /* storage is optional */
  }
}

/* ---------- editing an account ---------- */

export function addChild(a: Account, name: string): Account {
  const clean = cleanName(name);
  if (!clean || a.children.length >= MAX_CHILDREN || a.children.some((c) => same(c.name, clean)) || a.parents.some((p) => same(p, clean))) return a;
  const id = randomId('c');
  saveChildSettings(id, settingsForNewChild(clean));
  saveChildProgress(id, emptyProgress());
  return { ...a, children: [...a.children, { id, name: clean }] };
}

/** Removes a child and their data. The last child cannot be removed. */
export function removeChild(a: Account, id: string): Account {
  if (a.children.length <= 1 || !a.children.some((c) => c.id === id)) return a;
  remove(settingsKey(id));
  remove(progressKey(id));
  const children = a.children.filter((c) => c.id !== id);
  return { ...a, children, activeChildId: a.activeChildId === id ? (children[0] as ChildProfile).id : a.activeChildId };
}

export function renameChild(a: Account, id: string, name: string): Account {
  const clean = cleanName(name);
  if (!clean || a.children.some((c) => c.id !== id && same(c.name, clean)) || a.parents.some((p) => same(p, clean))) return a;
  return { ...a, children: a.children.map((c) => (c.id === id ? { ...c, name: clean } : c)) };
}

export function setParents(a: Account, names: readonly string[]): Account {
  const parents = cleanNames(names, MAX_PARENTS).filter((p) => !a.children.some((c) => same(c.name, p)));
  return parents.length ? { ...a, parents } : a;
}

/** Clears progress for one child, or every child of the account. */
export function resetProgress(a: Account, childId?: string): void {
  for (const c of a.children) if (!childId || c.id === childId) saveChildProgress(c.id, emptyProgress());
}

/** Deletes an account and all of its children's settings and progress. */
export function deleteAccount(accountId: string): void {
  const list = loadAccounts();
  const gone = list.find((a) => a.id === accountId);
  if (!gone) return;
  for (const c of gone.children) {
    remove(settingsKey(c.id));
    remove(progressKey(c.id));
  }
  saveAccounts(list.filter((a) => a.id !== accountId));
}

/* ---------- moving a family to another device ---------- */

const TRANSFER_TAG = 'MATHLAB-FAMILY-1';

interface TransferData {
  readonly tag: string;
  readonly account: Account;
  readonly settings: Record<string, AppSettings>;
  readonly progress: Record<string, ProgressStore>;
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64: string): string {
  const bin = atob(b64.replace(/\s+/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** A family code with the account (names, scrambled passcode) and every child's settings and progress. */
export function exportAccount(a: Account): string {
  const data: TransferData = {
    tag: TRANSFER_TAG,
    account: a,
    settings: Object.fromEntries(a.children.map((c) => [c.id, loadChildSettings(c.id)])),
    progress: Object.fromEntries(a.children.map((c) => [c.id, loadChildProgress(c.id)])),
  };
  return toBase64(serialize(data));
}

/**
 * Adds a family from a code made on another device (replaces the same family if it is already here). The passcode
 * stays the same, so everyone signs in exactly as before. Returns null when the code is not a Math Lab family code.
 */
export function importAccount(code: string): Account | null {
  let data: TransferData;
  try {
    data = deserialize<TransferData>(fromBase64(code.trim()));
  } catch {
    return null;
  }
  if (!data || data.tag !== TRANSFER_TAG) return null;
  const account = sanitizeAccount(data.account);
  if (!account) return null;
  for (const c of account.children) {
    saveChildSettings(c.id, sanitizeSettings(data.settings?.[c.id] ?? null));
    const p = data.progress?.[c.id];
    saveChildProgress(c.id, p && p.version === 1 ? { ...emptyProgress(), ...p } : emptyProgress());
  }
  saveAccount(account);
  return account;
}
