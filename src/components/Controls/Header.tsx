interface HeaderProps {
  canUndo: boolean
  onUndo: () => void
  onFlipBoard: () => void
  onNewGame: () => void
}

export function Header({ canUndo, onUndo, onFlipBoard, onNewGame }: HeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <h1 className="text-xl font-bold text-white">Force Chess</h1>
      <div className="flex gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition-colors"
        >
          Undo
        </button>
        <button
          onClick={onFlipBoard}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
        >
          Flip Board
        </button>
        <button
          onClick={onNewGame}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
        >
          New Game
        </button>
      </div>
    </div>
  )
}
