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
  test.remove(sq)
  const kingSq = findKing(test, color)
  if (!kingSq) return false
  const enemy: Color = color === 'w' ? 'b' : 'w'
  return test.isAttacked(kingSq, enemy)
}

function findKing(chess: Chess, color: Color): Square | null {
  const board = chess.board()
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const cell = board[r][f]
      if (cell && cell.type === 'k' && cell.color === color) {
        const file = 'abcdefgh'[f]
        const rank = 8 - r
        return `${file}${rank}` as Square
      }
    }
  }
  return null
}
