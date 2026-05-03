import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoadDialog } from '../../src/components/Controls/LoadDialog'

describe('LoadDialog', () => {
  const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

  function setup({
    onLoadFEN = vi.fn(() => true),
    onLoadPGN = vi.fn(() => true),
    onClose = vi.fn(),
    isOpen = true,
  } = {}) {
    const utils = render(
      <LoadDialog isOpen={isOpen} onClose={onClose} onLoadFEN={onLoadFEN} onLoadPGN={onLoadPGN} />
    )
    return { ...utils, onLoadFEN, onLoadPGN, onClose }
  }

  it('does not render when isOpen is false', () => {
    setup({ isOpen: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Load button is disabled when textarea is empty', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Load' })).toBeDisabled()
  })

  it('pasting a valid FEN and clicking Load calls onLoadFEN and closes', async () => {
    const onLoadFEN = vi.fn(() => true)
    const onClose = vi.fn()
    setup({ onLoadFEN, onClose })

    await userEvent.type(screen.getByRole('textbox'), STARTING_FEN)
    await userEvent.click(screen.getByRole('button', { name: 'Load' }))

    expect(onLoadFEN).toHaveBeenCalledWith(STARTING_FEN)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('pasting a valid PGN and clicking Load calls onLoadPGN and closes', async () => {
    const onLoadPGN = vi.fn(() => true)
    const onClose = vi.fn()
    setup({ onLoadPGN, onClose })

    const ta = screen.getByRole('textbox') as HTMLTextAreaElement
    await userEvent.click(ta)
    await userEvent.paste('1. e4 e5')

    await userEvent.click(screen.getByRole('button', { name: 'Load' }))
    expect(onLoadPGN).toHaveBeenCalledWith('1. e4 e5')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows an error and stays open when format is unknown', async () => {
    const onLoadFEN = vi.fn(() => true)
    const onClose = vi.fn()
    setup({ onLoadFEN, onClose })

    await userEvent.type(screen.getByRole('textbox'), 'hello world')
    await userEvent.click(screen.getByRole('button', { name: 'Load' }))

    expect(onLoadFEN).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText(/doesn't look like a valid FEN or PGN/i)).toBeInTheDocument()
  })

  it('shows "Invalid FEN" and stays open when loadFEN returns false', async () => {
    const onLoadFEN = vi.fn(() => false)
    const onClose = vi.fn()
    setup({ onLoadFEN, onClose })

    await userEvent.type(
      screen.getByRole('textbox'),
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1'
    )
    await userEvent.click(screen.getByRole('button', { name: 'Load' }))

    expect(onLoadFEN).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText(/Invalid FEN/i)).toBeInTheDocument()
  })

  it('Cancel button calls onClose', async () => {
    const onClose = vi.fn()
    setup({ onClose })
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Escape key calls onClose', async () => {
    const onClose = vi.fn()
    setup({ onClose })
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
