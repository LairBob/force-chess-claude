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
