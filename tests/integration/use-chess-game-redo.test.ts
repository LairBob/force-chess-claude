import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChessGame } from '../../src/hooks/useChessGame'

describe('useChessGame navigation', () => {
  it('goPrev undoes the last move and pushes onto redoStack', () => {
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

  it('goNext replays the most recently undone move', () => {
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

  it('goPrev/goNext round-trip preserves position', () => {
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

  it('canGoBack is false at the starting position', () => {
    const { result } = renderHook(() => useChessGame())
    expect(result.current.canGoBack).toBe(false)
  })

  it('canGoForward is false when redoStack is empty', () => {
    const { result } = renderHook(() => useChessGame())
    expect(result.current.canGoForward).toBe(false)

    act(() => {
      result.current.makeMove('e2', 'e4')
    })
    expect(result.current.canGoForward).toBe(false)
  })

  it('goPrev is a no-op at the starting position', () => {
    const { result } = renderHook(() => useChessGame())

    act(() => {
      result.current.goPrev()
    })

    expect(result.current.history).toHaveLength(0)
    expect(result.current.canGoBack).toBe(false)
  })
})
