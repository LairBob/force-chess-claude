import { describe, it, expect } from 'vitest'
import { ALL_SQUARES, analyze } from '../../src/modules/threat-analyzer'

describe('ALL_SQUARES', () => {
  it('contains all 64 squares in a8..h1 reading order', () => {
    expect(ALL_SQUARES).toHaveLength(64)
    expect(ALL_SQUARES[0]).toBe('a8')
    expect(ALL_SQUARES[7]).toBe('h8')
    expect(ALL_SQUARES[8]).toBe('a7')
    expect(ALL_SQUARES[63]).toBe('h1')
    expect(new Set(ALL_SQUARES).size).toBe(64) // no duplicates
  })
})

describe('analyze() — pseudo-legal counts', () => {
  const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

  it('starting position: b3 is defended by both a2 and c2 pawns (whiteAttackers === 2)', () => {
    const map = analyze(STARTING_FEN)
    // White pawns attack diagonally: a2 attacks b3; c2 attacks b3 and d3.
    // So b3.whiteAttackers = 2 (a-pawn + c-pawn).
    expect(map.squares.b3.whiteAttackers).toBe(2)
  })

  it('starting position: black pawn diagonal-attack semantics', () => {
    const map = analyze(STARTING_FEN)
    // d6 from c7 + e7 pawns; f6 from e7 + g7 pawns + g8 knight.
    expect(map.squares.d6.blackAttackers).toBe(2)
    expect(map.squares.f6.blackAttackers).toBe(3)
  })

  it('starting position: pawns do NOT attack their forward-move squares', () => {
    const map = analyze(STARTING_FEN)
    // Pawns attack diagonally, not forward. a4 and e4 have zero white attackers because
    // rank 3 is empty — there are no white pieces on rank 3 to attack rank 4 diagonally.
    expect(map.squares.a4.whiteAttackers).toBe(0)
    expect(map.squares.e4.whiteAttackers).toBe(0)
  })

  it('starting position: every square has both counts defined as numbers', () => {
    const map = analyze(STARTING_FEN)
    const sample = [
      'a1',
      'b1',
      'c1',
      'd1',
      'e1',
      'f1',
      'g1',
      'h1',
      'a8',
      'b8',
      'c8',
      'd8',
      'e8',
      'f8',
      'g8',
      'h8',
      'a4',
      'd4',
      'e4',
      'h4',
      'd5',
      'e5',
    ] as const
    for (const sq of sample) {
      expect(typeof map.squares[sq].whiteAttackers).toBe('number')
      expect(typeof map.squares[sq].blackAttackers).toBe('number')
    }
  })

  it('Ruy Lopez after 1.e4 e5 2.Nf3 Nc6 3.Bb5: c6 is attacked by white bishop on b5', () => {
    const RUY = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3'
    const map = analyze(RUY)
    // Bb5 attacks c6 once (and a6, but we test c6).
    expect(map.squares.c6.whiteAttackers).toBe(1)
    // c6 is defended by b7 and d7 pawns — the knight on c6 does NOT attack its own square.
    expect(map.squares.c6.blackAttackers).toBe(2)
  })

  it('Ruy Lopez: e5 is attacked by white knight on f3 (pawn on e4 does NOT attack e5)', () => {
    const RUY = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3'
    const map = analyze(RUY)
    // White: only Nf3 attacks e5. e4 pawn moves forward but doesn't attack e5.
    expect(map.squares.e5.whiteAttackers).toBe(1)
    // Black: only Nc6 attacks e5 (f6 is empty so no f-pawn diagonal; d7 attacks c6 and e6, not e5).
    expect(map.squares.e5.blackAttackers).toBe(1)
  })

  it('inertPieceSquares is empty in the starting position (and stays empty until Task 3)', () => {
    const map = analyze(STARTING_FEN)
    expect(map.inertPieceSquares.size).toBe(0)
  })
})

describe('analyze() — inert (absolute pin) detection', () => {
  it('flags an absolutely-pinned knight in inertPieceSquares', () => {
    // White knight e3 pinned by black rook e5 along the e-file against white king e1.
    // No white pieces between knight and king; removing knight exposes king to rook.
    const fen = '4k3/8/8/4r3/8/4N3/8/4K3 w - - 0 1'
    const map = analyze(fen)
    expect(map.inertPieceSquares.has('e3')).toBe(true)
  })

  it('does NOT flag a knight that is not pinned', () => {
    // Black rook moved to a5 — different rank, different file, no pin.
    const fen = '4k3/8/8/r7/8/4N3/8/4K3 w - - 0 1'
    const map = analyze(fen)
    expect(map.inertPieceSquares.has('e3')).toBe(false)
  })

  it('does NOT flag the kings (kings are never pinned)', () => {
    const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const map = analyze(STARTING_FEN)
    expect(map.inertPieceSquares.has('e1')).toBe(false)
    expect(map.inertPieceSquares.has('e8')).toBe(false)
  })

  it('does NOT flag a piece pinned only against the queen (relative pin)', () => {
    // White knight d4 is on the a1-h8 diagonal between black bishop g7 and white queen a1.
    // The white king is on e1, NOT on the pin line. Removing the knight exposes the
    // queen, not the king. Knight is RELATIVELY pinned and the analyzer must NOT mark
    // it as inert (Phase 4 inert = absolute pin against the king only).
    const fen = '4k3/6b1/8/8/3N4/8/8/Q3K3 w - - 0 1'
    const map = analyze(fen)
    expect(map.inertPieceSquares.has('d4')).toBe(false)
  })

  it("flags both colors' pinned pieces in the same position", () => {
    // - White knight e3 pinned by black rook e5 along the e-file (white king e1).
    // - Black knight e6 pinned by white bishop b3 along the b3-g8 diagonal (black king g8).
    // Two absolute pins, two different sliders, two different geometries.
    const fen = '6k1/8/4n3/4r3/8/1B2N3/8/4K3 w - - 0 1'
    const map = analyze(fen)
    expect(map.inertPieceSquares.has('e3')).toBe(true)
    expect(map.inertPieceSquares.has('e6')).toBe(true)
  })
})
