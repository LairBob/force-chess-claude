import type { HeatmapSquareProps } from './types'
import {
  BLACK_SIDE_COLOR,
  WHITE_SIDE_COLOR,
  DESAT_COLOR,
  UNILATERAL_BORDER_COLOR,
  MAX_SURPLUS,
} from './types'

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

interface StripePlan {
  saturated: boolean
  magnitude: number // [0, 1]; 0 when desaturated
}

function planStripes(matched: number, surplus: number): StripePlan[] {
  const plans: StripePlan[] = []
  for (let i = 0; i < matched; i++) {
    plans.push({ saturated: false, magnitude: 0 })
  }
  if (surplus > 0) {
    const magnitude = Math.min(Math.sqrt(surplus / MAX_SURPLUS), 1)
    for (let i = 0; i < surplus; i++) {
      plans.push({ saturated: true, magnitude })
    }
  }
  return plans
}

function blendColor(base: string, magnitude: number): string {
  // Linear blend between DESAT_COLOR and base in sRGB. Both inputs are 6-digit hex.
  const parse = (hex: string) => {
    const v = parseInt(hex.slice(1), 16)
    return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff] as const
  }
  const [r1, g1, b1] = parse(DESAT_COLOR)
  const [r2, g2, b2] = parse(base)
  const r = Math.round(r1 + (r2 - r1) * magnitude)
  const g = Math.round(g1 + (g2 - g1) * magnitude)
  const b = Math.round(b1 + (b2 - b1) * magnitude)
  return `rgb(${r}, ${g}, ${b})`
}

function renderStripes(
  side: 'white' | 'black',
  baseColor: string,
  plans: StripePlan[]
): React.ReactElement[] {
  return plans.map((plan, i) => (
    <div
      key={`${side}-${i}`}
      data-stripe="true"
      data-side={side}
      data-saturated={plan.saturated ? 'true' : 'false'}
      data-saturation-magnitude={plan.magnitude.toString()}
      style={{
        ...stripeStyle,
        background: plan.saturated ? blendColor(baseColor, plan.magnitude) : DESAT_COLOR,
      }}
    />
  ))
}

function renderUnilateralMarker(): React.ReactElement {
  return (
    <div
      data-unilateral="true"
      style={{
        position: 'absolute',
        inset: 0,
        boxShadow: `inset 0 0 0 3px ${UNILATERAL_BORDER_COLOR}`,
        pointerEvents: 'none',
      }}
    />
  )
}

function renderInertLock(isLightSquare: boolean): React.ReactElement {
  const color = isLightSquare ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.65)'
  return (
    <svg
      data-inert-lock="true"
      viewBox="0 0 24 24"
      style={{
        position: 'absolute',
        top: '4%',
        right: '4%',
        width: '22%',
        height: '22%',
        color,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 1 1 6 0v3H9z"
      />
    </svg>
  )
}

export function HeatmapSquare({ control, isInertPiece, isLightSquare }: HeatmapSquareProps) {
  const { whiteAttackers: nW, blackAttackers: nB } = control
  const matched = Math.min(nW, nB)
  const surplusW = Math.max(0, nW - nB)
  const surplusB = Math.max(0, nB - nW)

  const blackPlans = planStripes(matched, surplusB)
  const whitePlans = planStripes(matched, surplusW)

  const isUnilateral = matched === 0 && (nW > 0 || nB > 0)

  return (
    <div style={containerStyle} aria-hidden="true">
      <div style={topBandStyle}>{renderStripes('black', BLACK_SIDE_COLOR, blackPlans)}</div>
      <div style={bottomBandStyle}>{renderStripes('white', WHITE_SIDE_COLOR, whitePlans)}</div>
      {isUnilateral && renderUnilateralMarker()}
      {isInertPiece && renderInertLock(isLightSquare)}
    </div>
  )
}
