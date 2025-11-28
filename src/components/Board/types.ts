import type { Square } from 'chess.js'

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
  onPieceDrop?: (sourceSquare: Square, targetSquare: Square, piece: string) => boolean
  onSquareClick?: (square: Square) => void
  onPieceDragBegin?: (piece: string, sourceSquare: Square) => void
  onPieceDragEnd?: (piece: string, sourceSquare: Square) => void
}
