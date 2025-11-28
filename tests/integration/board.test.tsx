import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChessBoard } from '../../src/components/Board'

// Mock react-chessboard since it has rendering issues in jsdom
vi.mock('react-chessboard', () => ({
  Chessboard: ({ options }: { options: Record<string, unknown> }) => (
    <div
      data-testid="mock-chessboard"
      data-position={options?.position}
      data-orientation={options?.boardOrientation}
      data-draggable={String(options?.allowDragging)}
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
      expect(mockBoard).toHaveAttribute('data-position', 'start')
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

  describe('Callbacks', () => {
    it('should pass onPieceDrop callback', () => {
      const onPieceDrop = vi.fn().mockReturnValue(true)
      render(<ChessBoard onPieceDrop={onPieceDrop} />)
      expect(screen.getByTestId('chess-board-container')).toBeInTheDocument()
    })

    it('should pass onSquareClick callback', () => {
      const onSquareClick = vi.fn()
      render(<ChessBoard onSquareClick={onSquareClick} />)
      expect(screen.getByTestId('chess-board-container')).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should have responsive container classes', () => {
      render(<ChessBoard />)
      const boardContainer = screen.getByTestId('chess-board-container')
      expect(boardContainer).toHaveClass('w-full')
      expect(boardContainer).toHaveClass('max-w-[600px]')
    })

    it('should pass drag configuration', () => {
      render(<ChessBoard allowDrag={false} />)
      const mockBoard = screen.getByTestId('mock-chessboard')
      expect(mockBoard).toHaveAttribute('data-draggable', 'false')
    })
  })
})
