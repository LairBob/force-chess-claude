import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChessGame } from '../../src/hooks/useChessGame'

describe('useChessGame Hook', () => {
  describe('Initialization', () => {
    it('should start with default FEN', () => {
      const { result } = renderHook(() => useChessGame())
      expect(result.current.fen).toBe(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      )
    })

    it('should start with white to move', () => {
      const { result } = renderHook(() => useChessGame())
      expect(result.current.gameState.turn).toBe('w')
    })

    it('should start with empty history', () => {
      const { result } = renderHook(() => useChessGame())
      expect(result.current.history).toHaveLength(0)
    })

    it('should start with no last move', () => {
      const { result } = renderHook(() => useChessGame())
      expect(result.current.lastMove).toBeNull()
    })

    it('should start with no selected square', () => {
      const { result } = renderHook(() => useChessGame())
      expect(result.current.selectedSquare).toBeNull()
    })

    it('should start with no legal moves highlighted', () => {
      const { result } = renderHook(() => useChessGame())
      expect(result.current.legalMoves).toHaveLength(0)
    })

    it('should initialize with custom FEN', () => {
      const customFEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
      const { result } = renderHook(() => useChessGame({ initialFEN: customFEN }))
      expect(result.current.fen).toBe(customFEN)
      expect(result.current.gameState.turn).toBe('b')
    })
  })

  describe('Making Moves', () => {
    it('should make a valid move', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        const success = result.current.makeMove('e2', 'e4')
        expect(success).toBe(true)
      })

      expect(result.current.gameState.turn).toBe('b')
      expect(result.current.history).toHaveLength(1)
      expect(result.current.history[0].san).toBe('e4')
    })

    it('should reject an invalid move', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        const success = result.current.makeMove('e2', 'e5')
        expect(success).toBe(false)
      })

      expect(result.current.gameState.turn).toBe('w')
      expect(result.current.history).toHaveLength(0)
    })

    it('should update lastMove after making a move', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.makeMove('e2', 'e4')
      })

      expect(result.current.lastMove).toEqual({ from: 'e2', to: 'e4' })
    })

    it('should clear selectedSquare after making a move', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.selectSquare('e2')
      })
      expect(result.current.selectedSquare).toBe('e2')

      act(() => {
        result.current.makeMove('e2', 'e4')
      })
      expect(result.current.selectedSquare).toBeNull()
    })
  })

  describe('Square Selection', () => {
    it('should select a square', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.selectSquare('e2')
      })

      expect(result.current.selectedSquare).toBe('e2')
    })

    it('should show legal moves when square is selected', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.selectSquare('e2')
      })

      expect(result.current.legalMoves).toContain('e3')
      expect(result.current.legalMoves).toContain('e4')
      expect(result.current.legalMoves).toHaveLength(2)
    })

    it('should clear selection when null is passed', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.selectSquare('e2')
      })
      expect(result.current.selectedSquare).toBe('e2')

      act(() => {
        result.current.selectSquare(null)
      })
      expect(result.current.selectedSquare).toBeNull()
    })
  })

  describe('Undo', () => {
    it('should undo a move', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.makeMove('e2', 'e4')
      })
      expect(result.current.history).toHaveLength(1)

      act(() => {
        const success = result.current.undoMove()
        expect(success).toBe(true)
      })

      expect(result.current.history).toHaveLength(0)
      expect(result.current.gameState.turn).toBe('w')
    })

    it('should return false when no moves to undo', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        const success = result.current.undoMove()
        expect(success).toBe(false)
      })
    })

    it('should update lastMove after undo', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.makeMove('e2', 'e4')
        result.current.makeMove('e7', 'e5')
      })

      act(() => {
        result.current.undoMove()
      })

      expect(result.current.lastMove).toEqual({ from: 'e2', to: 'e4' })
    })

    it('should clear lastMove when undoing first move', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.makeMove('e2', 'e4')
      })

      act(() => {
        result.current.undoMove()
      })

      expect(result.current.lastMove).toBeNull()
    })
  })

  describe('Reset', () => {
    it('should reset to starting position', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.makeMove('e2', 'e4')
        result.current.makeMove('e7', 'e5')
      })

      act(() => {
        result.current.reset()
      })

      expect(result.current.fen).toBe(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      )
      expect(result.current.history).toHaveLength(0)
      expect(result.current.lastMove).toBeNull()
      expect(result.current.selectedSquare).toBeNull()
    })
  })

  describe('Load FEN', () => {
    it('should load a valid FEN', () => {
      const { result } = renderHook(() => useChessGame())
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

      act(() => {
        const success = result.current.loadFEN(fen)
        expect(success).toBe(true)
      })

      expect(result.current.fen).toBe(fen)
    })

    it('should reject invalid FEN', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        const success = result.current.loadFEN('invalid')
        expect(success).toBe(false)
      })
    })
  })

  describe('Load PGN', () => {
    it('should load a valid PGN', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        const success = result.current.loadPGN('1. e4 e5 2. Nf3')
        expect(success).toBe(true)
      })

      expect(result.current.history).toHaveLength(3)
      expect(result.current.lastMove).toEqual({ from: 'g1', to: 'f3' })
    })
  })

  describe('Board Interaction Handlers', () => {
    it('onPieceDrop should make valid moves', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        const success = result.current.onPieceDrop('e2', 'e4', 'wP')
        expect(success).toBe(true)
      })

      expect(result.current.history).toHaveLength(1)
    })

    it('onPieceDrop should reject invalid moves', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        const success = result.current.onPieceDrop('e2', 'e5', 'wP')
        expect(success).toBe(false)
      })

      expect(result.current.history).toHaveLength(0)
    })

    it('onSquareClick should select own piece', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.onSquareClick('e2')
      })

      expect(result.current.selectedSquare).toBe('e2')
    })

    it('onSquareClick should not select opponent piece', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.onSquareClick('e7')
      })

      expect(result.current.selectedSquare).toBeNull()
    })

    it('onSquareClick should make move when clicking legal square', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.onSquareClick('e2')
      })

      act(() => {
        result.current.onSquareClick('e4')
      })

      expect(result.current.history).toHaveLength(1)
      expect(result.current.selectedSquare).toBeNull()
    })

    it('onSquareClick should deselect when clicking same square', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.onSquareClick('e2')
      })
      expect(result.current.selectedSquare).toBe('e2')

      act(() => {
        result.current.onSquareClick('e2')
      })
      expect(result.current.selectedSquare).toBeNull()
    })

    it('onPieceDragBegin should select the dragged piece square', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.onPieceDragBegin('wP', 'e2')
      })

      expect(result.current.selectedSquare).toBe('e2')
    })
  })

  describe('Game State Detection', () => {
    it('should detect check', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        // Load a position where black is in check
        result.current.loadFEN(
          'rnbqkbnr/ppppp1pp/8/5p1Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2'
        )
      })

      expect(result.current.gameState.isCheck).toBe(true)
    })

    it('should detect checkmate', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        // Fool's mate position
        result.current.loadFEN(
          'rnb1kbnr/pppp1ppp/4p3/8/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'
        )
      })

      expect(result.current.gameState.isCheckmate).toBe(true)
      expect(result.current.gameState.isGameOver).toBe(true)
    })

    it('should detect stalemate', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.loadFEN('k7/2Q5/1K6/8/8/8/8/8 b - - 0 1')
      })

      expect(result.current.gameState.isStalemate).toBe(true)
      expect(result.current.gameState.isGameOver).toBe(true)
    })
  })
})
