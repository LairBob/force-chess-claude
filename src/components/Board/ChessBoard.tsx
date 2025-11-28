import { Chessboard } from 'react-chessboard'
import type { Square } from 'chess.js'
import { DEFAULT_BOARD_CONFIG, type ChessBoardProps } from './types'

export function ChessBoard({
  position = DEFAULT_BOARD_CONFIG.position,
  orientation = DEFAULT_BOARD_CONFIG.orientation,
  allowDrag = DEFAULT_BOARD_CONFIG.allowDrag,
  lightSquareColor = DEFAULT_BOARD_CONFIG.lightSquareColor,
  darkSquareColor = DEFAULT_BOARD_CONFIG.darkSquareColor,
  animationDuration = DEFAULT_BOARD_CONFIG.animationDuration,
  showCoordinates = DEFAULT_BOARD_CONFIG.showCoordinates,
  onPieceDrop,
  onSquareClick,
  onPieceDragBegin,
  onPieceDragEnd,
}: ChessBoardProps) {
  const handlePieceDrop = (
    sourceSquare: Square,
    targetSquare: Square,
    piece: string
  ): boolean => {
    if (onPieceDrop) {
      return onPieceDrop(sourceSquare, targetSquare, piece)
    }
    // Allow all moves by default (visual only, no validation)
    return true
  }

  const handleSquareClick = (square: Square) => {
    if (onSquareClick) {
      onSquareClick(square)
    }
  }

  const handlePieceDragBegin = (piece: string, sourceSquare: Square) => {
    if (onPieceDragBegin) {
      onPieceDragBegin(piece, sourceSquare)
    }
  }

  const handlePieceDragEnd = (piece: string, sourceSquare: Square) => {
    if (onPieceDragEnd) {
      onPieceDragEnd(piece, sourceSquare)
    }
  }

  return (
    <div
      data-testid="chess-board-container"
      className="w-full max-w-[600px] mx-auto"
    >
      <Chessboard
        position={position}
        boardOrientation={orientation}
        arePiecesDraggable={allowDrag}
        customLightSquareStyle={{ backgroundColor: lightSquareColor }}
        customDarkSquareStyle={{ backgroundColor: darkSquareColor }}
        animationDuration={animationDuration}
        showBoardNotation={showCoordinates}
        onPieceDrop={handlePieceDrop}
        onSquareClick={handleSquareClick}
        onPieceDragBegin={handlePieceDragBegin}
        onPieceDragEnd={handlePieceDragEnd}
      />
    </div>
  )
}
