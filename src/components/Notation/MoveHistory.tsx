import { useEffect, useRef } from 'react'
import type { Move } from '../../modules/chess-engine'

interface MoveHistoryProps {
  history: Move[]
  currentPly: number
  onJumpToPly: (ply: number) => void
}

export function MoveHistory({ history, currentPly, onJumpToPly }: MoveHistoryProps) {
  const highlightedRef = useRef<HTMLButtonElement | null>(null)
  const lastScrolledPly = useRef<number>(-1)

  useEffect(() => {
    if (currentPly !== lastScrolledPly.current && highlightedRef.current) {
      highlightedRef.current.scrollIntoView?.({ block: 'nearest' })
      lastScrolledPly.current = currentPly
    }
  }, [currentPly])

  if (history.length === 0) {
    return (
      <div data-testid="move-history" className="bg-gray-800 rounded p-2 max-h-48 overflow-y-auto">
        <p className="text-gray-500 text-sm">No moves yet</p>
      </div>
    )
  }

  const rows: { number: number; whiteIndex: number; blackIndex: number | null }[] = []
  for (let i = 0; i < history.length; i += 2) {
    rows.push({
      number: Math.floor(i / 2) + 1,
      whiteIndex: i,
      blackIndex: i + 1 < history.length ? i + 1 : null,
    })
  }

  const cellBase = 'w-16 text-left px-1 rounded transition-colors hover:bg-gray-700'
  const cellHighlight = 'bg-blue-600/40'

  return (
    <div data-testid="move-history" className="bg-gray-800 rounded p-2 max-h-48 overflow-y-auto">
      <div className="text-sm font-mono">
        {rows.map((row) => (
          <div key={row.number} className="flex gap-2 items-center">
            <span className="text-gray-500 w-8">{row.number}.</span>
            <button
              type="button"
              ref={currentPly === row.whiteIndex + 1 ? highlightedRef : undefined}
              onClick={() => onJumpToPly(row.whiteIndex + 1)}
              className={`${cellBase} ${currentPly === row.whiteIndex + 1 ? cellHighlight : ''}`}
              data-testid={`white-move-${row.number}`}
            >
              {history[row.whiteIndex].san}
            </button>
            {row.blackIndex !== null ? (
              <button
                type="button"
                ref={currentPly === row.blackIndex + 1 ? highlightedRef : undefined}
                onClick={() => onJumpToPly(row.blackIndex! + 1)}
                className={`${cellBase} ${currentPly === row.blackIndex + 1 ? cellHighlight : ''}`}
                data-testid={`black-move-${row.number}`}
              >
                {history[row.blackIndex].san}
              </button>
            ) : (
              <span className="w-16" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
