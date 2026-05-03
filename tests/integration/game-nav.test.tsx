import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GameNav } from '../../src/components/Controls/GameNav'

describe('GameNav', () => {
  function defaultProps(overrides = {}) {
    return {
      canGoBack: true,
      canGoForward: true,
      onFirst: vi.fn(),
      onPrev: vi.fn(),
      onNext: vi.fn(),
      onLast: vi.fn(),
      ...overrides,
    }
  }

  it('clicking each button calls the matching handler', async () => {
    const props = defaultProps()
    render(<GameNav {...props} />)

    await userEvent.click(screen.getByLabelText('First move'))
    await userEvent.click(screen.getByLabelText('Previous move'))
    await userEvent.click(screen.getByLabelText('Next move'))
    await userEvent.click(screen.getByLabelText('Last move'))

    expect(props.onFirst).toHaveBeenCalledTimes(1)
    expect(props.onPrev).toHaveBeenCalledTimes(1)
    expect(props.onNext).toHaveBeenCalledTimes(1)
    expect(props.onLast).toHaveBeenCalledTimes(1)
  })

  it('back buttons are disabled when canGoBack is false', () => {
    render(<GameNav {...defaultProps({ canGoBack: false })} />)
    expect(screen.getByLabelText('First move')).toBeDisabled()
    expect(screen.getByLabelText('Previous move')).toBeDisabled()
    expect(screen.getByLabelText('Next move')).not.toBeDisabled()
    expect(screen.getByLabelText('Last move')).not.toBeDisabled()
  })

  it('forward buttons are disabled when canGoForward is false', () => {
    render(<GameNav {...defaultProps({ canGoForward: false })} />)
    expect(screen.getByLabelText('Next move')).toBeDisabled()
    expect(screen.getByLabelText('Last move')).toBeDisabled()
    expect(screen.getByLabelText('First move')).not.toBeDisabled()
    expect(screen.getByLabelText('Previous move')).not.toBeDisabled()
  })
})
