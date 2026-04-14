// Cache layer removed — helpers are no-ops that pass through to the fetcher.
// Re-add a real cache (Redis/Memcached) here when needed.

export async function cacheGet<T>(_key: string): Promise<T | null> {
  return null;
}

export async function cacheSet<T>(_key: string, _value: T, _ttlSeconds: number): Promise<void> {
  // no-op
}

export async function cacheDel(..._keys: string[]): Promise<void> {
  // no-op
}

export async function cacheGetOrSet<T>(
  _key: string,
  _ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  return fetcher();
}
