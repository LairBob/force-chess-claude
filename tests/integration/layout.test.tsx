import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GameLayout } from '../../src/components/Layout'

describe('GameLayout Component', () => {
  describe('Rendering', () => {
    it('should render the layout container', () => {
      render(
        <GameLayout>
          <div>Test Content</div>
        </GameLayout>
      )
      const layoutContainer = screen.getByTestId('game-layout')
      expect(layoutContainer).toBeInTheDocument()
    })

    it('should render children', () => {
      render(
        <GameLayout>
          <div data-testid="child">Child Content</div>
        </GameLayout>
      )
      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('should render header when provided', () => {
      render(
        <GameLayout header={<div>Header</div>}>
          <div>Content</div>
        </GameLayout>
      )
      expect(screen.getByText('Header')).toBeInTheDocument()
    })

    it('should render sidebar when provided', () => {
      render(
        <GameLayout sidebar={<div>Sidebar</div>}>
          <div>Content</div>
        </GameLayout>
      )
      expect(screen.getByText('Sidebar')).toBeInTheDocument()
    })
  })
})
