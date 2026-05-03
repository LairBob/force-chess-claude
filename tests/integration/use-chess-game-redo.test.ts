import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChessGame } from '../../src/hooks/useChessGame'

describe('useChessGame navigation', () => {
  function playFiveMoves(
    result: ReturnType<typeof renderHook<ReturnType<typeof useChessGame>, void>>['result']
  ) {
    act(() => {
      result.current.makeMove('e2', 'e4')
      result.current.makeMove('e7', 'e5')
      result.current.makeMove('g1', 'f3')
      result.current.makeMove('b8', 'c6')
      result.current.makeMove('f1', 'b5')
    })
  }

  describe('goPrev', () => {
    it('undoes the last move and pushes onto redoStack', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.makeMove('e2', 'e4')
        result.current.makeMove('e7', 'e5')
      })

      expect(result.current.history).toHaveLength(2)

      act(() => {
        result.current.goPrev()
      })

      expect(result.current.history).toHaveLength(1)
      expect(result.current.history[0].san).toBe('e4')
      expect(result.current.canGoForward).toBe(true)
      expect(result.current.canGoBack).toBe(true)
    })

    it('is a no-op at the starting position', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.goPrev()
      })

      expect(result.current.history).toHaveLength(0)
      expect(result.current.canGoBack).toBe(false)
    })
  })

  describe('goNext', () => {
    it('replays the most recently undone move', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.makeMove('e2', 'e4')
        result.current.makeMove('e7', 'e5')
        result.current.goPrev()
      })

      expect(result.current.history).toHaveLength(1)

      act(() => {
        result.current.goNext()
      })

      expect(result.current.history).toHaveLength(2)
      expect(result.current.history[1].san).toBe('e5')
      expect(result.current.canGoForward).toBe(false)
    })
  })

  describe('goPrev/goNext composition', () => {
    it('round-trip preserves position', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.makeMove('d2', 'd4')
        result.current.makeMove('d7', 'd5')
      })
      const fenAfterTwo = result.current.fen

      act(() => {
        result.current.goPrev()
        result.current.goNext()
      })

      expect(result.current.fen).toBe(fenAfterTwo)
    })
  })

  describe('canGoBack / canGoForward flags', () => {
    it('canGoBack is false at the starting position', () => {
      const { result } = renderHook(() => useChessGame())
      expect(result.current.canGoBack).toBe(false)
    })

    it('canGoForward is false before any goPrev is called', () => {
      const { result } = renderHook(() => useChessGame())
      expect(result.current.canGoForward).toBe(false)

      act(() => {
        result.current.makeMove('e2', 'e4')
      })
      expect(result.current.canGoForward).toBe(false)
    })
  })

  describe('goFirst / goLast', () => {
    it('goFirst empties history and populates redoStack with the full game', () => {
      const { result } = renderHook(() => useChessGame())
      playFiveMoves(result)

      act(() => {
        result.current.goFirst()
      })

      expect(result.current.history).toHaveLength(0)
      expect(result.current.canGoForward).toBe(true)
      expect(result.current.displayedPly).toBe(0)
      expect(result.current.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    })

    it('goLast empties redoStack', () => {
      const { result } = renderHook(() => useChessGame())
      playFiveMoves(result)
      const finalFen = result.current.fen

      act(() => {
        result.current.goFirst()
      })
      expect(result.current.canGoForward).toBe(true)

      act(() => {
        result.current.goLast()
      })

      expect(result.current.history).toHaveLength(5)
      expect(result.current.canGoForward).toBe(false)
      expect(result.current.fen).toBe(finalFen)
    })
  })

  describe('goToPly', () => {
    it('navigates to a specific ply (forward)', () => {
      const { result } = renderHook(() => useChessGame())
      playFiveMoves(result)

      act(() => {
        result.current.goFirst()
      })
      act(() => {
        result.current.goToPly(3)
      })

      expect(result.current.history).toHaveLength(3)
      expect(result.current.displayedPly).toBe(3)
      expect(result.current.history[2].san).toBe('Nf3')
    })

    it('navigates to a specific ply (backward)', () => {
      const { result } = renderHook(() => useChessGame())
      playFiveMoves(result)

      act(() => {
        result.current.goToPly(2)
      })

      expect(result.current.history).toHaveLength(2)
      expect(result.current.displayedPly).toBe(2)
      expect(result.current.history[1].san).toBe('e5')
    })

    it('is a no-op when ply is out of bounds', () => {
      const { result } = renderHook(() => useChessGame())
      playFiveMoves(result)

      act(() => {
        result.current.goToPly(99)
      })
      expect(result.current.displayedPly).toBe(5)

      act(() => {
        result.current.goToPly(-1)
      })
      expect(result.current.displayedPly).toBe(5)
    })
  })

  describe('displayedPly', () => {
    it('tracks the current ply after a move', () => {
      const { result } = renderHook(() => useChessGame())
      expect(result.current.displayedPly).toBe(0)

      act(() => {
        result.current.makeMove('e2', 'e4')
      })
      expect(result.current.displayedPly).toBe(1)
    })
  })
})
