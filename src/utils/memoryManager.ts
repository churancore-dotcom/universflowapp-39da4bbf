// LRU AudioBuffer cache — max 10 tracks. Oldest entries evicted automatically
// so long listening sessions don't balloon RAM on mid-range Android devices.

const MAX_BUFFERS = 10;
const cache = new Map<string, AudioBuffer>();

export function getBuffer(key: string): AudioBuffer | undefined {
  const buf = cache.get(key);
  if (!buf) return undefined;
  // Touch — move to most-recently-used position
  cache.delete(key);
  cache.set(key, buf);
  return buf;
}

export function cacheBuffer(key: string, buffer: AudioBuffer): void {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, buffer);
  while (cache.size > MAX_BUFFERS) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

export function hasBuffer(key: string): boolean {
  return cache.has(key);
}

export function clearBuffers(): void {
  cache.clear();
}

export function bufferCacheSize(): number {
  return cache.size;
}
