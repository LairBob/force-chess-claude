import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useGameKeyboard } from '../../src/hooks/useGameKeyboard'

function fireKey(key: string) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  document.dispatchEvent(event)
  return event
}

describe('useGameKeyboard', () => {
  let onPrev: ReturnType<typeof vi.fn>
  let onNext: ReturnType<typeof vi.fn>
  let onFirst: ReturnType<typeof vi.fn>
  let onLast: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onPrev = vi.fn()
    onNext = vi.fn()
    onFirst = vi.fn()
    onLast = vi.fn()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('ArrowLeft calls onPrev', () => {
    renderHook(() => useGameKeyboard({ onPrev, onNext, onFirst, onLast, isModalOpen: false }))
    fireKey('ArrowLeft')
    expect(onPrev).toHaveBeenCalledTimes(1)
  })

  it('ArrowRight calls onNext', () => {
    renderHook(() => useGameKeyboard({ onPrev, onNext, onFirst, onLast, isModalOpen: false }))
    fireKey('ArrowRight')
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('Home calls onFirst, End calls onLast', () => {
    renderHook(() => useGameKeyboard({ onPrev, onNext, onFirst, onLast, isModalOpen: false }))
    fireKey('Home')
    fireKey('End')
    expect(onFirst).toHaveBeenCalledTimes(1)
    expect(onLast).toHaveBeenCalledTimes(1)
  })

  it('does not fire when isModalOpen is true', () => {
    renderHook(() => useGameKeyboard({ onPrev, onNext, onFirst, onLast, isModalOpen: true }))
    fireKey('ArrowLeft')
    fireKey('ArrowRight')
    fireKey('Home')
    fireKey('End')
    expect(onPrev).not.toHaveBeenCalled()
    expect(onNext).not.toHaveBeenCalled()
    expect(onFirst).not.toHaveBeenCalled()
    expect(onLast).not.toHaveBeenCalled()
  })

  it('does not fire when a textarea has focus', () => {
    const ta = document.createElement('textarea')
    document.body.appendChild(ta)
    ta.focus()
    expect(document.activeElement).toBe(ta)

    renderHook(() => useGameKeyboard({ onPrev, onNext, onFirst, onLast, isModalOpen: false }))
    fireKey('ArrowLeft')
    expect(onPrev).not.toHaveBeenCalled()
  })

  it('does not fire when an input has focus', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    renderHook(() => useGameKeyboard({ onPrev, onNext, onFirst, onLast, isModalOpen: false }))
    fireKey('ArrowLeft')
    expect(onPrev).not.toHaveBeenCalled()
  })

  it('ignores unrelated keys', () => {
    renderHook(() => useGameKeyboard({ onPrev, onNext, onFirst, onLast, isModalOpen: false }))
    fireKey('a')
    fireKey('Enter')
    expect(onPrev).not.toHaveBeenCalled()
    expect(onNext).not.toHaveBeenCalled()
  })

  describe('H key — onToggleHeatmap', () => {
    it('calls onToggleHeatmap when h is pressed', () => {
      const onToggleHeatmap = vi.fn()
      renderHook(() =>
        useGameKeyboard({ onPrev, onNext, onFirst, onLast, onToggleHeatmap, isModalOpen: false })
      )
      fireKey('h')
      expect(onToggleHeatmap).toHaveBeenCalledTimes(1)
    })

    it('also responds to capital H', () => {
      const onToggleHeatmap = vi.fn()
      renderHook(() =>
        useGameKeyboard({ onPrev, onNext, onFirst, onLast, onToggleHeatmap, isModalOpen: false })
      )
      fireKey('H')
      expect(onToggleHeatmap).toHaveBeenCalledTimes(1)
    })

    it('does NOT call onToggleHeatmap when modal is open', () => {
      const onToggleHeatmap = vi.fn()
      renderHook(() =>
        useGameKeyboard({ onPrev, onNext, onFirst, onLast, onToggleHeatmap, isModalOpen: true })
      )
      fireKey('h')
      expect(onToggleHeatmap).not.toHaveBeenCalled()
    })

    it('is a no-op if onToggleHeatmap is undefined', () => {
      renderHook(() => useGameKeyboard({ onPrev, onNext, onFirst, onLast, isModalOpen: false }))
      expect(() => fireKey('h')).not.toThrow()
    })

    it('does not interfere with arrow keys', () => {
      const onToggleHeatmap = vi.fn()
      renderHook(() =>
        useGameKeyboard({ onPrev, onNext, onFirst, onLast, onToggleHeatmap, isModalOpen: false })
      )
      fireKey('ArrowLeft')
      expect(onPrev).toHaveBeenCalledTimes(1)
      expect(onToggleHeatmap).not.toHaveBeenCalled()
    })
  })

  it('removes the listener on unmount', () => {
    const { unmount } = renderHook(() =>
      useGameKeyboard({ onPrev, onNext, onFirst, onLast, isModalOpen: false })
    )
    unmount()
    fireKey('ArrowLeft')
    expect(onPrev).not.toHaveBeenCalled()
  })
})
