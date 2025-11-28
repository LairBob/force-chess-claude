import { useMemo } from 'react'
import { Chessboard } from 'react-chessboard'
import type { Square } from 'chess.js'
import {
  DEFAULT_BOARD_CONFIG,
  HIGHLIGHT_COLORS,
  type ChessBoardProps,
  type SquareStyles,
} from './types'

// Helper to check if a square is light colored
function isLightSquare(square: Square): boolean {
  const file = square.charCodeAt(0) - 97 // 'a' = 0, 'b' = 1, etc.
  const rank = parseInt(square[1]) - 1 // '1' = 0, '2' = 1, etc.
  return (file + rank) % 2 === 1
}

export function ChessBoard({
  position = DEFAULT_BOARD_CONFIG.position,
  orientation = DEFAULT_BOARD_CONFIG.orientation,
  allowDrag = DEFAULT_BOARD_CONFIG.allowDrag,
  lightSquareColor = DEFAULT_BOARD_CONFIG.lightSquareColor,
  darkSquareColor = DEFAULT_BOARD_CONFIG.darkSquareColor,
  animationDuration = DEFAULT_BOARD_CONFIG.animationDuration,
  showCoordinates = DEFAULT_BOARD_CONFIG.showCoordinates,
  selectedSquare,
  legalMoves = [],
  lastMove,
  onPieceDrop,
  onSquareClick,
  onPieceDragBegin,
  onPieceDragEnd,
}: ChessBoardProps) {
  // Build custom square styles for highlighting
  const customSquareStyles = useMemo((): SquareStyles => {
    const styles: SquareStyles = {}

    // Last move highlighting (lowest priority - applied first)
    if (lastMove) {
      styles[lastMove.from] = {
        backgroundColor: HIGHLIGHT_COLORS.lastMoveLight,
      }
      styles[lastMove.to] = {
        backgroundColor: HIGHLIGHT_COLORS.lastMoveDark,
      }
    }

    // Selected square highlighting
    if (selectedSquare) {
      styles[selectedSquare] = {
        ...styles[selectedSquare],
        backgroundColor: HIGHLIGHT_COLORS.selected,
      }
    }

    // Legal move highlighting
    legalMoves.forEach((square) => {
      // Check if there's a piece on this square (would be a capture)
      // For now, use simple dot - we could enhance this later to show capture rings
      const baseColor = isLightSquare(square) ? lightSquareColor : darkSquareColor
      styles[square] = {
        ...styles[square],
        background: `${HIGHLIGHT_COLORS.legalMove}, ${baseColor}`,
      }
    })

    return styles
  }, [selectedSquare, legalMoves, lastMove, lightSquareColor, darkSquareColor])

  const handlePieceDrop = (
    sourceSquare: Square,
    targetSquare: Square,
    piece: string
  ): boolean => {
    if (onPieceDrop) {
      return onPieceDrop(sourceSquare, targetSquare, piece)
    }
    // Reject moves by default when no handler (require explicit validation)
    return false
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
        customSquareStyles={customSquareStyles}
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
