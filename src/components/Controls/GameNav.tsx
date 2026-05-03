interface GameNavProps {
  canGoBack: boolean
  canGoForward: boolean
  onFirst: () => void
  onPrev: () => void
  onNext: () => void
  onLast: () => void
}

const buttonClass =
  'px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed rounded text-sm font-mono transition-colors'

export function GameNav({
  canGoBack,
  canGoForward,
  onFirst,
  onPrev,
  onNext,
  onLast,
}: GameNavProps) {
  return (
    <div className="flex gap-1" data-testid="game-nav">
      <button
        type="button"
        aria-label="First move"
        disabled={!canGoBack}
        onClick={onFirst}
        className={buttonClass}
      >
        {'⏮'}
      </button>
      <button
        type="button"
        aria-label="Previous move"
        disabled={!canGoBack}
        onClick={onPrev}
        className={buttonClass}
      >
        {'←'}
      </button>
      <button
        type="button"
        aria-label="Next move"
        disabled={!canGoForward}
        onClick={onNext}
        className={buttonClass}
      >
        {'→'}
      </button>
      <button
        type="button"
        aria-label="Last move"
        disabled={!canGoForward}
        onClick={onLast}
        className={buttonClass}
      >
        {'⏭'}
      </button>
    </div>
  )
}
