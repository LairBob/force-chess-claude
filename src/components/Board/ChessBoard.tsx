import { useMemo } from 'react'
import { Chessboard } from 'react-chessboard'
import type { Square } from 'chess.js'
import {
  DEFAULT_BOARD_CONFIG,
  HIGHLIGHT_COLORS,
  type ChessBoardProps,
  type SquareStyles,
} from './types'

// react-chessboard v5 passes argument objects to its handlers; type them locally
// rather than importing — the library re-exports vary across minor versions and
// the shapes are simple enough to mirror.
interface PieceDropArgs {
  piece: { pieceType: string }
  sourceSquare: string
  targetSquare: string | null
}

interface SquareClickArgs {
  piece: { pieceType: string } | null
  square: string
}

interface PieceDragArgs {
  isSparePiece?: boolean
  piece: { pieceType: string }
  square: string | null
}

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
  const squareStyles = useMemo((): SquareStyles => {
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

  const handlePieceDrop = ({ sourceSquare, targetSquare, piece }: PieceDropArgs): boolean => {
    // v5 removed onPieceDragEnd; the drop handler always fires after a drag,
    // so use it as the seam to invoke the legacy onPieceDragEnd callback for
    // callers that still rely on it.
    if (onPieceDragEnd) {
      onPieceDragEnd(piece.pieceType, sourceSquare as Square)
    }
    if (!targetSquare) {
      return false
    }
    if (onPieceDrop) {
      return onPieceDrop(sourceSquare as Square, targetSquare as Square, piece.pieceType)
    }
    // Reject moves by default when no handler (require explicit validation)
    return false
  }

  const handleSquareClick = ({ square }: SquareClickArgs) => {
    if (onSquareClick) {
      onSquareClick(square as Square)
    }
  }

  // v5 renamed onPieceDragBegin -> onPieceDrag; signature changed to a single
  // arg object. `square` can be null when dragging a spare piece (off-board);
  // we only forward to the legacy callback when there's a real source square.
  const handlePieceDrag = ({ piece, square }: PieceDragArgs) => {
    if (onPieceDragBegin && square) {
      onPieceDragBegin(piece.pieceType, square as Square)
    }
  }

  return (
    <div data-testid="chess-board-container" className="w-full max-w-[600px] mx-auto">
      <Chessboard
        options={{
          position,
          boardOrientation: orientation,
          allowDragging: allowDrag,
          lightSquareStyle: { backgroundColor: lightSquareColor },
          darkSquareStyle: { backgroundColor: darkSquareColor },
          squareStyles,
          animationDurationInMs: animationDuration,
          showNotation: showCoordinates,
          onPieceDrop: handlePieceDrop,
          onSquareClick: handleSquareClick,
          onPieceDrag: handlePieceDrag,
        }}
      />
    </div>
  )
}
