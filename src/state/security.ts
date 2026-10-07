/**
 * Parent passcode. The site is static (no server), so this is a parental lock, not real security:
 * the passcode is stored only as a salted PBKDF2-SHA-256 hash in this browser. There is no recovery code: a forgotten
 * passcode is reset by clearing this site's data in the browser (which also resets settings and progress).
 */
import { load, remove, save } from './persistence';

export interface PasscodeRecord {
  readonly salt: string;
  readonly hash: string;
  readonly iterations: number;
}

export interface LockoutState {
  readonly failures: number;
  readonly lockedUntil: number;
}

const KEY = 'parent-lock';
const LOCKOUT_KEY = 'parent-lockout';
export const ITERATIONS = 120_000;

export function isValidPasscode(code: string): boolean {
  return /^\d{4,8}$/.test(code);
}

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  globalThis.crypto.getRandomValues(out);
  return out;
}

export async function deriveHash(input: string, saltHex: string, iterations = ITERATIONS): Promise<string> {
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey('raw', enc.encode(input), 'PBKDF2', false, ['deriveBits']);
  const salt = new Uint8Array(saltHex.match(/../g)?.map((h) => parseInt(h, 16)) ?? []);
  const bits = await globalThis.crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return toHex(bits);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createPasscode(passcode: string): Promise<{ record: PasscodeRecord }> {
  if (!isValidPasscode(passcode)) throw new Error('Passcode must be 4 to 8 digits.');
  const salt = toHex(randomBytes(16));
  const record: PasscodeRecord = { salt, iterations: ITERATIONS, hash: await deriveHash(passcode, salt) };
  return { record };
}

export async function verifyPasscode(passcode: string, record: PasscodeRecord): Promise<boolean> {
  return timingSafeEqual(await deriveHash(passcode, record.salt, record.iterations), record.hash);
}

/** After 5 wrong tries, wait 30 s, doubling each further miss (max 15 min). */
export function lockoutAfterFailure(state: LockoutState, now: number): LockoutState {
  const failures = state.failures + 1;
  const lockedUntil = failures >= 5 ? now + Math.min(15 * 60_000, 30_000 * 2 ** (failures - 5)) : 0;
  return { failures, lockedUntil };
}

export function loadPasscode(): PasscodeRecord | null {
  return load<PasscodeRecord>(KEY);
}
export function savePasscode(r: PasscodeRecord): void {
  save(KEY, r);
}
export function clearPasscode(): void {
  remove(KEY);
}
export function loadLockout(): LockoutState {
  return load<LockoutState>(LOCKOUT_KEY) ?? { failures: 0, lockedUntil: 0 };
}
export function saveLockout(s: LockoutState): void {
  save(LOCKOUT_KEY, s);
}
