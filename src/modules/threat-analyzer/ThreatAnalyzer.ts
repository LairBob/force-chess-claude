import { Chess } from 'chess.js'
import { ALL_SQUARES, type Square, type SquareControl, type ThreatMap } from './types'

type Color = 'w' | 'b'

export function analyze(fen: string): ThreatMap {
  const chess = new Chess(fen)

  const squares = {} as Record<Square, SquareControl>
  for (const sq of ALL_SQUARES) {
    squares[sq] = {
      whiteAttackers: chess.attackers(sq, 'w').length,
      blackAttackers: chess.attackers(sq, 'b').length,
    }
  }

  const inertPieceSquares = new Set<Square>()
  for (const sq of ALL_SQUARES) {
    const piece = chess.get(sq)
    if (!piece || piece.type === 'k') continue
    if (isAbsolutelyPinned(fen, sq, piece.color)) {
      inertPieceSquares.add(sq)
    }
  }

  return { squares, inertPieceSquares }
}

function isAbsolutelyPinned(fen: string, sq: Square, color: Color): boolean {
  const test = new Chess(fen)
  const kingSq = findKing(test, color)
  if (!kingSq) return false
  const enemy: Color = color === 'w' ? 'b' : 'w'
  // If the king is already in check, removing the candidate piece can't *cause* a
  // pin discovery — any "now-in-check" result is the pre-existing checker still
  // attacking, not this piece's removal. Skip to avoid false positives.
  if (test.isAttacked(kingSq, enemy)) return false
  test.remove(sq)
  return test.isAttacked(kingSq, enemy)
}

function findKing(chess: Chess, color: Color): Square | null {
  const found = chess.findPiece({ type: 'k', color })
  return found.length > 0 ? found[0] : null
}
