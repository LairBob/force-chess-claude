import { useMemo } from 'react'
import { analyze, type ThreatMap } from '../modules/threat-analyzer'

const MAX_CACHE = 50
const cache = new Map<string, ThreatMap>()

export function useThreatMap(fen: string): ThreatMap {
  return useMemo(() => {
    const cached = cache.get(fen)
    if (cached) {
      // Touch-on-read: re-insert to mark as most-recent in Map insertion order.
      cache.delete(fen)
      cache.set(fen, cached)
      return cached
    }
    const map = analyze(fen)
    cache.set(fen, map)
    while (cache.size > MAX_CACHE) {
      const oldest = cache.keys().next().value
      if (oldest === undefined) break
      cache.delete(oldest)
    }
    return map
  }, [fen])
}

// Test-only helper. Does not appear in production paths.
export function __resetThreatMapCacheForTests(): void {
  cache.clear()
}
