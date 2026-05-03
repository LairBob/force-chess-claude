import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { HeatmapSquare } from '../../src/components/Heatmap'

function renderSquare(props: Partial<React.ComponentProps<typeof HeatmapSquare>> = {}) {
  return render(
    <HeatmapSquare
      square="e4"
      control={{ whiteAttackers: 0, blackAttackers: 0 }}
      isInertPiece={false}
      isLightSquare={true}
      {...props}
    />
  )
}

describe('HeatmapSquare — stripe rendering', () => {
  it('renders no stripes when both attacker counts are 0', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 0, blackAttackers: 0 },
    })
    expect(container.querySelectorAll('[data-stripe]')).toHaveLength(0)
  })

  it('renders 2 white-side stripes for (N_w=2, N_b=0)', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 2, blackAttackers: 0 },
    })
    expect(container.querySelectorAll('[data-stripe][data-side="white"]')).toHaveLength(2)
    expect(container.querySelectorAll('[data-stripe][data-side="black"]')).toHaveLength(0)
  })

  it('renders 3 black-side stripes for (N_w=0, N_b=3)', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 0, blackAttackers: 3 },
    })
    expect(container.querySelectorAll('[data-stripe][data-side="white"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-stripe][data-side="black"]')).toHaveLength(3)
  })

  it('renders matching stripes on each side for (N_w=3, N_b=3)', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 3, blackAttackers: 3 },
    })
    expect(container.querySelectorAll('[data-stripe][data-side="white"]')).toHaveLength(3)
    expect(container.querySelectorAll('[data-stripe][data-side="black"]')).toHaveLength(3)
  })

  it('renders 5 white-side and 2 black-side stripes for (N_w=5, N_b=2)', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 5, blackAttackers: 2 },
    })
    expect(container.querySelectorAll('[data-stripe][data-side="white"]')).toHaveLength(5)
    expect(container.querySelectorAll('[data-stripe][data-side="black"]')).toHaveLength(2)
  })
})

describe('HeatmapSquare — saturation logic', () => {
  it('all stripes desaturated when N_w === N_b (all matched)', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 3, blackAttackers: 3 },
    })
    const allStripes = container.querySelectorAll('[data-stripe]')
    expect(allStripes).toHaveLength(6)
    for (const stripe of Array.from(allStripes)) {
      expect(stripe.getAttribute('data-saturated')).toBe('false')
    }
  })

  it('all stripes saturated when one side has 0 (no matched)', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 0, blackAttackers: 2 },
    })
    const blackStripes = container.querySelectorAll('[data-stripe][data-side="black"]')
    expect(blackStripes).toHaveLength(2)
    for (const stripe of Array.from(blackStripes)) {
      expect(stripe.getAttribute('data-saturated')).toBe('true')
    }
  })

  it('matched-offset: 5v2 has 2 desat + 3 sat on white side, 2 desat on black side', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 5, blackAttackers: 2 },
    })
    const white = Array.from(container.querySelectorAll('[data-stripe][data-side="white"]'))
    const black = Array.from(container.querySelectorAll('[data-stripe][data-side="black"]'))
    expect(white.filter((s) => s.getAttribute('data-saturated') === 'false')).toHaveLength(2)
    expect(white.filter((s) => s.getAttribute('data-saturated') === 'true')).toHaveLength(3)
    expect(black.filter((s) => s.getAttribute('data-saturated') === 'false')).toHaveLength(2)
    expect(black.filter((s) => s.getAttribute('data-saturated') === 'true')).toHaveLength(0)
  })

  it('sqrt curve: surplus=1 produces saturation magnitude sqrt(1/5) ≈ 0.447', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 1, blackAttackers: 0 },
    })
    const stripe = container.querySelector(
      '[data-stripe][data-side="white"][data-saturated="true"]'
    )
    expect(stripe).not.toBeNull()
    const mag = stripe!.getAttribute('data-saturation-magnitude')
    expect(mag).not.toBeNull()
    expect(parseFloat(mag!)).toBeCloseTo(Math.sqrt(1 / 5), 3)
  })

  it('sqrt curve: surplus=5 saturates at 1.0', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 5, blackAttackers: 0 },
    })
    const stripes = Array.from(
      container.querySelectorAll('[data-stripe][data-side="white"][data-saturated="true"]')
    )
    expect(stripes.length).toBeGreaterThan(0)
    for (const stripe of stripes) {
      const mag = stripe.getAttribute('data-saturation-magnitude')
      expect(parseFloat(mag!)).toBeCloseTo(1.0, 3)
    }
  })

  it('sqrt curve: surplus=10 clamps at 1.0', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 10, blackAttackers: 0 },
    })
    const stripes = Array.from(
      container.querySelectorAll('[data-stripe][data-side="white"][data-saturated="true"]')
    )
    for (const stripe of stripes) {
      const mag = stripe.getAttribute('data-saturation-magnitude')
      expect(parseFloat(mag!)).toBeCloseTo(1.0, 3)
    }
  })
})

describe('HeatmapSquare — unilateral marker', () => {
  it('renders a unilateral marker when min(N_w, N_b) === 0 && max > 0', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 1, blackAttackers: 0 },
    })
    expect(container.querySelector('[data-unilateral="true"]')).not.toBeNull()
  })

  it('renders no unilateral marker when both counts are 0', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 0, blackAttackers: 0 },
    })
    expect(container.querySelector('[data-unilateral="true"]')).toBeNull()
  })

  it('renders no unilateral marker when both sides have at least 1', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 2, blackAttackers: 1 },
    })
    expect(container.querySelector('[data-unilateral="true"]')).toBeNull()
  })
})

describe('HeatmapSquare — inert lock badge', () => {
  it('renders a lock SVG when isInertPiece is true', () => {
    const { container } = renderSquare({ isInertPiece: true })
    expect(container.querySelector('[data-inert-lock="true"]')).not.toBeNull()
  })

  it('does NOT render the lock when isInertPiece is false', () => {
    const { container } = renderSquare({ isInertPiece: false })
    expect(container.querySelector('[data-inert-lock="true"]')).toBeNull()
  })

  it('lock and stripes are independent (lock present, no stripes)', () => {
    const { container } = renderSquare({
      isInertPiece: true,
      control: { whiteAttackers: 0, blackAttackers: 0 },
    })
    expect(container.querySelector('[data-inert-lock="true"]')).not.toBeNull()
    expect(container.querySelectorAll('[data-stripe]')).toHaveLength(0)
  })
})
