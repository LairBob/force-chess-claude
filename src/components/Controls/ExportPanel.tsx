import { useState } from 'react'

interface ExportPanelProps {
  getFEN: () => string
  getPGN: () => string
}

type Status = { kind: 'idle' } | { kind: 'copied'; format: 'FEN' | 'PGN' } | { kind: 'failed' }

export function ExportPanel({ getFEN, getPGN }: ExportPanelProps) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const copy = async (format: 'FEN' | 'PGN') => {
    const text = format === 'FEN' ? getFEN() : getPGN()
    try {
      await navigator.clipboard.writeText(text)
      setStatus({ kind: 'copied', format })
    } catch {
      setStatus({ kind: 'failed' })
    }
    setTimeout(() => setStatus({ kind: 'idle' }), 1500)
  }

  return (
    <div data-testid="export-panel">
      <h2 className="text-lg font-semibold mb-2">Export</h2>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => copy('FEN')}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
        >
          Copy FEN
        </button>
        <button
          type="button"
          onClick={() => copy('PGN')}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
        >
          Copy PGN
        </button>
      </div>
      {status.kind === 'copied' ? (
        <p className="mt-1 text-xs text-green-400" role="status">
          Copied {status.format} to clipboard
        </p>
      ) : null}
      {status.kind === 'failed' ? (
        <p className="mt-1 text-xs text-red-400" role="status">
          Copy failed — please select and copy manually.
        </p>
      ) : null}
    </div>
  )
}
