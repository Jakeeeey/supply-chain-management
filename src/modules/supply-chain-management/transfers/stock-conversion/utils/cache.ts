/**
 * Simple in-memory TTL cache for server-side use.
 * Prevents redundant API calls for data that doesn't change frequently
 * (e.g., inventory balances, filter option lists).
 *
 * Uses globalThis to survive Next.js hot reloads in dev mode.
 * Each cache entry is keyed by a string and expires after `ttlMs`.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// Attach to globalThis so the cache survives Next.js hot module reloads
const globalForCache = globalThis as typeof globalThis & {
  __scmTtlCache?: Map<string, CacheEntry<unknown>>;
};

if (!globalForCache.__scmTtlCache) {
  globalForCache.__scmTtlCache = new Map();
}

const store = globalForCache.__scmTtlCache;

/**
 * Returns cached data if it exists and hasn't expired.
 * Otherwise returns `undefined`.
 */
export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.data as T;
}

/**
 * Stores data in the cache with a TTL (time-to-live) in milliseconds.
 */
export function setCache<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/**
 * Removes a specific key from the cache.
 */
export function invalidateCache(key: string): void {
  store.delete(key);
}

/**
 * Clears the entire cache. Useful for testing or forced refresh.
 */
export function clearCache(): void {
  store.clear();
}
