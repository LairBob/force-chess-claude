import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MoveHistory } from '../../src/components/Notation/MoveHistory'
import type { Move } from '../../src/modules/chess-engine'

function move(san: string): Move {
  return {
    from: 'e2',
    to: 'e4',
    piece: 'p',
    color: 'w',
    flags: 'b',
    san,
    lan: 'e2e4',
  }
}

const SAMPLE: Move[] = [move('e4'), move('e5'), move('Nf3'), move('Nc6')]

describe('MoveHistory navigation', () => {
  it('clicking a SAN cell calls onJumpToPly with ply = index + 1', async () => {
    const onJumpToPly = vi.fn()
    render(<MoveHistory history={SAMPLE} currentPly={4} onJumpToPly={onJumpToPly} />)

    await userEvent.click(screen.getByRole('button', { name: /^e4$/ }))
    expect(onJumpToPly).toHaveBeenLastCalledWith(1)

    await userEvent.click(screen.getByRole('button', { name: /^Nc6$/ }))
    expect(onJumpToPly).toHaveBeenLastCalledWith(4)
  })

  it('highlights the cell at currentPly', () => {
    render(<MoveHistory history={SAMPLE} currentPly={2} onJumpToPly={() => {}} />)
    const e5 = screen.getByRole('button', { name: /^e5$/ })
    expect(e5.className).toMatch(/bg-blue-/)

    const e4 = screen.getByRole('button', { name: /^e4$/ })
    expect(e4.className).not.toMatch(/bg-blue-/)
  })

  it('does not highlight any cell when currentPly is 0', () => {
    render(<MoveHistory history={SAMPLE} currentPly={0} onJumpToPly={() => {}} />)
    for (const san of ['e4', 'e5', 'Nf3', 'Nc6']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${san}$`) }).className).not.toMatch(
        /bg-blue-/
      )
    }
  })

  it('renders empty state when history is empty', () => {
    render(<MoveHistory history={[]} currentPly={0} onJumpToPly={() => {}} />)
    expect(screen.getByText('No moves yet')).toBeInTheDocument()
  })
})
