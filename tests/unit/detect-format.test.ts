import { describe, it, expect } from 'vitest'
import { detectFormat } from '../../src/utils/detectFormat'

describe('detectFormat', () => {
  it('returns "unknown" for empty string', () => {
    expect(detectFormat('')).toBe('unknown')
    expect(detectFormat('   \n\t  ')).toBe('unknown')
  })

  it('detects starting-position FEN', () => {
    expect(detectFormat('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe('fen')
  })

  it('detects FEN with surrounding whitespace', () => {
    expect(detectFormat('   rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b - - 0 1   ')).toBe('fen')
  })

  it('detects PGN with header tag pair', () => {
    const pgn = '[Event "Test"]\n[Site "Local"]\n\n1. e4 e5'
    expect(detectFormat(pgn)).toBe('pgn')
  })

  it('detects PGN with movetext only and a leading move number', () => {
    expect(detectFormat('1. e4 e5 2. Nf3 Nc6')).toBe('pgn')
  })

  it('detects multi-line text as PGN even without explicit signals', () => {
    expect(detectFormat('1. e4 e5\n2. Nf3 Nc6')).toBe('pgn')
  })

  it('returns "unknown" for arbitrary garbage', () => {
    expect(detectFormat('hello world')).toBe('unknown')
    expect(detectFormat('not a chess thing')).toBe('unknown')
  })

  it('returns "unknown" for an incomplete FEN-looking string', () => {
    // Missing active color field
    expect(detectFormat('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')).toBe('unknown')
  })
})
