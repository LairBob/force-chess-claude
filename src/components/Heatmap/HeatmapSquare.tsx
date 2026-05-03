import type { HeatmapSquareProps } from './types'
import { BLACK_SIDE_COLOR, WHITE_SIDE_COLOR } from './types'

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
}

const bandStyle: React.CSSProperties = {
  position: 'absolute',
  left: '8%',
  right: '8%',
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
}

const topBandStyle: React.CSSProperties = {
  ...bandStyle,
  top: '5%',
}

const bottomBandStyle: React.CSSProperties = {
  ...bandStyle,
  bottom: '5%',
  flexDirection: 'column-reverse',
}

const stripeStyle: React.CSSProperties = {
  height: '3px',
  borderRadius: '1.5px',
}

export function HeatmapSquare({ control }: HeatmapSquareProps) {
  const { whiteAttackers: nW, blackAttackers: nB } = control

  const blackStripes = Array.from({ length: nB }, (_, i) => (
    <div
      key={`b-${i}`}
      data-stripe="true"
      data-side="black"
      style={{ ...stripeStyle, background: BLACK_SIDE_COLOR }}
    />
  ))

  const whiteStripes = Array.from({ length: nW }, (_, i) => (
    <div
      key={`w-${i}`}
      data-stripe="true"
      data-side="white"
      style={{ ...stripeStyle, background: WHITE_SIDE_COLOR }}
    />
  ))

  return (
    <div style={containerStyle} aria-hidden="true">
      <div style={topBandStyle}>{blackStripes}</div>
      <div style={bottomBandStyle}>{whiteStripes}</div>
    </div>
  )
}
