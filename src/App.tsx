import { useState } from 'react'
import { ChessBoard, SQUARE_COLORS } from './components/Board'
import { GameLayout } from './components/Layout'
import type { Square } from 'chess.js'

type ColorScheme = keyof typeof SQUARE_COLORS

function App() {
  const [position, setPosition] = useState('start')
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [colorScheme, setColorScheme] = useState<ColorScheme>('default')

  const handlePieceDrop = (
    sourceSquare: Square,
    targetSquare: Square,
    piece: string
  ): boolean => {
    console.log(`Move: ${piece} from ${sourceSquare} to ${targetSquare}`)
    // Allow all moves (visual only, no validation in Phase 1)
    return true
  }

  const handleFlipBoard = () => {
    setOrientation((prev) => (prev === 'white' ? 'black' : 'white'))
  }

  const handleReset = () => {
    setPosition('start')
  }

  const handleColorChange = (scheme: ColorScheme) => {
    setColorScheme(scheme)
  }

  const header = (
    <div className="flex items-center justify-between px-4 py-3">
      <h1 className="text-xl font-bold text-white">Force Chess</h1>
      <div className="flex gap-2">
        <button
          onClick={handleFlipBoard}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
        >
          Flip Board
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  )

  const sidebar = (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-2">Board Colors</h2>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SQUARE_COLORS) as ColorScheme[]).map((scheme) => (
            <button
              key={scheme}
              onClick={() => handleColorChange(scheme)}
              className={`px-3 py-1.5 rounded text-sm capitalize transition-colors ${
                colorScheme === scheme
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {scheme}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Game Info</h2>
        <div className="text-sm text-gray-400 space-y-1">
          <p>Orientation: {orientation}</p>
          <p>Color scheme: {colorScheme}</p>
        </div>
      </div>

      <div className="text-xs text-gray-500 mt-4">
        <p>Phase 1: Visual-only board</p>
        <p>Drag pieces to move (no validation)</p>
      </div>
    </div>
  )

  return (
    <GameLayout header={header} sidebar={sidebar}>
      <ChessBoard
        position={position}
        orientation={orientation}
        lightSquareColor={SQUARE_COLORS[colorScheme].light}
        darkSquareColor={SQUARE_COLORS[colorScheme].dark}
        onPieceDrop={handlePieceDrop}
      />
    </GameLayout>
  )
}

export default App
