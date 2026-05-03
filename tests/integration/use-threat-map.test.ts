import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useThreatMap, __resetThreatMapCacheForTests } from '../../src/hooks/useThreatMap'

const STARTING = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'

describe('useThreatMap', () => {
  beforeEach(() => {
    __resetThreatMapCacheForTests()
  })

  it('returns referentially-equal ThreatMap when called twice with the same FEN', () => {
    const { result, rerender } = renderHook(({ fen }) => useThreatMap(fen), {
      initialProps: { fen: STARTING },
    })
    const first = result.current
    rerender({ fen: STARTING })
    const second = result.current
    expect(second).toBe(first)
  })

  it('returns a different ThreatMap when FEN changes', () => {
    const { result, rerender } = renderHook(({ fen }) => useThreatMap(fen), {
      initialProps: { fen: STARTING },
    })
    const first = result.current
    rerender({ fen: AFTER_E4 })
    const second = result.current
    expect(second).not.toBe(first)
  })

  it('evicts the oldest entry when cache exceeds capacity (50)', () => {
    // Build 51 distinct positions by varying the halfmove clock (a stable, FEN-legal change)
    const fens: string[] = []
    for (let i = 0; i < 51; i++) {
      fens.push(`rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - ${i} 1`)
    }
    const { result, rerender } = renderHook(({ fen }) => useThreatMap(fen), {
      initialProps: { fen: fens[0] },
    })
    const firstResultRef = result.current

    for (let i = 1; i < 51; i++) {
      rerender({ fen: fens[i] })
    }

    // After 50 newer entries, fens[0] should have been evicted; re-requesting it
    // should produce a fresh object (not referentially equal to firstResultRef).
    rerender({ fen: fens[0] })
    expect(result.current).not.toBe(firstResultRef)
  })
})
