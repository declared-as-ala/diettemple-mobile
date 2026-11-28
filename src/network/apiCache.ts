/**
 * Offline cache for GET requests (AsyncStorage). When the network fails, the API layer serves the last good answer so
 * previously loaded content stays usable. Entries are wiped on logout (never shared between accounts).
 *
 * Deliberately NOT cached: authentication, payments, check-in verification, binary/audio downloads, huge bodies.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'apicache:v1:';
const MAX_BODY_CHARS = 400_000;
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // two weeks
const DENY = ['/auth/', '/payments', '/checkin', '/verification', '/audio'];

export interface CacheEntry<T = unknown> {
  at: number;
  data: T;
}

export function isCacheable(method: string | undefined, url: string | undefined, responseType?: string): boolean {
  if (!url || (method ?? 'get').toLowerCase() !== 'get') return false;
  if (responseType && responseType !== 'json') return false;
  return !DENY.some((p) => url.includes(p));
}

export function cacheKey(url: string, params?: Record<string, unknown> | null): string {
  const sorted = params
    ? Object.keys(params)
        .sort()
        .filter((k) => params[k] !== undefined && params[k] !== null)
        .map((k) => `${k}=${String(params[k])}`)
        .join('&')
    : '';
  return `${PREFIX}${url}${sorted ? `?${sorted}` : ''}`;
}

export async function writeCache(key: string, data: unknown, now: () => number = Date.now): Promise<void> {
  try {
    const text = JSON.stringify({ at: now(), data } satisfies CacheEntry);
    if (text.length > MAX_BODY_CHARS) return;
    await AsyncStorage.setItem(key, text);
  } catch {
    /* a full or unavailable cache must never break a request */
  }
}

export async function readCache<T = unknown>(key: string, now: () => number = Date.now): Promise<CacheEntry<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (!entry || typeof entry.at !== 'number' || now() - entry.at > MAX_AGE_MS) return null;
    return entry;
  } catch {
    return null;
  }
}

export async function clearApiCache(): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIX));
    if (keys.length) await AsyncStorage.multiRemove(keys);
  } catch {
    /* nothing to clear */
  }
}
