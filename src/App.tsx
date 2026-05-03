import { useState } from 'react'
import { ChessBoard, SQUARE_COLORS, isLightSquare } from './components/Board'
import { GameLayout } from './components/Layout'
import { Header, GameNav, LoadDialog, ExportPanel } from './components/Controls'
import { MoveHistory } from './components/Notation'
import { HeatmapSquare } from './components/Heatmap'
import { useChessGame, useThreatMap } from './hooks'
import { useGameKeyboard } from './hooks/useGameKeyboard'
import type { Square } from 'chess.js'

type ColorScheme = keyof typeof SQUARE_COLORS

function App() {
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [colorScheme, setColorScheme] = useState<ColorScheme>('green')
  const [isLoadOpen, setIsLoadOpen] = useState(false)
  const [heatmapEnabled, setHeatmapEnabled] = useState(true)

  const {
    fen,
    gameState,
    history,
    displayedMove,
    displayedPly,
    selectedSquare,
    legalMoves,
    canGoBack,
    canGoForward,
    onPieceDrop,
    onSquareClick,
    onPieceDragBegin,
    onPieceDragEnd,
    undoMove,
    reset,
    loadFEN,
    loadPGN,
    goFirst,
    goPrev,
    goNext,
    goLast,
    goToPly,
    getFEN,
    getPGN,
  } = useChessGame()

  const threatMap = useThreatMap(fen)

  useGameKeyboard({
    onPrev: goPrev,
    onNext: goNext,
    onFirst: goFirst,
    onLast: goLast,
    onToggleHeatmap: () => setHeatmapEnabled((v) => !v),
    isModalOpen: isLoadOpen,
  })

  const handleFlipBoard = () => {
    setOrientation((prev) => (prev === 'white' ? 'black' : 'white'))
  }

  const getStatusText = () => {
    if (gameState.isCheckmate) {
      return `Checkmate! ${gameState.turn === 'w' ? 'Black' : 'White'} wins!`
    }
    if (gameState.isStalemate) return 'Stalemate - Draw!'
    if (gameState.isDraw) return 'Draw!'
    if (gameState.isCheck) return `${gameState.turn === 'w' ? 'White' : 'Black'} is in check!`
    return `${gameState.turn === 'w' ? 'White' : 'Black'} to move`
  }

  const squareRenderer = heatmapEnabled
    ? ({ square }: { square: Square }) => (
        <HeatmapSquare
          square={square}
          control={threatMap.squares[square]}
          isInertPiece={threatMap.inertPieceSquares.has(square)}
          isLightSquare={isLightSquare(square)}
        />
      )
    : undefined

  const header = (
    <Header
      canUndo={history.length > 0}
      onUndo={undoMove}
      onFlipBoard={handleFlipBoard}
      onNewGame={reset}
      onLoad={() => setIsLoadOpen(true)}
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
        <GameNav
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          onFirst={goFirst}
          onPrev={goPrev}
          onNext={goNext}
          onLast={goLast}
        />
        <div className="mt-2">
          <MoveHistory history={history} currentPly={displayedPly} onJumpToPly={goToPly} />
        </div>
      </div>

      <ExportPanel getFEN={getFEN} getPGN={getPGN} />

      <div>
        <h2 className="text-lg font-semibold mb-2">Board Colors</h2>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SQUARE_COLORS) as ColorScheme[]).map((scheme) => (
            <button
              key={scheme}
              type="button"
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
        <h2 className="text-lg font-semibold mb-2">Heatmap</h2>
        <button
          type="button"
          onClick={() => setHeatmapEnabled((v) => !v)}
          aria-pressed={heatmapEnabled}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            heatmapEnabled ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {heatmapEnabled ? 'On' : 'Off'} (H)
        </button>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Game Info</h2>
        <div className="text-sm text-gray-400 space-y-1">
          <p>Move: {gameState.moveNumber}</p>
          <p>Ply: {displayedPly}</p>
          <p>Orientation: {orientation}</p>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <GameLayout header={header} sidebar={sidebar}>
        <ChessBoard
          position={fen}
          orientation={orientation}
          lightSquareColor={SQUARE_COLORS[colorScheme].light}
          darkSquareColor={SQUARE_COLORS[colorScheme].dark}
          selectedSquare={selectedSquare}
          legalMoves={legalMoves}
          lastMove={displayedMove}
          squareRenderer={squareRenderer}
          onPieceDrop={onPieceDrop}
          onSquareClick={onSquareClick}
          onPieceDragBegin={onPieceDragBegin}
          onPieceDragEnd={onPieceDragEnd}
        />
      </GameLayout>
      <LoadDialog
        isOpen={isLoadOpen}
        onClose={() => setIsLoadOpen(false)}
        onLoadFEN={loadFEN}
        onLoadPGN={loadPGN}
      />
    </>
  )
}

export default App
