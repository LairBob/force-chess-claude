import { Chessboard, type ChessboardOptions } from 'react-chessboard'
import type { Square } from 'chess.js'
import type { PieceDropHandlerArgs, SquareHandlerArgs, PieceHandlerArgs } from 'react-chessboard'
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
}: ChessBoardProps) {
  const handlePieceDrop = ({
    piece,
    sourceSquare,
    targetSquare,
  }: PieceDropHandlerArgs): boolean => {
    if (onPieceDrop && targetSquare) {
      return onPieceDrop(
        sourceSquare as Square,
        targetSquare as Square,
        piece.pieceType
      )
    }
    // Allow all moves by default (visual only, no validation)
    return true
  }

  const handleSquareClick = ({ square }: SquareHandlerArgs) => {
    if (onSquareClick) {
      onSquareClick(square as Square)
    }
  }

  const handlePieceDrag = ({ piece, square }: PieceHandlerArgs) => {
    if (onPieceDragBegin && square) {
      onPieceDragBegin(piece.pieceType, square as Square)
    }
  }

  const options: ChessboardOptions = {
    position,
    boardOrientation: orientation,
    allowDragging: allowDrag,
    lightSquareStyle: { backgroundColor: lightSquareColor },
    darkSquareStyle: { backgroundColor: darkSquareColor },
    animationDurationInMs: animationDuration,
    showNotation: showCoordinates,
    onPieceDrop: handlePieceDrop,
    onSquareClick: handleSquareClick,
    onPieceDrag: handlePieceDrag,
  }

  return (
    <div
      data-testid="chess-board-container"
      className="w-full max-w-[600px] mx-auto"
    >
      <Chessboard options={options} />
    </div>
  )
}
