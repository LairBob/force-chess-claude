import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChessBoard } from '../../src/components/Board'

// Mock react-chessboard since it has rendering issues in jsdom.
// In v5 all configuration goes through a single `options` prop, so we
// surface its fields as data attributes for test assertions.
vi.mock('react-chessboard', () => ({
  Chessboard: ({ options }: { options: Record<string, unknown> }) => (
    <div
      data-testid="mock-chessboard"
      data-position={options?.position as string}
      data-orientation={options?.boardOrientation as string}
    >
      Mocked Chessboard
    </div>
  ),
}))

describe('ChessBoard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the chess board container', () => {
      render(<ChessBoard />)
      const boardContainer = screen.getByTestId('chess-board-container')
      expect(boardContainer).toBeInTheDocument()
    })

    it('should render with default position', () => {
      render(<ChessBoard />)
      const mockBoard = screen.getByTestId('mock-chessboard')
      // v5 requires a real FEN; default is the standard starting position
      expect(mockBoard).toHaveAttribute(
        'data-position',
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      )
    })

    it('should render with custom position', () => {
      const customFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
      render(<ChessBoard position={customFen} />)
      const mockBoard = screen.getByTestId('mock-chessboard')
      expect(mockBoard).toHaveAttribute('data-position', customFen)
    })

    it('should apply custom orientation', () => {
      render(<ChessBoard orientation="black" />)
      const mockBoard = screen.getByTestId('mock-chessboard')
      expect(mockBoard).toHaveAttribute('data-orientation', 'black')
    })
  })
})
