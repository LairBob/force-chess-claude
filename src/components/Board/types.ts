import type { Square } from 'chess.js'

export type { Square }

export type BoardOrientation = 'white' | 'black'

export interface BoardConfig {
  position: string
  orientation: BoardOrientation
  allowDrag: boolean
  lightSquareColor: string
  darkSquareColor: string
  animationDuration: number
  showCoordinates: boolean
}

export interface SquareStyles {
  [square: string]: React.CSSProperties
}

export interface SquareColorScheme {
  light: string
  dark: string
}

export const SQUARE_COLORS: Record<string, SquareColorScheme> = {
  default: {
    light: '#f0d9b5',
    dark: '#b58863',
  },
  green: {
    light: '#eeeed2',
    dark: '#769656',
  },
  brown: {
    light: '#f0d9b5',
    dark: '#b58863',
  },
  blue: {
    light: '#dee3e6',
    dark: '#8ca2ad',
  },
}

export const DEFAULT_BOARD_CONFIG: BoardConfig = {
  position: 'start',
  orientation: 'white',
  allowDrag: true,
  lightSquareColor: SQUARE_COLORS.default.light,
  darkSquareColor: SQUARE_COLORS.default.dark,
  animationDuration: 200,
  showCoordinates: true,
}

export interface ChessBoardProps {
  position?: string
  orientation?: BoardOrientation
  allowDrag?: boolean
  lightSquareColor?: string
  darkSquareColor?: string
  animationDuration?: number
  showCoordinates?: boolean
  // Highlighting
  selectedSquare?: Square | null
  legalMoves?: Square[]
  lastMove?: { from: Square; to: Square } | null
  // Callbacks
  onPieceDrop?: (sourceSquare: Square, targetSquare: Square, piece: string) => boolean
  onSquareClick?: (square: Square) => void
  onPieceDragBegin?: (piece: string, sourceSquare: Square) => void
  onPieceDragEnd?: (piece: string, sourceSquare: Square) => void
}

// Highlight colors
export const HIGHLIGHT_COLORS = {
  selected: 'rgba(255, 255, 0, 0.4)', // Yellow for selected square
  legalMove: 'radial-gradient(circle, rgba(0, 0, 0, 0.15) 25%, transparent 25%)', // Dot for legal moves
  legalCapture: 'radial-gradient(circle, transparent 75%, rgba(0, 0, 0, 0.15) 75%)', // Ring for captures
  lastMoveLight: 'rgba(155, 199, 0, 0.41)', // Light square last move
  lastMoveDark: 'rgba(155, 199, 0, 0.41)', // Dark square last move
  check: 'radial-gradient(ellipse at center, rgba(255, 0, 0, 0.5) 0%, rgba(231, 0, 0, 0) 70%)', // Red glow for check
}
