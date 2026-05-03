import type { Square } from 'chess.js'
import type { SquareControl } from '../../modules/threat-analyzer'

export interface HeatmapSquareProps {
  square: Square
  control: SquareControl
  isInertPiece: boolean
  isLightSquare: boolean
}

// Visual contract tokens — see spec §8 "Color and saturation"
export const BLACK_SIDE_COLOR = '#c0392b'
export const WHITE_SIDE_COLOR = '#1f7a1f'
export const DESAT_COLOR = '#888888'
export const UNILATERAL_BORDER_COLOR = 'rgba(220,38,38,0.95)'
export const MAX_SURPLUS = 5
