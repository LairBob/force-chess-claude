import type { Square } from 'chess.js'

export type { Square }

export interface SquareControl {
  whiteAttackers: number
  blackAttackers: number
}

export interface ThreatMap {
  squares: Record<Square, SquareControl>
  inertPieceSquares: Set<Square>
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const

export const ALL_SQUARES: readonly Square[] = (() => {
  const out: Square[] = []
  for (const r of RANKS) {
    for (const f of FILES) {
      out.push(`${f}${r}` as Square)
    }
  }
  return out
})()
