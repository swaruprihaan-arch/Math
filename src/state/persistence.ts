/**
 * Browser storage helpers. Storage can be unavailable (private mode, blocked site data), so every access is guarded
 * and the app must work without it. BigInt values are encoded explicitly because JSON.stringify throws on them.
 */
const PREFIX = 'rihaan-math:v2:';

function replacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? { $bigint: value.toString() } : value;
}

function reviver(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && '$bigint' in (value as Record<string, unknown>)) {
    return BigInt((value as { $bigint: string }).$bigint);
  }
  return value;
}

export function serialize(value: unknown): string {
  return JSON.stringify(value, replacer);
}

export function deserialize<T>(text: string): T {
  return JSON.parse(text, reviver) as T;
}

export function load<T>(key: string): T | null {
  try {
    const text = globalThis.localStorage?.getItem(PREFIX + key);
    return text ? deserialize<T>(text) : null;
  } catch {
    return null;
  }
}

export function save(key: string, value: unknown): boolean {
  try {
    globalThis.localStorage?.setItem(PREFIX + key, serialize(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key: string): void {
  try {
    globalThis.localStorage?.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}
