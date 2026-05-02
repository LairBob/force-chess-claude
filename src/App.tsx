import { useState } from 'react'
import { ChessBoard, SQUARE_COLORS } from './components/Board'
import { GameLayout } from './components/Layout'
import { useChessGame } from './hooks'

type ColorScheme = keyof typeof SQUARE_COLORS

function App() {
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [colorScheme, setColorScheme] = useState<ColorScheme>('green')

  const {
    fen,
    gameState,
    history,
    lastMove,
    selectedSquare,
    legalMoves,
    onPieceDrop,
    onSquareClick,
    onPieceDragBegin,
    onPieceDragEnd,
    undoMove,
    reset,
  } = useChessGame()

  const handleFlipBoard = () => {
    setOrientation((prev) => (prev === 'white' ? 'black' : 'white'))
  }

  const handleColorChange = (scheme: ColorScheme) => {
    setColorScheme(scheme)
  }

  const getStatusText = () => {
    if (gameState.isCheckmate) {
      return `Checkmate! ${gameState.turn === 'w' ? 'Black' : 'White'} wins!`
    }
    if (gameState.isStalemate) {
      return 'Stalemate - Draw!'
    }
    if (gameState.isDraw) {
      return 'Draw!'
    }
    if (gameState.isCheck) {
      return `${gameState.turn === 'w' ? 'White' : 'Black'} is in check!`
    }
    return `${gameState.turn === 'w' ? 'White' : 'Black'} to move`
  }

  const header = (
    <div className="flex items-center justify-between px-4 py-3">
      <h1 className="text-xl font-bold text-white">Force Chess</h1>
      <div className="flex gap-2">
        <button
          onClick={undoMove}
          disabled={history.length === 0}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition-colors"
        >
          Undo
        </button>
        <button
          onClick={handleFlipBoard}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
        >
          Flip Board
        </button>
        <button
          onClick={reset}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
        >
          New Game
        </button>
      </div>
    </div>
  )

  const sidebar = (
    <div className="space-y-4">
      {/* Game Status */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Status</h2>
        <div
          className={`px-3 py-2 rounded text-sm ${
            gameState.isCheck || gameState.isCheckmate
              ? 'bg-red-900/50 text-red-200'
              : gameState.isDraw || gameState.isStalemate
                ? 'bg-yellow-900/50 text-yellow-200'
                : 'bg-gray-700 text-gray-200'
          }`}
        >
          {getStatusText()}
        </div>
      </div>

      {/* Move History */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Move History</h2>
        <div className="bg-gray-800 rounded p-2 max-h-48 overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-gray-500 text-sm">No moves yet</p>
          ) : (
            <div className="text-sm font-mono">
              {history.reduce((acc: JSX.Element[], move, index) => {
                if (index % 2 === 0) {
                  const moveNumber = Math.floor(index / 2) + 1
                  const whiteMoves = move.san
                  const blackMove = history[index + 1]?.san || ''
                  acc.push(
                    <div key={moveNumber} className="flex gap-2">
                      <span className="text-gray-500 w-8">{moveNumber}.</span>
                      <span className="w-16">{whiteMoves}</span>
                      <span className="w-16">{blackMove}</span>
                    </div>
                  )
                }
                return acc
              }, [])}
            </div>
          )}
        </div>
      </div>

      {/* Board Colors */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Board Colors</h2>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SQUARE_COLORS) as ColorScheme[]).map((scheme) => (
            <button
              key={scheme}
              onClick={() => handleColorChange(scheme)}
              className={`px-3 py-1.5 rounded text-sm capitalize transition-colors ${
                colorScheme === scheme ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {scheme}
            </button>
          ))}
        </div>
      </div>

      {/* Game Info */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Game Info</h2>
        <div className="text-sm text-gray-400 space-y-1">
          <p>Move: {gameState.moveNumber}</p>
          <p>Orientation: {orientation}</p>
        </div>
      </div>

      <div className="text-xs text-gray-500 mt-4">
        <p>Phase 2: Legal move enforcement</p>
        <p>Click or drag pieces to move</p>
      </div>
    </div>
  )

  return (
    <GameLayout header={header} sidebar={sidebar}>
      <ChessBoard
        position={fen}
        orientation={orientation}
        lightSquareColor={SQUARE_COLORS[colorScheme].light}
        darkSquareColor={SQUARE_COLORS[colorScheme].dark}
        selectedSquare={selectedSquare}
        legalMoves={legalMoves}
        lastMove={lastMove}
        onPieceDrop={onPieceDrop}
        onSquareClick={onSquareClick}
        onPieceDragBegin={onPieceDragBegin}
        onPieceDragEnd={onPieceDragEnd}
      />
    </GameLayout>
  )
}

export default App
