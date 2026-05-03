import { useEffect } from 'react'

interface UseGameKeyboardOptions {
  onPrev: () => void
  onNext: () => void
  onFirst: () => void
  onLast: () => void
  onToggleHeatmap?: () => void
  isModalOpen: boolean
}

function isTypingTarget(el: Element | null): boolean {
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if ((el as HTMLElement).isContentEditable) return true
  return false
}

export function useGameKeyboard(options: UseGameKeyboardOptions): void {
  const { onPrev, onNext, onFirst, onLast, onToggleHeatmap, isModalOpen } = options

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isModalOpen) return
      if (isTypingTarget(document.activeElement)) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          onPrev()
          return
        case 'ArrowRight':
          e.preventDefault()
          onNext()
          return
        case 'Home':
          e.preventDefault()
          onFirst()
          return
        case 'End':
          e.preventDefault()
          onLast()
          return
        case 'h':
        case 'H':
          if (onToggleHeatmap) {
            e.preventDefault()
            onToggleHeatmap()
          }
          return
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onPrev, onNext, onFirst, onLast, onToggleHeatmap, isModalOpen])
}
