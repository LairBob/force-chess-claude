import { useState } from 'react'
import { ChessBoard, SQUARE_COLORS } from './components/Board'
import { GameLayout } from './components/Layout'
import { Header } from './components/Controls'
import { MoveHistory } from './components/Notation'
import { useChessGame } from './hooks'

type ColorScheme = keyof typeof SQUARE_COLORS

function App() {
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [colorScheme, setColorScheme] = useState<ColorScheme>('green')

  const {
    fen,
    gameState,
    history,
    displayedMove,
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
    <Header
      canUndo={history.length > 0}
      onUndo={undoMove}
      onFlipBoard={handleFlipBoard}
      onNewGame={reset}
    />
  )

  const sidebar = (
    <div className="space-y-4">
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

      <div>
        <h2 className="text-lg font-semibold mb-2">Move History</h2>
        <MoveHistory history={history} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Board Colors</h2>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SQUARE_COLORS) as ColorScheme[]).map((scheme) => (
            <button
              key={scheme}
              onClick={() => setColorScheme(scheme)}
              className={`px-3 py-1.5 rounded text-sm capitalize transition-colors ${
                colorScheme === scheme ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
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
          <p>Move: {gameState.moveNumber}</p>
          <p>Orientation: {orientation}</p>
        </div>
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
        lastMove={displayedMove}
        onPieceDrop={onPieceDrop}
        onSquareClick={onSquareClick}
        onPieceDragBegin={onPieceDragBegin}
        onPieceDragEnd={onPieceDragEnd}
      />
    </GameLayout>
  )
}

export default App
