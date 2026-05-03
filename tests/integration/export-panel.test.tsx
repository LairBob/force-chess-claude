import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExportPanel } from '../../src/components/Controls/ExportPanel'

describe('ExportPanel', () => {
  let writeText: ReturnType<typeof vi.fn>

  beforeEach(() => {
    writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
  })

  it('Copy FEN writes the result of getFEN() to the clipboard', async () => {
    const getFEN = vi.fn(() => 'fake-fen-string')
    const getPGN = vi.fn(() => 'fake-pgn')
    render(<ExportPanel getFEN={getFEN} getPGN={getPGN} />)

    await userEvent.click(screen.getByRole('button', { name: /Copy FEN/i }))

    expect(getFEN).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledWith('fake-fen-string')
  })

  it('Copy PGN writes the result of getPGN() to the clipboard', async () => {
    const getFEN = vi.fn(() => 'fake-fen')
    const getPGN = vi.fn(() => 'fake-pgn-string')
    render(<ExportPanel getFEN={getFEN} getPGN={getPGN} />)

    await userEvent.click(screen.getByRole('button', { name: /Copy PGN/i }))

    expect(getPGN).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledWith('fake-pgn-string')
  })

  it('shows a transient "Copied!" confirmation after success', async () => {
    const getFEN = vi.fn(() => 'fake-fen')
    const getPGN = vi.fn(() => 'fake-pgn')
    render(<ExportPanel getFEN={getFEN} getPGN={getPGN} />)

    await userEvent.click(screen.getByRole('button', { name: /Copy FEN/i }))
    expect(await screen.findByText(/Copied/i)).toBeInTheDocument()
  })

  it('shows a failure message when clipboard write rejects', async () => {
    writeText.mockRejectedValueOnce(new Error('blocked'))
    render(<ExportPanel getFEN={() => 'x'} getPGN={() => 'y'} />)

    await userEvent.click(screen.getByRole('button', { name: /Copy FEN/i }))
    expect(await screen.findByText(/Copy failed/i)).toBeInTheDocument()
  })
})
