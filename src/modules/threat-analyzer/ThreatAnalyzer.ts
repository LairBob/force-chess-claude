import { Chess } from 'chess.js'
import { ALL_SQUARES, type Square, type SquareControl, type ThreatMap } from './types'

export function analyze(fen: string): ThreatMap {
  const chess = new Chess(fen)

  const squares = {} as Record<Square, SquareControl>
  for (const sq of ALL_SQUARES) {
    squares[sq] = {
      whiteAttackers: chess.attackers(sq, 'w').length,
      blackAttackers: chess.attackers(sq, 'b').length,
    }
  }

  // Pin detection added in Task 3
  const inertPieceSquares = new Set<Square>()

  return { squares, inertPieceSquares }
}
