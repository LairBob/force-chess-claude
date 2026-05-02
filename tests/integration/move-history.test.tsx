import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MoveHistory } from '../../src/components/Notation'
import type { Move } from '../../src/modules/chess-engine'

function makeMove(san: string): Move {
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

describe('MoveHistory', () => {
  it('renders empty state when history is empty', () => {
    render(<MoveHistory history={[]} />)
    expect(screen.getByText('No moves yet')).toBeInTheDocument()
  })

  it('pairs white and black moves into numbered rows', () => {
    const history = [
      makeMove('e4'),
      makeMove('e5'),
      makeMove('Nf3'),
      makeMove('Nc6'),
      makeMove('Bb5'),
    ]
    render(<MoveHistory history={history} />)

    expect(screen.getByTestId('white-move-1')).toHaveTextContent('e4')
    expect(screen.getByTestId('black-move-1')).toHaveTextContent('e5')
    expect(screen.getByTestId('white-move-2')).toHaveTextContent('Nf3')
    expect(screen.getByTestId('black-move-2')).toHaveTextContent('Nc6')
    expect(screen.getByTestId('white-move-3')).toHaveTextContent('Bb5')
    expect(screen.getByTestId('black-move-3')).toHaveTextContent('')
  })
})
