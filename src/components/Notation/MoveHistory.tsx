import type { Move } from '../../modules/chess-engine'

interface MoveHistoryProps {
  history: Move[]
}

export function MoveHistory({ history }: MoveHistoryProps) {
  if (history.length === 0) {
    return (
      <div data-testid="move-history" className="bg-gray-800 rounded p-2 max-h-48 overflow-y-auto">
        <p className="text-gray-500 text-sm">No moves yet</p>
      </div>
    )
  }

  const rows: { number: number; white: string; black: string }[] = []
  for (let i = 0; i < history.length; i += 2) {
    rows.push({
      number: Math.floor(i / 2) + 1,
      white: history[i].san,
      black: history[i + 1]?.san ?? '',
    })
  }

  return (
    <div data-testid="move-history" className="bg-gray-800 rounded p-2 max-h-48 overflow-y-auto">
      <div className="text-sm font-mono">
        {rows.map((row) => (
          <div key={row.number} className="flex gap-2">
            <span className="text-gray-500 w-8">{row.number}.</span>
            <span data-testid={`white-move-${row.number}`} className="w-16">
              {row.white}
            </span>
            <span data-testid={`black-move-${row.number}`} className="w-16">
              {row.black}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
