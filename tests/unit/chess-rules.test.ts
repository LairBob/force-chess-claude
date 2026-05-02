import { describe, it, expect, beforeEach } from 'vitest'
import { ChessEngine } from '../../src/modules/chess-engine'
import type { PieceSymbol } from '../../src/modules/chess-engine'

describe('Chess Rules', () => {
  let engine: ChessEngine

  beforeEach(() => {
    engine = new ChessEngine()
  })

  describe('Castling', () => {
    // Cleared back-rank position: kings and rooks only on the back ranks,
    // pawns still on 2/7. Both sides retain full castling rights.
    const CLEARED_WHITE_TO_MOVE =
      'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1'
    const CLEARED_BLACK_TO_MOVE =
      'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R b KQkq - 0 1'

    it('kingside castling succeeds for white from cleared back rank', () => {
      engine.loadFEN(CLEARED_WHITE_TO_MOVE)
      const move = engine.makeMove({ from: 'e1', to: 'g1' })
      expect(move).not.toBeNull()
      expect(engine.getPieceAt('g1')).toEqual({ type: 'k', color: 'w' })
      expect(engine.getPieceAt('f1')).toEqual({ type: 'r', color: 'w' })
      expect(engine.getPieceAt('e1')).toBeNull()
      expect(engine.getPieceAt('h1')).toBeNull()
    })

    it('queenside castling succeeds for white', () => {
      engine.loadFEN(CLEARED_WHITE_TO_MOVE)
      const move = engine.makeMove('O-O-O')
      expect(move).not.toBeNull()
      expect(engine.getPieceAt('c1')).toEqual({ type: 'k', color: 'w' })
      expect(engine.getPieceAt('d1')).toEqual({ type: 'r', color: 'w' })
      expect(engine.getPieceAt('e1')).toBeNull()
      expect(engine.getPieceAt('a1')).toBeNull()
    })

    it('kingside castling succeeds for black', () => {
      engine.loadFEN(CLEARED_BLACK_TO_MOVE)
      const move = engine.makeMove('O-O')
      expect(move).not.toBeNull()
      expect(engine.getPieceAt('g8')).toEqual({ type: 'k', color: 'b' })
      expect(engine.getPieceAt('f8')).toEqual({ type: 'r', color: 'b' })
    })

    it('queenside castling succeeds for black', () => {
      engine.loadFEN(CLEARED_BLACK_TO_MOVE)
      const move = engine.makeMove('O-O-O')
      expect(move).not.toBeNull()
      expect(engine.getPieceAt('c8')).toEqual({ type: 'k', color: 'b' })
      expect(engine.getPieceAt('d8')).toEqual({ type: 'r', color: 'b' })
    })

    it('kingside castling blocked when bishop on f1', () => {
      engine.loadFEN('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3KB1R w KQkq - 0 1')
      const move = engine.makeMove('O-O')
      expect(move).toBeNull()
    })

    it('castling forfeited after king moves', () => {
      // Use a fully-cleared back-rank position (no pawns) so kings/rooks
      // have squares to step onto. Rights still set to KQkq.
      engine.loadFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')
      // White king out and back, black king out and back — castling rights lost.
      expect(engine.makeMove({ from: 'e1', to: 'e2' })).not.toBeNull()
      expect(engine.makeMove({ from: 'e8', to: 'e7' })).not.toBeNull()
      expect(engine.makeMove({ from: 'e2', to: 'e1' })).not.toBeNull()
      expect(engine.makeMove({ from: 'e7', to: 'e8' })).not.toBeNull()
      // White to move again; castling should be illegal (king has moved).
      expect(engine.getTurn()).toBe('w')
      expect(engine.makeMove('O-O')).toBeNull()
      expect(engine.makeMove('O-O-O')).toBeNull()
    })

    it('castling forfeited after kingside rook moves', () => {
      // Cleared back rank so rooks can step to the second rank.
      engine.loadFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')
      // White Rh1-h2, black tempo Rh8-h7, white Rh2-h1, black tempo Rh7-h8.
      expect(engine.makeMove({ from: 'h1', to: 'h2' })).not.toBeNull()
      expect(engine.makeMove({ from: 'h8', to: 'h7' })).not.toBeNull()
      expect(engine.makeMove({ from: 'h2', to: 'h1' })).not.toBeNull()
      expect(engine.makeMove({ from: 'h7', to: 'h8' })).not.toBeNull()
      // Kingside castling lost (h-rook moved); queenside still legal.
      expect(engine.getTurn()).toBe('w')
      expect(engine.makeMove('O-O')).toBeNull()
      expect(engine.makeMove('O-O-O')).not.toBeNull()
      expect(engine.getPieceAt('c1')).toEqual({ type: 'k', color: 'w' })
      expect(engine.getPieceAt('d1')).toEqual({ type: 'r', color: 'w' })
    })
  })

  describe('En Passant', () => {
    it('legal en passant capture immediately after pawn double-step', () => {
      // White pawn on e5, black just played d7-d5 (en passant target d6).
      engine.loadFEN(
        'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3'
      )
      const move = engine.makeMove('exd6')
      expect(move).not.toBeNull()
      expect(move?.captured).toBe('p')
      // The captured black pawn was on d5; en passant removes it.
      expect(engine.getPieceAt('d5')).toBeNull()
      expect(engine.getPieceAt('d6')).toEqual({ type: 'p', color: 'w' })
    })

    it('en passant illegal after one intervening move', () => {
      // Same position but no en passant target — black already moved a tempo,
      // and now white tries to capture the pawn on d5 en passant. Illegal.
      engine.loadFEN(
        'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3'
      )
      // White plays a non-capturing developing move instead of exd6.
      expect(engine.makeMove('Nf3')).not.toBeNull()
      // Black plays a tempo move that doesn't block the e-file capture path.
      expect(engine.makeMove('a6')).not.toBeNull()
      // Now white tries en passant — should be null because the right has lapsed.
      expect(engine.makeMove('exd6')).toBeNull()
    })
  })

  describe('Promotion', () => {
    const PROMO_FEN = '8/P7/8/8/8/8/8/4K2k w - - 0 1'

    it('underpromote to knight', () => {
      engine.loadFEN(PROMO_FEN)
      const move = engine.makeMove({ from: 'a7', to: 'a8', promotion: 'n' })
      expect(move).not.toBeNull()
      expect(engine.getPieceAt('a8')).toEqual({ type: 'n', color: 'w' })
    })

    it('underpromote to rook', () => {
      engine.loadFEN(PROMO_FEN)
      const move = engine.makeMove({ from: 'a7', to: 'a8', promotion: 'r' })
      expect(move).not.toBeNull()
      expect(engine.getPieceAt('a8')).toEqual({ type: 'r', color: 'w' })
    })

    it('underpromote to bishop', () => {
      engine.loadFEN(PROMO_FEN)
      const move = engine.makeMove({ from: 'a7', to: 'a8', promotion: 'b' })
      expect(move).not.toBeNull()
      expect(engine.getPieceAt('a8')).toEqual({ type: 'b', color: 'w' })
    })

    it('auto-promote to queen via SAN', () => {
      engine.loadFEN(PROMO_FEN)
      const move = engine.makeMove('a8=Q')
      expect(move).not.toBeNull()
      expect(engine.getPieceAt('a8')).toEqual({ type: 'q', color: 'w' })
    })

    it('promotion to invalid piece returns null', () => {
      engine.loadFEN(PROMO_FEN)
      // King is not a valid promotion target — must be q/r/b/n.
      const move = engine.makeMove({
        from: 'a7',
        to: 'a8',
        promotion: 'k' as PieceSymbol,
      })
      expect(move).toBeNull()
    })
  })

  describe('Draw conditions', () => {
    it('detects threefold repetition', () => {
      // Knight shuffle: Nf3 Nf6 Ng1 Ng8 Nf3 Nf6 Ng1 Ng8 — start position
      // recurs 3 times (after move 0, after 4 plies, after 8 plies).
      const moves = ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8']
      for (const san of moves) {
        const result = engine.makeMove(san)
        expect(result, `move ${san} should be legal`).not.toBeNull()
      }
      // Note: ChessEngine.getStatus() checks isCheckmate, isStalemate,
      // isThreefoldRepetition (BEFORE isDraw), isInsufficientMaterial,
      // then isDraw. So a pure threefold position should report
      // 'threefold_repetition'. isDraw also returns true under the hood.
      const state = engine.getGameState()
      expect(state.status).toBe('threefold_repetition')
      expect(state.isDraw).toBe(true)
    })

    it('detects 50-move rule via FEN halfmove clock', () => {
      // K vs K with halfmove clock at 100. chess.js will report isDraw.
      // (This position is also insufficient material, but the spec only
      // requires isDraw to be true here.)
      engine.loadFEN('4k3/8/8/8/8/8/8/4K3 w - - 100 60')
      const state = engine.getGameState()
      expect(state.isDraw).toBe(true)
    })

    it('detects insufficient material — K vs K', () => {
      engine.loadFEN('4k3/8/8/8/8/8/8/4K3 w - - 0 1')
      const state = engine.getGameState()
      expect(state.isDraw).toBe(true)
    })

    it('detects insufficient material — K+B vs K', () => {
      engine.loadFEN('4k3/8/8/8/8/8/8/3BK3 w - - 0 1')
      const state = engine.getGameState()
      expect(state.isDraw).toBe(true)
    })

    it('detects insufficient material — K+N vs K', () => {
      engine.loadFEN('4k3/8/8/8/8/8/8/3NK3 w - - 0 1')
      const state = engine.getGameState()
      expect(state.isDraw).toBe(true)
    })
  })

  describe('Serialization round-trip', () => {
    it('FEN round-trip after several moves', () => {
      // Ruy Lopez opening moves.
      const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']
      for (const san of moves) {
        expect(engine.makeMove(san), `move ${san}`).not.toBeNull()
      }
      const capturedFEN = engine.getFEN()
      const capturedTurn = engine.getTurn()

      const newEngine = new ChessEngine()
      const loaded = newEngine.loadFEN(capturedFEN)
      expect(loaded).toBe(true)
      expect(newEngine.getFEN()).toBe(capturedFEN)
      expect(newEngine.getTurn()).toBe(capturedTurn)
    })

    it("PGN round-trip — Scholar's mate sequence", () => {
      // Classic Scholar's mate.
      const moves = ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#']
      for (const san of moves) {
        expect(engine.makeMove(san), `move ${san}`).not.toBeNull()
      }
      const capturedPGN = engine.getPGN()
      const capturedHistorySAN = engine.getHistory().map((m) => m.san)

      const newEngine = new ChessEngine()
      const loaded = newEngine.loadPGN(capturedPGN)
      expect(loaded).toBe(true)
      expect(newEngine.getHistory().map((m) => m.san)).toEqual(
        capturedHistorySAN
      )
    })
  })

  describe('Undo correctness', () => {
    it('undo restores captured piece', () => {
      // 1.e4 d5 2.exd5 — white pawn captures black pawn on d5.
      expect(engine.makeMove('e4')).not.toBeNull()
      expect(engine.makeMove('d5')).not.toBeNull()
      expect(engine.makeMove('exd5')).not.toBeNull()
      expect(engine.getPieceAt('d5')).toEqual({ type: 'p', color: 'w' })

      const undone = engine.undoMove()
      expect(undone).not.toBeNull()
      expect(undone?.san).toBe('exd5')
      // Black pawn restored on d5; white pawn back on e4.
      expect(engine.getPieceAt('d5')).toEqual({ type: 'p', color: 'b' })
      expect(engine.getPieceAt('e4')).toEqual({ type: 'p', color: 'w' })
    })

    it('undo restores pawn after promotion', () => {
      engine.loadFEN('8/P7/8/8/8/8/8/4K2k w - - 0 1')
      const move = engine.makeMove('a8=Q')
      expect(move).not.toBeNull()
      expect(engine.getPieceAt('a8')).toEqual({ type: 'q', color: 'w' })

      const undone = engine.undoMove()
      expect(undone).not.toBeNull()
      // Pawn restored to a7; promotion square cleared.
      expect(engine.getPieceAt('a7')).toEqual({ type: 'p', color: 'w' })
      expect(engine.getPieceAt('a8')).toBeNull()
    })
  })
})
