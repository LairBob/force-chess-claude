import { useEffect, useRef, useState } from 'react'
import { detectFormat } from '../../utils/detectFormat'

interface LoadDialogProps {
  isOpen: boolean
  onClose: () => void
  onLoadFEN: (fen: string) => boolean
  onLoadPGN: (pgn: string) => boolean
}

export function LoadDialog({ isOpen, onClose, onLoadFEN, onLoadPGN }: LoadDialogProps) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      setText('')
      setError(null)
      // Focus the textarea on open — setTimeout required because the textarea
      // isn't in the DOM until after the first render where isOpen === true.
      setTimeout(() => taRef.current?.focus(), 0)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleLoad = () => {
    const trimmed = text.trim()
    if (!trimmed) return

    const format = detectFormat(trimmed)
    if (format === 'fen') {
      const ok = onLoadFEN(trimmed)
      if (ok) onClose()
      else setError('Invalid FEN.')
    } else if (format === 'pgn') {
      const ok = onLoadPGN(trimmed)
      if (ok) onClose()
      else setError('Invalid PGN.')
    } else {
      setError("This doesn't look like a valid FEN or PGN.")
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="load-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-xl p-4 w-full max-w-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="load-dialog-title" className="text-lg font-semibold mb-3 text-white">
          Load Position or Game
        </h2>
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            if (error) setError(null)
          }}
          rows={8}
          className="w-full bg-gray-900 text-gray-100 font-mono text-sm rounded p-2 border border-gray-700 focus:border-blue-500 focus:outline-none"
          placeholder="Paste a FEN or PGN..."
          aria-label="FEN or PGN text"
        />
        {error ? (
          <p className="mt-2 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2 mt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleLoad}
            disabled={text.trim().length === 0}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded text-sm"
          >
            Load
          </button>
        </div>
      </div>
    </div>
  )
}
