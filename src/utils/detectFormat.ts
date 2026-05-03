export type ChessFormat = 'fen' | 'pgn' | 'unknown'

export function detectFormat(raw: string): ChessFormat {
  const s = raw.trim()
  if (!s) return 'unknown'
  if (/^\s*\[[A-Za-z]+\s+"/m.test(s)) return 'pgn'
  if (/^\s*1\.\s/m.test(s)) return 'pgn'
  if (s.includes('\n')) return 'pgn'
  if (/^[1-8rnbqkpRNBQKP/]+\s+[wb]\s/.test(s)) return 'fen'
  return 'unknown'
}
