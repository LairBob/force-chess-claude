import { describe, it, expect, beforeEach } from 'vitest'
import { ChessEngine } from '../../src/modules/chess-engine'

describe('ChessEngine', () => {
  let engine: ChessEngine

  beforeEach(() => {
    engine = new ChessEngine()
  })

  describe('Initialization', () => {
    it('should start with standard position', () => {
      expect(engine.getFEN()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    })

    it('should initialize with custom FEN', () => {
      // Use a position without en passant (chess.js normalizes the en passant square)
      const customFEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
      const customEngine = new ChessEngine(customFEN)
      expect(customEngine.getFEN()).toBe(customFEN)
      expect(customEngine.getTurn()).toBe('b')
    })

    it('should start with white to move', () => {
      expect(engine.getTurn()).toBe('w')
    })

    it('should start at move 1', () => {
      expect(engine.getMoveNumber()).toBe(1)
    })
  })

  describe('Move Execution', () => {
    it('should make a legal move with SAN notation', () => {
      const move = engine.makeMove('e4')
      expect(move).not.toBeNull()
      expect(move?.san).toBe('e4')
      expect(move?.from).toBe('e2')
      expect(move?.to).toBe('e4')
    })

    it('should make a legal move with object notation', () => {
      const move = engine.makeMove({ from: 'e2', to: 'e4' })
      expect(move).not.toBeNull()
      expect(move?.san).toBe('e4')
    })

    it('should return null for illegal move', () => {
      const move = engine.makeMove('e5') // Can't move e5 at start as white
      expect(move).toBeNull()
    })

    it('should return null for invalid notation', () => {
      const move = engine.makeMove('invalid')
      expect(move).toBeNull()
    })

    it('should switch turn after move', () => {
      engine.makeMove('e4')
      expect(engine.getTurn()).toBe('b')
    })

    it('should handle pawn promotion', () => {
      // Set up position where promotion is possible
      engine.loadFEN('8/P7/8/8/8/8/8/4K2k w - - 0 1')
      const move = engine.makeMove({ from: 'a7', to: 'a8', promotion: 'q' })
      expect(move).not.toBeNull()
      expect(move?.promotion).toBe('q')
    })
  })

  describe('Legal Move Generation', () => {
    it('should return all legal moves at start', () => {
      const moves = engine.getLegalMoves()
      expect(moves.length).toBe(20) // 16 pawn moves + 4 knight moves
    })

    it('should return legal moves for a specific square', () => {
      const moves = engine.getLegalMoves('e2')
      expect(moves.length).toBe(2) // e3 and e4
      expect(moves.every((m) => m.from === 'e2')).toBe(true)
    })

    it('should return empty array for empty square', () => {
      const moves = engine.getLegalMoves('e4')
      expect(moves.length).toBe(0)
    })

    it('should return empty array for opponent piece', () => {
      const moves = engine.getLegalMoves('e7') // Black pawn, but white to move
      expect(moves.length).toBe(0)
    })
  })

  describe('Move Validation', () => {
    it('should validate legal move', () => {
      expect(engine.isLegalMove('e2', 'e4')).toBe(true)
    })

    it('should reject illegal move', () => {
      expect(engine.isLegalMove('e2', 'e5')).toBe(false)
    })

    it('should reject move from empty square', () => {
      expect(engine.isLegalMove('e4', 'e5')).toBe(false)
    })
  })

  describe('Undo', () => {
    it('should undo a move', () => {
      engine.makeMove('e4')
      const undone = engine.undoMove()
      expect(undone).not.toBeNull()
      expect(undone?.san).toBe('e4')
      expect(engine.getTurn()).toBe('w')
    })

    it('should return null when no moves to undo', () => {
      const undone = engine.undoMove()
      expect(undone).toBeNull()
    })
  })

  describe('Game State', () => {
    it('should detect active game', () => {
      const state = engine.getGameState()
      expect(state.status).toBe('active')
      expect(state.isGameOver).toBe(false)
    })

    it('should detect check', () => {
      // Position where black king is in check but not checkmate
      engine.loadFEN('rnbqkbnr/ppppp1pp/8/5p1Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2')
      const state = engine.getGameState()
      expect(state.isCheck).toBe(true)
      expect(state.status).toBe('check')
    })

    it('should detect checkmate', () => {
      // Fool's mate
      engine.loadFEN('rnb1kbnr/pppp1ppp/4p3/8/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3')
      const state = engine.getGameState()
      expect(state.isCheckmate).toBe(true)
      expect(state.status).toBe('checkmate')
      expect(state.isGameOver).toBe(true)
    })

    it('should detect stalemate', () => {
      // Classic stalemate position - black king with no legal moves, not in check
      engine.loadFEN('k7/2Q5/1K6/8/8/8/8/8 b - - 0 1')
      const state = engine.getGameState()
      expect(state.isStalemate).toBe(true)
      expect(state.status).toBe('stalemate')
      expect(state.isGameOver).toBe(true)
    })
  })

  describe('History', () => {
    it('should track move history', () => {
      engine.makeMove('e4')
      engine.makeMove('e5')
      engine.makeMove('Nf3')

      const history = engine.getHistory()
      expect(history.length).toBe(3)
      expect(history[0].san).toBe('e4')
      expect(history[1].san).toBe('e5')
      expect(history[2].san).toBe('Nf3')
    })

    it('should return empty history at start', () => {
      const history = engine.getHistory()
      expect(history.length).toBe(0)
    })
  })

  describe('Board Queries', () => {
    it('should get piece at square', () => {
      const piece = engine.getPieceAt('e2')
      expect(piece).toEqual({ type: 'p', color: 'w' })
    })

    it('should return null for empty square', () => {
      const piece = engine.getPieceAt('e4')
      expect(piece).toBeNull()
    })

    it('should get full board', () => {
      const board = engine.getBoard()
      expect(board.length).toBe(8)
      expect(board[0].length).toBe(8)
      // Check a8 (black rook)
      expect(board[0][0]).toEqual({ type: 'r', color: 'b' })
      // Check e1 (white king)
      expect(board[7][4]).toEqual({ type: 'k', color: 'w' })
    })
  })

  describe('Load/Reset', () => {
    it('should load valid FEN', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
      const result = engine.loadFEN(fen)
      expect(result).toBe(true)
      expect(engine.getFEN()).toBe(fen)
    })

    it('should reject invalid FEN', () => {
      const result = engine.loadFEN('invalid fen string')
      expect(result).toBe(false)
    })

    it('should reset to starting position', () => {
      engine.makeMove('e4')
      engine.makeMove('e5')
      engine.reset()
      expect(engine.getFEN()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    })
  })

  describe('PGN', () => {
    it('should generate PGN', () => {
      engine.makeMove('e4')
      engine.makeMove('e5')
      const pgn = engine.getPGN()
      expect(pgn).toContain('1. e4 e5')
    })

    it('should load PGN', () => {
      const pgn = '1. e4 e5 2. Nf3 Nc6'
      const result = engine.loadPGN(pgn)
      expect(result).toBe(true)
      expect(engine.getHistory().length).toBe(4)
    })
  })
})
