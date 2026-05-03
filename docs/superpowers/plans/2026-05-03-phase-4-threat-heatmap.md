# Phase 4 — Threat Visualization Heatmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the paired-indicator threat-visualization heatmap that shows per-square attacker counts (via `chess.attackers()`), saturation-on-imbalance, unilateral-square borders, and inert (absolutely-pinned) piece badges, exactly as specified in `docs/superpowers/specs/2026-05-03-phase-4-threat-heatmap-design.md`.

**Architecture:** Three pure layers decoupled by data — `ThreatAnalyzer` (FEN → ThreatMap, no React), `useThreatMap` (memoized hook with LRU), and `HeatmapSquare` (presentational, no chess.js). Wired into `App.tsx` via `react-chessboard`'s `squareRenderer` and a new `H` keyboard shortcut. Default heatmap state: ON.

**Tech Stack:** React 19, TypeScript 5.9 strict, Vite 7, chess.js 1.4, react-chessboard 5.10, Tailwind 4, Vitest 4, Testing Library, Playwright (chromium).

**Spec reference:** `docs/superpowers/specs/2026-05-03-phase-4-threat-heatmap-design.md`. Spec sections cited as `[§N]` below.

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `src/modules/threat-analyzer/types.ts` | `SquareControl`, `ThreatMap` interfaces, `ALL_SQUARES` constant |
| `src/modules/threat-analyzer/ThreatAnalyzer.ts` | Pure `analyze(fen)` function + `findKing`/`isAbsolutelyPinned` helpers |
| `src/modules/threat-analyzer/index.ts` | Barrel export |
| `src/components/Heatmap/types.ts` | `HeatmapSquareProps`, color tokens (`BLACK_SIDE_COLOR`, etc.) |
| `src/components/Heatmap/HeatmapSquare.tsx` | Presentational per-square renderer |
| `src/components/Heatmap/index.ts` | Barrel export |
| `src/hooks/useThreatMap.ts` | `useThreatMap(fen)` with module-level LRU |
| `tests/unit/threat-analyzer.test.ts` | Behavior tests for analyzer |
| `tests/integration/heatmap-square.test.tsx` | `HeatmapSquare` DOM behavior tests |
| `tests/integration/use-threat-map.test.ts` | Memoization + eviction tests |
| `tests/integration/use-game-keyboard.test.ts` | Keyboard hook tests (new file; none exist today) |
| `tests/e2e/heatmap.spec.ts` | Playwright smoke test |

### Modified files

| Path | Change |
|---|---|
| `src/components/Board/ChessBoard.tsx` | Accept `squareRenderer` prop; pass to react-chessboard `options` |
| `src/components/Board/types.ts` | Extend `ChessBoardProps` with `squareRenderer` |
| `src/components/Board/index.ts` | Export `isLightSquare` helper (promoted from inside `ChessBoard.tsx`) |
| `src/hooks/useGameKeyboard.ts` | Add optional `onToggleHeatmap` to options; bind `h` key |
| `src/hooks/index.ts` | Export `useThreatMap` |
| `src/App.tsx` | Add `heatmapEnabled` state, wire `useThreatMap`, sidebar toggle button, keyboard binding, `squareRenderer` prop |
| `PROJECT_PROGRESS.json` | Mark p4-d1..d4 complete; mark p4-d5 deferred; reference new spec |

---

## Task 1: Threat-analyzer types and `ALL_SQUARES` constant

**Files:**
- Create: `src/modules/threat-analyzer/types.ts`
- Create: `src/modules/threat-analyzer/index.ts`
- Test: `tests/unit/threat-analyzer.test.ts`

- [ ] **Step 1: Create the failing test for `ALL_SQUARES`**

Create `tests/unit/threat-analyzer.test.ts` with the first test (more tests will be added in Tasks 2 and 3):

```typescript
import { describe, it, expect } from 'vitest'
import { ALL_SQUARES } from '../../src/modules/threat-analyzer'

describe('ALL_SQUARES', () => {
  it('contains all 64 squares in a8..h1 reading order', () => {
    expect(ALL_SQUARES).toHaveLength(64)
    expect(ALL_SQUARES[0]).toBe('a8')
    expect(ALL_SQUARES[7]).toBe('h8')
    expect(ALL_SQUARES[8]).toBe('a7')
    expect(ALL_SQUARES[63]).toBe('h1')
    expect(new Set(ALL_SQUARES).size).toBe(64) // no duplicates
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
npm run test:run -- tests/unit/threat-analyzer.test.ts
```

Expected: FAIL with `Cannot find module '../../src/modules/threat-analyzer'`.

- [ ] **Step 3: Create `types.ts`**

Create `src/modules/threat-analyzer/types.ts`:

```typescript
import type { Square } from 'chess.js'

export type { Square }

export interface SquareControl {
  whiteAttackers: number
  blackAttackers: number
}

export interface ThreatMap {
  squares: Record<Square, SquareControl>
  inertPieceSquares: Set<Square>
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const

export const ALL_SQUARES: readonly Square[] = (() => {
  const out: Square[] = []
  for (const r of RANKS) {
    for (const f of FILES) {
      out.push(`${f}${r}` as Square)
    }
  }
  return out
})()
```

- [ ] **Step 4: Create `index.ts` barrel**

Create `src/modules/threat-analyzer/index.ts`:

```typescript
export { ALL_SQUARES } from './types'
export type { SquareControl, ThreatMap, Square } from './types'
```

- [ ] **Step 5: Run test to verify it passes**

```
npm run test:run -- tests/unit/threat-analyzer.test.ts
```

Expected: PASS, 1 test.

- [ ] **Step 6: Commit**

```bash
git add src/modules/threat-analyzer/types.ts src/modules/threat-analyzer/index.ts tests/unit/threat-analyzer.test.ts
git commit -m "feat(threat-analyzer): add types and ALL_SQUARES constant"
```

---

## Task 2: `analyze(fen)` — pseudo-legal attacker counts

**Files:**
- Create: `src/modules/threat-analyzer/ThreatAnalyzer.ts`
- Modify: `src/modules/threat-analyzer/index.ts`
- Modify: `tests/unit/threat-analyzer.test.ts`

This task implements only the per-square attacker counts (Step 1 of the algorithm in spec §7). Pin detection comes in Task 3.

- [ ] **Step 1: Write failing tests for the starting position and Ruy Lopez**

Append to `tests/unit/threat-analyzer.test.ts`:

```typescript
import { analyze } from '../../src/modules/threat-analyzer'

describe('analyze() — pseudo-legal counts', () => {
  const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

  it('starting position: every white pawn defends exactly two squares (its diagonals)', () => {
    const map = analyze(STARTING_FEN)
    // White pawn on e2 defends d3 and f3
    expect(map.squares.d3.whiteAttackers).toBe(1)
    expect(map.squares.f3.whiteAttackers).toBe(1)
    // White pawn on a2 defends b3 only
    expect(map.squares.b3.whiteAttackers).toBe(2) // a-pawn AND c-pawn? No — a2 defends b3 (1), c2 defends b3 too? No: c2 defends b3 and d3.
    // Recompute: a2 attacks b3. b2 attacks a3 and c3. c2 attacks b3 and d3.
    // So b3.whiteAttackers = a2 + c2 = 2.
  })

  it('starting position: black pawn diagonal-attack semantics', () => {
    const map = analyze(STARTING_FEN)
    // Black pawn on e7 attacks d6 and f6
    expect(map.squares.d6.blackAttackers).toBeGreaterThanOrEqual(1)
    expect(map.squares.f6.blackAttackers).toBeGreaterThanOrEqual(1)
  })

  it('starting position: pawns do NOT attack their forward-move squares', () => {
    const map = analyze(STARTING_FEN)
    // e2 pawn moves to e3 but does NOT attack e3 (diagonal-only attack)
    // The only white pieces "attacking" e3 are knights/bishops/etc. — none in starting position.
    expect(map.squares.e3.whiteAttackers).toBe(0)
    expect(map.squares.e4.whiteAttackers).toBe(0)
  })

  it('starting position: every square has both counts defined as integers', () => {
    const map = analyze(STARTING_FEN)
    for (const sq of [
      'a1','b1','c1','d1','e1','f1','g1','h1',
      'a8','b8','c8','d8','e8','f8','g8','h8',
      'a4','d4','e4','h4','d5','e5',
    ] as const) {
      expect(typeof map.squares[sq].whiteAttackers).toBe('number')
      expect(typeof map.squares[sq].blackAttackers).toBe('number')
    }
  })

  it('Ruy Lopez after 1.e4 e5 2.Nf3 Nc6 3.Bb5: c6 is attacked by the white bishop on b5 once', () => {
    const RUY = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P4/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3'
    const map = analyze(RUY)
    // Bb5 attacks c6 (and a6)
    expect(map.squares.c6.whiteAttackers).toBe(1)
    // c6 is defended by b7 and d7 pawns (the knight on c6 doesn't attack its own square)
    expect(map.squares.c6.blackAttackers).toBe(2)
  })

  it('Ruy Lopez: e5 is attacked by white knight on f3', () => {
    const RUY = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P4/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3'
    const map = analyze(RUY)
    // Nf3 attacks e5; the e4 pawn does NOT attack e5 (forward-move not capture)
    expect(map.squares.e5.whiteAttackers).toBe(1)
    // e5 is defended by black knight on c6 and the d-pawn? No — d7 pawn attacks c6 and e6, not e5.
    // Only Nc6 attacks e5 from black side.
    expect(map.squares.e5.blackAttackers).toBe(1)
  })

  it('inertPieceSquares is empty in the starting position', () => {
    const map = analyze(STARTING_FEN)
    expect(map.inertPieceSquares.size).toBe(0)
  })
})
```

> **Note for the engineer:** the inline comments in the b3 test trace through pawn attack arithmetic; verify by hand against a board if anything looks off. The expected count `2` is correct.

- [ ] **Step 2: Run tests to verify they fail**

```
npm run test:run -- tests/unit/threat-analyzer.test.ts
```

Expected: FAIL with `analyze is not a function` (or similar — module doesn't export it yet).

- [ ] **Step 3: Implement the analyzer (counts only, no pin detection)**

Create `src/modules/threat-analyzer/ThreatAnalyzer.ts`:

```typescript
import { Chess } from 'chess.js'
import { ALL_SQUARES, type Square, type SquareControl, type ThreatMap } from './types'

export function analyze(fen: string): ThreatMap {
  const chess = new Chess(fen)

  const squares = {} as Record<Square, SquareControl>
  for (const sq of ALL_SQUARES) {
    squares[sq] = {
      whiteAttackers: chess.attackers(sq, 'w').length,
      blackAttackers: chess.attackers(sq, 'b').length,
    }
  }

  // Pin detection added in Task 3
  const inertPieceSquares = new Set<Square>()

  return { squares, inertPieceSquares }
}
```

- [ ] **Step 4: Update the barrel to export `analyze`**

Edit `src/modules/threat-analyzer/index.ts`:

```typescript
export { ALL_SQUARES } from './types'
export type { SquareControl, ThreatMap, Square } from './types'
export { analyze } from './ThreatAnalyzer'
```

- [ ] **Step 5: Run tests to verify they pass**

```
npm run test:run -- tests/unit/threat-analyzer.test.ts
```

Expected: PASS, 8 tests total (1 from Task 1 + 7 from Task 2).

- [ ] **Step 6: Run typecheck and lint**

```
npm run typecheck
npm run lint
```

Expected: both pass.

- [ ] **Step 7: Commit**

```bash
git add src/modules/threat-analyzer/ThreatAnalyzer.ts src/modules/threat-analyzer/index.ts tests/unit/threat-analyzer.test.ts
git commit -m "feat(threat-analyzer): add analyze() with pseudo-legal attacker counts"
```

---

## Task 3: Pin detection — `inertPieceSquares`

**Files:**
- Modify: `src/modules/threat-analyzer/ThreatAnalyzer.ts`
- Modify: `tests/unit/threat-analyzer.test.ts`

- [ ] **Step 1: Write failing tests for pinned and relatively-pinned cases**

Append to `tests/unit/threat-analyzer.test.ts`:

```typescript
describe('analyze() — inert (absolute pin) detection', () => {
  it('flags an absolutely-pinned knight in inertPieceSquares', () => {
    // White knight on e3, white king on e1, black rook on e5 — knight pinned along e-file
    const fen = '4k3/8/8/4r3/8/4N3/8/4K3 w - - 0 1'
    const map = analyze(fen)
    expect(map.inertPieceSquares.has('e3')).toBe(true)
  })

  it('does NOT flag a knight that is not pinned', () => {
    // Same position but black rook moved to a5 — knight free
    const fen = '4k3/8/8/r7/8/4N3/8/4K3 w - - 0 1'
    const map = analyze(fen)
    expect(map.inertPieceSquares.has('e3')).toBe(false)
  })

  it('does NOT flag a king (kings are never pinned)', () => {
    const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const map = analyze(STARTING_FEN)
    expect(map.inertPieceSquares.has('e1')).toBe(false)
    expect(map.inertPieceSquares.has('e8')).toBe(false)
  })

  it('does NOT flag a piece pinned only against the queen (relative pin)', () => {
    // White knight on d4 is on the same diagonal as white queen (a1) and black bishop (g7).
    // Removing the knight exposes the queen to bishop, NOT the king. Knight is relatively
    // pinned but free to move — must not appear as inert.
    const fen = '4k3/6b1/8/8/3N4/8/8/Q3K3 w - - 0 1'
    const map = analyze(fen)
    expect(map.inertPieceSquares.has('d4')).toBe(false)
  })

  it('flags both colors\' pinned pieces in the same position', () => {
    // White knight on e3 pinned by black rook on e5 (against white king on e1)
    // Black knight on e6 pinned by white rook on e8? No — wait, we need a slider attacking the knight's king through it.
    // Use: white king e1, white knight e3, black rook e5 (pins e3); plus black king d8, black bishop e7, white queen e2 — bishop on e7 pinned by queen e2 against king d8? d8 is not on the e-file.
    // Simpler: black king e8, black knight e6, white rook e1 — pins e6 along e-file.
    // Combine: white king e1 pinned-knight e3 by black rook e5? But black rook is between knight and white king on e1, meaning it attacks the knight not pins it. Need rook BEHIND the knight.
    // Final: white king e1, white knight e3, black rook e5 (rook attacks knight; rook is behind knight from white king's perspective — no, rook is on e5, knight on e3, king on e1, so rook→knight→king all on e-file). Knight is pinned. OK.
    // For black side: black king e8, black knight e6, white rook ???. We need a white slider on the e-file BEHIND e6 from e8's perspective — i.e., on e1..e5. The white rook can't be on e5 (occupied? no, that's the black rook). Use white rook on e2.
    const fen = '4k3/8/4n3/4r3/8/4N3/4R3/4K3 w - - 0 1'
    const map = analyze(fen)
    expect(map.inertPieceSquares.has('e3')).toBe(true)  // white knight pinned
    expect(map.inertPieceSquares.has('e6')).toBe(true)  // black knight pinned
  })
})
```

> **Engineer note:** the multi-pin position is dense; verify the FEN renders the intended pieces in the correct squares before debugging the analyzer. Ranks count from 8 (top) to 1 (bottom) in FEN.

- [ ] **Step 2: Run tests to verify they fail**

```
npm run test:run -- tests/unit/threat-analyzer.test.ts
```

Expected: FAIL — `inertPieceSquares` is empty for all of the above (Task 2 stubbed it).

- [ ] **Step 3: Implement `findKing` and `isAbsolutelyPinned`, wire into `analyze`**

Replace the entire body of `src/modules/threat-analyzer/ThreatAnalyzer.ts`:

```typescript
import { Chess } from 'chess.js'
import { ALL_SQUARES, type Square, type SquareControl, type ThreatMap } from './types'

type Color = 'w' | 'b'

export function analyze(fen: string): ThreatMap {
  const chess = new Chess(fen)

  // Step 1: per-square pseudo-legal attacker counts
  const squares = {} as Record<Square, SquareControl>
  for (const sq of ALL_SQUARES) {
    squares[sq] = {
      whiteAttackers: chess.attackers(sq, 'w').length,
      blackAttackers: chess.attackers(sq, 'b').length,
    }
  }

  // Step 2: identify absolutely-pinned non-king pieces
  const inertPieceSquares = new Set<Square>()
  for (const sq of ALL_SQUARES) {
    const piece = chess.get(sq)
    if (!piece || piece.type === 'k') continue
    if (isAbsolutelyPinned(fen, sq, piece.color)) {
      inertPieceSquares.add(sq)
    }
  }

  return { squares, inertPieceSquares }
}

function isAbsolutelyPinned(fen: string, sq: Square, color: Color): boolean {
  const test = new Chess(fen)
  test.remove(sq)
  const kingSq = findKing(test, color)
  if (!kingSq) return false
  const enemy: Color = color === 'w' ? 'b' : 'w'
  return test.isAttacked(kingSq, enemy)
}

function findKing(chess: Chess, color: Color): Square | null {
  const board = chess.board() // 8x8, rank 8 first, rank 1 last
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const cell = board[r][f]
      if (cell && cell.type === 'k' && cell.color === color) {
        const file = 'abcdefgh'[f]
        const rank = 8 - r
        return `${file}${rank}` as Square
      }
    }
  }
  return null
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm run test:run -- tests/unit/threat-analyzer.test.ts
```

Expected: PASS, all tests in the file.

- [ ] **Step 5: Run full typecheck and lint**

```
npm run typecheck
npm run lint
```

Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add src/modules/threat-analyzer/ThreatAnalyzer.ts tests/unit/threat-analyzer.test.ts
git commit -m "feat(threat-analyzer): detect absolutely-pinned pieces via remove-and-recheck"
```

---

## Task 4: `useThreatMap` hook with LRU memoization

**Files:**
- Create: `src/hooks/useThreatMap.ts`
- Modify: `src/hooks/index.ts`
- Test: `tests/integration/use-threat-map.test.ts`

- [ ] **Step 1: Write failing tests for memoization and eviction**

Create `tests/integration/use-threat-map.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useThreatMap, __resetThreatMapCacheForTests } from '../../src/hooks/useThreatMap'

const STARTING = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'

describe('useThreatMap', () => {
  beforeEach(() => {
    __resetThreatMapCacheForTests()
  })

  it('returns referentially-equal ThreatMap when called twice with the same FEN', () => {
    const { result, rerender } = renderHook(({ fen }) => useThreatMap(fen), {
      initialProps: { fen: STARTING },
    })
    const first = result.current
    rerender({ fen: STARTING })
    const second = result.current
    expect(second).toBe(first)
  })

  it('returns a different ThreatMap when FEN changes', () => {
    const { result, rerender } = renderHook(({ fen }) => useThreatMap(fen), {
      initialProps: { fen: STARTING },
    })
    const first = result.current
    rerender({ fen: AFTER_E4 })
    const second = result.current
    expect(second).not.toBe(first)
  })

  it('evicts the oldest entry when cache exceeds capacity (50)', () => {
    // Build 51 distinct positions by toggling castling-rights flag
    const fens: string[] = []
    for (let i = 0; i < 51; i++) {
      const flag = i.toString(36).padEnd(4, 'a')
      fens.push(`rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w ${flag} - 0 ${i + 1}`)
    }
    const { result, rerender } = renderHook(({ fen }) => useThreatMap(fen), {
      initialProps: { fen: fens[0] },
    })
    const firstResultRef = result.current

    for (let i = 1; i < 51; i++) {
      rerender({ fen: fens[i] })
    }

    // Re-request fens[0]; if it was evicted, we should get a new object
    // (the underlying ThreatMap data is equal, but the reference differs).
    rerender({ fen: fens[0] })
    expect(result.current).not.toBe(firstResultRef)
  })
})
```

> **Engineer note:** the test FENs in the eviction test are not all *legal* FEN positions (the castling flag is junk), but `chess.js` is permissive enough to accept them as distinct cache keys. If chess.js rejects any of these FENs, swap the FEN-mutation strategy to varying the halfmove clock (`... w - - ${i} ${i+1}`).

- [ ] **Step 2: Run tests to verify they fail**

```
npm run test:run -- tests/integration/use-threat-map.test.ts
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `useThreatMap`**

Create `src/hooks/useThreatMap.ts`:

```typescript
import { useMemo } from 'react'
import { analyze, type ThreatMap } from '../modules/threat-analyzer'

const MAX_CACHE = 50
const cache = new Map<string, ThreatMap>()

export function useThreatMap(fen: string): ThreatMap {
  return useMemo(() => {
    const cached = cache.get(fen)
    if (cached) {
      // Touch-on-read: move to most-recent
      cache.delete(fen)
      cache.set(fen, cached)
      return cached
    }
    const map = analyze(fen)
    cache.set(fen, map)
    while (cache.size > MAX_CACHE) {
      const oldest = cache.keys().next().value
      if (oldest === undefined) break
      cache.delete(oldest)
    }
    return map
  }, [fen])
}

// Test-only helper. Does not appear in production paths.
export function __resetThreatMapCacheForTests(): void {
  cache.clear()
}
```

- [ ] **Step 4: Add the export**

Edit `src/hooks/index.ts`:

```typescript
export { useChessGame } from './useChessGame'
export { useThreatMap } from './useThreatMap'
```

- [ ] **Step 5: Run tests to verify they pass**

```
npm run test:run -- tests/integration/use-threat-map.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 6: Run typecheck and lint**

```
npm run typecheck
npm run lint
```

Expected: both pass.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useThreatMap.ts src/hooks/index.ts tests/integration/use-threat-map.test.ts
git commit -m "feat(hook): add useThreatMap with module-level LRU memoization"
```

---

## Task 5: `HeatmapSquare` — types, scaffold, stripe DOM counts

**Files:**
- Create: `src/components/Heatmap/types.ts`
- Create: `src/components/Heatmap/HeatmapSquare.tsx`
- Create: `src/components/Heatmap/index.ts`
- Test: `tests/integration/heatmap-square.test.tsx`

This task gets stripes rendering with the correct counts and side placement. Saturation logic comes in Task 6; unilateral border + lock badge in Task 7.

- [ ] **Step 1: Write failing tests for stripe DOM counts**

Create `tests/integration/heatmap-square.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { HeatmapSquare } from '../../src/components/Heatmap'

function renderSquare(props: Partial<React.ComponentProps<typeof HeatmapSquare>> = {}) {
  return render(
    <HeatmapSquare
      square="e4"
      control={{ whiteAttackers: 0, blackAttackers: 0 }}
      isInertPiece={false}
      isLightSquare={true}
      {...props}
    />
  )
}

describe('HeatmapSquare — stripe rendering', () => {
  it('renders no stripes when both attacker counts are 0', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 0, blackAttackers: 0 },
    })
    expect(container.querySelectorAll('[data-stripe]')).toHaveLength(0)
  })

  it('renders 2 white-side stripes for (N_w=2, N_b=0)', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 2, blackAttackers: 0 },
    })
    expect(container.querySelectorAll('[data-stripe][data-side="white"]')).toHaveLength(2)
    expect(container.querySelectorAll('[data-stripe][data-side="black"]')).toHaveLength(0)
  })

  it('renders 3 black-side stripes for (N_w=0, N_b=3)', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 0, blackAttackers: 3 },
    })
    expect(container.querySelectorAll('[data-stripe][data-side="white"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-stripe][data-side="black"]')).toHaveLength(3)
  })

  it('renders matching stripes on each side for (N_w=3, N_b=3)', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 3, blackAttackers: 3 },
    })
    expect(container.querySelectorAll('[data-stripe][data-side="white"]')).toHaveLength(3)
    expect(container.querySelectorAll('[data-stripe][data-side="black"]')).toHaveLength(3)
  })

  it('renders 5 white-side and 2 black-side stripes for (N_w=5, N_b=2)', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 5, blackAttackers: 2 },
    })
    expect(container.querySelectorAll('[data-stripe][data-side="white"]')).toHaveLength(5)
    expect(container.querySelectorAll('[data-stripe][data-side="black"]')).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```
npm run test:run -- tests/integration/heatmap-square.test.tsx
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create `types.ts` with props and color tokens**

Create `src/components/Heatmap/types.ts`:

```typescript
import type { Square } from 'chess.js'
import type { SquareControl } from '../../modules/threat-analyzer'

export interface HeatmapSquareProps {
  square: Square
  control: SquareControl
  isInertPiece: boolean
  isLightSquare: boolean
}

// Visual contract tokens — see spec §8 "Color and saturation"
export const BLACK_SIDE_COLOR = '#c0392b'
export const WHITE_SIDE_COLOR = '#1f7a1f'
export const DESAT_COLOR = '#888888'
export const UNILATERAL_BORDER_COLOR = 'rgba(220,38,38,0.95)'
export const MAX_SURPLUS = 5
```

- [ ] **Step 4: Create `HeatmapSquare.tsx` (stripe-rendering only — no saturation logic yet)**

Create `src/components/Heatmap/HeatmapSquare.tsx`:

```typescript
import type { HeatmapSquareProps } from './types'
import { BLACK_SIDE_COLOR, WHITE_SIDE_COLOR } from './types'

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
}

const bandStyle: React.CSSProperties = {
  position: 'absolute',
  left: '8%',
  right: '8%',
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
}

const topBandStyle: React.CSSProperties = {
  ...bandStyle,
  top: '5%',
}

const bottomBandStyle: React.CSSProperties = {
  ...bandStyle,
  bottom: '5%',
  flexDirection: 'column-reverse',
}

const stripeStyle: React.CSSProperties = {
  height: '3px',
  borderRadius: '1.5px',
}

export function HeatmapSquare({ control }: HeatmapSquareProps) {
  const { whiteAttackers: nW, blackAttackers: nB } = control

  const blackStripes = Array.from({ length: nB }, (_, i) => (
    <div
      key={`b-${i}`}
      data-stripe="true"
      data-side="black"
      style={{ ...stripeStyle, background: BLACK_SIDE_COLOR }}
    />
  ))

  const whiteStripes = Array.from({ length: nW }, (_, i) => (
    <div
      key={`w-${i}`}
      data-stripe="true"
      data-side="white"
      style={{ ...stripeStyle, background: WHITE_SIDE_COLOR }}
    />
  ))

  return (
    <div style={containerStyle} aria-hidden="true">
      <div style={topBandStyle}>{blackStripes}</div>
      <div style={bottomBandStyle}>{whiteStripes}</div>
    </div>
  )
}
```

- [ ] **Step 5: Create `index.ts` barrel**

Create `src/components/Heatmap/index.ts`:

```typescript
export { HeatmapSquare } from './HeatmapSquare'
export type { HeatmapSquareProps } from './types'
```

- [ ] **Step 6: Run tests to verify they pass**

```
npm run test:run -- tests/integration/heatmap-square.test.tsx
```

Expected: PASS, 5 tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/Heatmap tests/integration/heatmap-square.test.tsx
git commit -m "feat(heatmap): add HeatmapSquare with paired top/bottom stripe rendering"
```

---

## Task 6: `HeatmapSquare` — saturation logic (matched-offset, sqrt curve)

**Files:**
- Modify: `src/components/Heatmap/HeatmapSquare.tsx`
- Modify: `tests/integration/heatmap-square.test.tsx`

- [ ] **Step 1: Write failing tests for saturation behavior**

The renderer exposes saturation state via `data-saturated="true|false"` on each stripe. Append to `tests/integration/heatmap-square.test.tsx`:

```typescript
describe('HeatmapSquare — saturation logic', () => {
  it('all stripes desaturated when N_w === N_b (all matched)', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 3, blackAttackers: 3 },
    })
    const allStripes = container.querySelectorAll('[data-stripe]')
    expect(allStripes).toHaveLength(6)
    for (const stripe of Array.from(allStripes)) {
      expect(stripe.getAttribute('data-saturated')).toBe('false')
    }
  })

  it('all stripes saturated when one side has 0 (no matched)', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 0, blackAttackers: 2 },
    })
    const blackStripes = container.querySelectorAll('[data-stripe][data-side="black"]')
    expect(blackStripes).toHaveLength(2)
    for (const stripe of Array.from(blackStripes)) {
      expect(stripe.getAttribute('data-saturated')).toBe('true')
    }
  })

  it('matched-offset: 5v2 has 2 desat + 3 sat on white side, 2 desat on black side', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 5, blackAttackers: 2 },
    })
    const white = Array.from(
      container.querySelectorAll('[data-stripe][data-side="white"]')
    )
    const black = Array.from(
      container.querySelectorAll('[data-stripe][data-side="black"]')
    )
    expect(white.filter((s) => s.getAttribute('data-saturated') === 'false')).toHaveLength(2)
    expect(white.filter((s) => s.getAttribute('data-saturated') === 'true')).toHaveLength(3)
    expect(black.filter((s) => s.getAttribute('data-saturated') === 'false')).toHaveLength(2)
    expect(black.filter((s) => s.getAttribute('data-saturated') === 'true')).toHaveLength(0)
  })

  it('sqrt curve: surplus=1 produces saturation magnitude sqrt(1/5) ≈ 0.447', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 1, blackAttackers: 0 },
    })
    const stripe = container.querySelector(
      '[data-stripe][data-side="white"][data-saturated="true"]'
    )
    expect(stripe).not.toBeNull()
    const mag = stripe!.getAttribute('data-saturation-magnitude')
    expect(mag).not.toBeNull()
    expect(parseFloat(mag!)).toBeCloseTo(Math.sqrt(1 / 5), 3)
  })

  it('sqrt curve: surplus=5 saturates at 1.0', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 5, blackAttackers: 0 },
    })
    const stripes = Array.from(
      container.querySelectorAll('[data-stripe][data-side="white"][data-saturated="true"]')
    )
    expect(stripes.length).toBeGreaterThan(0)
    for (const stripe of stripes) {
      const mag = stripe.getAttribute('data-saturation-magnitude')
      expect(parseFloat(mag!)).toBeCloseTo(1.0, 3)
    }
  })

  it('sqrt curve: surplus=10 clamps at 1.0', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 10, blackAttackers: 0 },
    })
    const stripes = Array.from(
      container.querySelectorAll('[data-stripe][data-side="white"][data-saturated="true"]')
    )
    for (const stripe of stripes) {
      const mag = stripe.getAttribute('data-saturation-magnitude')
      expect(parseFloat(mag!)).toBeCloseTo(1.0, 3)
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```
npm run test:run -- tests/integration/heatmap-square.test.tsx
```

Expected: FAIL — `data-saturated` and `data-saturation-magnitude` not present yet.

- [ ] **Step 3: Update `HeatmapSquare` to compute saturation per stripe**

Replace the body of `src/components/Heatmap/HeatmapSquare.tsx`:

```typescript
import type { HeatmapSquareProps } from './types'
import {
  BLACK_SIDE_COLOR,
  WHITE_SIDE_COLOR,
  DESAT_COLOR,
  MAX_SURPLUS,
} from './types'

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
}

const bandStyle: React.CSSProperties = {
  position: 'absolute',
  left: '8%',
  right: '8%',
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
}

const topBandStyle: React.CSSProperties = {
  ...bandStyle,
  top: '5%',
}

const bottomBandStyle: React.CSSProperties = {
  ...bandStyle,
  bottom: '5%',
  flexDirection: 'column-reverse',
}

const stripeStyle: React.CSSProperties = {
  height: '3px',
  borderRadius: '1.5px',
}

interface StripePlan {
  saturated: boolean
  magnitude: number // [0, 1]; 0 when desaturated
}

function planStripes(matched: number, surplus: number): StripePlan[] {
  const plans: StripePlan[] = []
  for (let i = 0; i < matched; i++) {
    plans.push({ saturated: false, magnitude: 0 })
  }
  if (surplus > 0) {
    const magnitude = Math.min(Math.sqrt(surplus / MAX_SURPLUS), 1)
    for (let i = 0; i < surplus; i++) {
      plans.push({ saturated: true, magnitude })
    }
  }
  return plans
}

function blendColor(base: string, magnitude: number): string {
  // Linear blend between DESAT_COLOR and base in sRGB.
  // base/DESAT_COLOR are 6-digit hex (#RRGGBB).
  const parse = (hex: string) => {
    const v = parseInt(hex.slice(1), 16)
    return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff] as const
  }
  const [r1, g1, b1] = parse(DESAT_COLOR)
  const [r2, g2, b2] = parse(base)
  const r = Math.round(r1 + (r2 - r1) * magnitude)
  const g = Math.round(g1 + (g2 - g1) * magnitude)
  const b = Math.round(b1 + (b2 - b1) * magnitude)
  return `rgb(${r}, ${g}, ${b})`
}

function renderStripes(
  side: 'white' | 'black',
  baseColor: string,
  plans: StripePlan[]
): React.ReactElement[] {
  return plans.map((plan, i) => (
    <div
      key={`${side}-${i}`}
      data-stripe="true"
      data-side={side}
      data-saturated={plan.saturated ? 'true' : 'false'}
      data-saturation-magnitude={plan.magnitude.toString()}
      style={{
        ...stripeStyle,
        background: plan.saturated ? blendColor(baseColor, plan.magnitude) : DESAT_COLOR,
      }}
    />
  ))
}

export function HeatmapSquare({ control }: HeatmapSquareProps) {
  const { whiteAttackers: nW, blackAttackers: nB } = control
  const matched = Math.min(nW, nB)
  const surplusW = Math.max(0, nW - nB)
  const surplusB = Math.max(0, nB - nW)

  const blackPlans = planStripes(matched, surplusB)
  const whitePlans = planStripes(matched, surplusW)

  return (
    <div style={containerStyle} aria-hidden="true">
      <div style={topBandStyle}>{renderStripes('black', BLACK_SIDE_COLOR, blackPlans)}</div>
      <div style={bottomBandStyle}>{renderStripes('white', WHITE_SIDE_COLOR, whitePlans)}</div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm run test:run -- tests/integration/heatmap-square.test.tsx
```

Expected: PASS — Task 5 stripe-count tests still pass, Task 6 saturation tests now pass.

- [ ] **Step 5: Run typecheck and lint**

```
npm run typecheck
npm run lint
```

Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/Heatmap/HeatmapSquare.tsx tests/integration/heatmap-square.test.tsx
git commit -m "feat(heatmap): apply asym + matched-offset saturation with sqrt curve"
```

---

## Task 7: `HeatmapSquare` — unilateral border + inert lock badge

**Files:**
- Modify: `src/components/Heatmap/HeatmapSquare.tsx`
- Modify: `tests/integration/heatmap-square.test.tsx`

- [ ] **Step 1: Write failing tests for unilateral border and inert lock**

Append to `tests/integration/heatmap-square.test.tsx`:

```typescript
describe('HeatmapSquare — unilateral marker', () => {
  it('renders a unilateral marker when min(N_w, N_b) === 0 && max > 0', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 1, blackAttackers: 0 },
    })
    expect(container.querySelector('[data-unilateral="true"]')).not.toBeNull()
  })

  it('renders no unilateral marker when both counts are 0', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 0, blackAttackers: 0 },
    })
    expect(container.querySelector('[data-unilateral="true"]')).toBeNull()
  })

  it('renders no unilateral marker when both sides have at least 1', () => {
    const { container } = renderSquare({
      control: { whiteAttackers: 2, blackAttackers: 1 },
    })
    expect(container.querySelector('[data-unilateral="true"]')).toBeNull()
  })
})

describe('HeatmapSquare — inert lock badge', () => {
  it('renders a lock SVG when isInertPiece is true', () => {
    const { container } = renderSquare({ isInertPiece: true })
    expect(container.querySelector('[data-inert-lock="true"]')).not.toBeNull()
  })

  it('does NOT render the lock when isInertPiece is false', () => {
    const { container } = renderSquare({ isInertPiece: false })
    expect(container.querySelector('[data-inert-lock="true"]')).toBeNull()
  })

  it('lock and stripes are independent (lock present, no stripes)', () => {
    const { container } = renderSquare({
      isInertPiece: true,
      control: { whiteAttackers: 0, blackAttackers: 0 },
    })
    expect(container.querySelector('[data-inert-lock="true"]')).not.toBeNull()
    expect(container.querySelectorAll('[data-stripe]')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```
npm run test:run -- tests/integration/heatmap-square.test.tsx
```

Expected: FAIL — neither marker is rendered yet.

- [ ] **Step 3: Add unilateral marker and lock SVG**

Edit `src/components/Heatmap/HeatmapSquare.tsx`. Add these helpers near the top imports:

```typescript
import {
  BLACK_SIDE_COLOR,
  WHITE_SIDE_COLOR,
  DESAT_COLOR,
  UNILATERAL_BORDER_COLOR,
  MAX_SURPLUS,
} from './types'
```

Add helper render functions near `renderStripes`:

```typescript
function renderUnilateralMarker(): React.ReactElement {
  return (
    <div
      data-unilateral="true"
      style={{
        position: 'absolute',
        inset: 0,
        boxShadow: `inset 0 0 0 3px ${UNILATERAL_BORDER_COLOR}`,
        pointerEvents: 'none',
      }}
    />
  )
}

function renderInertLock(isLightSquare: boolean): React.ReactElement {
  const color = isLightSquare ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.65)'
  return (
    <svg
      data-inert-lock="true"
      viewBox="0 0 24 24"
      style={{
        position: 'absolute',
        top: '4%',
        right: '4%',
        width: '22%',
        height: '22%',
        color,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 1 1 6 0v3H9z"
      />
    </svg>
  )
}
```

Update the component body to compose them in:

```typescript
export function HeatmapSquare({ control, isInertPiece, isLightSquare }: HeatmapSquareProps) {
  const { whiteAttackers: nW, blackAttackers: nB } = control
  const matched = Math.min(nW, nB)
  const surplusW = Math.max(0, nW - nB)
  const surplusB = Math.max(0, nB - nW)

  const blackPlans = planStripes(matched, surplusB)
  const whitePlans = planStripes(matched, surplusW)

  const isUnilateral = matched === 0 && (nW > 0 || nB > 0)

  return (
    <div style={containerStyle} aria-hidden="true">
      <div style={topBandStyle}>{renderStripes('black', BLACK_SIDE_COLOR, blackPlans)}</div>
      <div style={bottomBandStyle}>{renderStripes('white', WHITE_SIDE_COLOR, whitePlans)}</div>
      {isUnilateral && renderUnilateralMarker()}
      {isInertPiece && renderInertLock(isLightSquare)}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm run test:run -- tests/integration/heatmap-square.test.tsx
```

Expected: PASS — all tests across Tasks 5, 6, 7 pass.

- [ ] **Step 5: Run typecheck and lint**

```
npm run typecheck
npm run lint
```

Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/Heatmap/HeatmapSquare.tsx tests/integration/heatmap-square.test.tsx
git commit -m "feat(heatmap): add unilateral border and inert lock badge"
```

---

## Task 8: `ChessBoard` — `squareRenderer` prop pass-through

**Files:**
- Modify: `src/components/Board/types.ts`
- Modify: `src/components/Board/ChessBoard.tsx`
- Modify: `src/components/Board/index.ts`
- Modify: `tests/integration/board.test.tsx`

This task verifies (and adapts to) the actual `react-chessboard` 5.x `squareRenderer` API. The spec assumes the option is named `squareRenderer`; if it isn't, fix the call site here in this task only — the rest of the design is unchanged.

- [ ] **Step 1: Verify the react-chessboard 5.10 squareRenderer API**

Run a quick check before writing code. From the project root:

```
node -e "const m = require('react-chessboard'); console.log(Object.keys(m))"
```

Then inspect the project's installed types:

```
npm exec --no-install -- type "node_modules\\react-chessboard\\dist\\index.d.ts"
```

Look for the `ChessboardOptions` (or similarly-named) type and find the per-square renderer field. Most likely names: `squareRenderer`, `customSquareRenderer`, or `renderSquare`. Whatever it actually is, treat it as the single integration point and use it in steps 3 and 4. **If the field name is not `squareRenderer`, use the actual name in the prop pass-through but keep the *external* `ChessBoard` prop name as `squareRenderer` to keep the rest of the plan intact.**

- [ ] **Step 2: Write failing test for `squareRenderer` pass-through**

Edit `tests/integration/board.test.tsx`. Update the mock to surface `squareRenderer` and add a new test. Replace the existing mock section:

```typescript
vi.mock('react-chessboard', () => ({
  Chessboard: ({ options }: { options: Record<string, unknown> }) => {
    // Render the squareRenderer for one specific square so a test can verify it was wired up
    const renderer = options?.squareRenderer as
      | ((args: { square: string }) => React.ReactNode)
      | undefined
    return (
      <div
        data-testid="mock-chessboard"
        data-position={options?.position as string}
        data-orientation={options?.boardOrientation as string}
      >
        Mocked Chessboard
        {renderer && (
          <div data-testid="mock-square-render-e4">{renderer({ square: 'e4' })}</div>
        )}
      </div>
    )
  },
}))
```

> **Engineer note:** the actual `react-chessboard` `squareRenderer` likely receives more than just `square` (e.g., piece info, square color). For the mock, we only need to forward `square` since that's what `App.tsx` will rely on. If the real API requires different shape and the test fails after Step 4, adapt the mock to match.

Add a new test at the end of the existing `describe('Rendering')` block:

```typescript
it('passes the squareRenderer prop through to react-chessboard options', () => {
  const customRenderer = (args: { square: string }) => (
    <div data-testid={`hm-${args.square}`}>HM:{args.square}</div>
  )
  const { getByTestId } = render(<ChessBoard squareRenderer={customRenderer} />)
  const wrapper = getByTestId('mock-square-render-e4')
  expect(wrapper.querySelector('[data-testid="hm-e4"]')).not.toBeNull()
})
```

- [ ] **Step 3: Run test to verify it fails**

```
npm run test:run -- tests/integration/board.test.tsx
```

Expected: FAIL — `squareRenderer` prop not yet supported.

- [ ] **Step 4: Add `squareRenderer` to `ChessBoardProps` and forward it**

Edit `src/components/Board/types.ts` — add to the `ChessBoardProps` interface (right after `lastMove?`):

```typescript
  // Per-square render hook (used by the heatmap layer)
  squareRenderer?: (args: { square: Square }) => React.ReactNode
```

Edit `src/components/Board/ChessBoard.tsx`:

1. Destructure the new prop in the function signature (alongside `onPieceDragEnd`):

```typescript
  squareRenderer,
```

2. Pass it through in the `options` object inside `<Chessboard options={...} />`:

```typescript
        options={{
          position,
          boardOrientation: orientation,
          allowDragging: allowDrag,
          lightSquareStyle: { backgroundColor: lightSquareColor },
          darkSquareStyle: { backgroundColor: darkSquareColor },
          squareStyles,
          animationDurationInMs: animationDuration,
          showNotation: showCoordinates,
          onPieceDrop: handlePieceDrop,
          onSquareClick: handleSquareClick,
          onPieceDrag: handlePieceDrag,
          squareRenderer, // <-- new
        }}
```

If the actual react-chessboard option key is *not* `squareRenderer` (e.g., it's `customSquareRenderer`), use that key here while keeping our exported prop named `squareRenderer`.

Also export the existing `isLightSquare` helper. Move it from inside `ChessBoard.tsx` to `src/components/Board/index.ts` as a re-export, then mark the local copy as a re-import. The simplest path: extract `isLightSquare` from `ChessBoard.tsx` into `src/components/Board/types.ts` (so it's already in scope inside the file) and add an export from the barrel.

Edit `src/components/Board/types.ts` — add to the bottom:

```typescript
export function isLightSquare(square: Square): boolean {
  const file = square.charCodeAt(0) - 97
  const rank = parseInt(square[1]) - 1
  return (file + rank) % 2 === 1
}
```

Edit `src/components/Board/ChessBoard.tsx` — remove the local `isLightSquare` definition and import from `./types`:

```typescript
import {
  DEFAULT_BOARD_CONFIG,
  HIGHLIGHT_COLORS,
  isLightSquare,
  type ChessBoardProps,
  type SquareStyles,
} from './types'
```

Edit `src/components/Board/index.ts`:

```typescript
export { ChessBoard } from './ChessBoard'
export {
  DEFAULT_BOARD_CONFIG,
  SQUARE_COLORS,
  HIGHLIGHT_COLORS,
  isLightSquare,
} from './types'
export type {
  BoardConfig,
  BoardOrientation,
  ChessBoardProps,
  SquareColorScheme,
  SquareStyles,
  Square,
} from './types'
```

- [ ] **Step 5: Run tests to verify they pass**

```
npm run test:run -- tests/integration/board.test.tsx
```

Expected: PASS — all 5 tests (4 existing + 1 new).

- [ ] **Step 6: Run typecheck and lint**

```
npm run typecheck
npm run lint
```

Expected: both pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/Board tests/integration/board.test.tsx
git commit -m "feat(board): forward squareRenderer to react-chessboard; promote isLightSquare"
```

---

## Task 9: `useGameKeyboard` — `onToggleHeatmap` H key binding

**Files:**
- Modify: `src/hooks/useGameKeyboard.ts`
- Test: `tests/integration/use-game-keyboard.test.ts`

- [ ] **Step 1: Write failing tests for the keyboard hook**

Create `tests/integration/use-game-keyboard.test.ts`:

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGameKeyboard } from '../../src/hooks/useGameKeyboard'

function makeOpts(overrides: Partial<Parameters<typeof useGameKeyboard>[0]> = {}) {
  return {
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onFirst: vi.fn(),
    onLast: vi.fn(),
    onToggleHeatmap: vi.fn(),
    isModalOpen: false,
    ...overrides,
  }
}

function pressKey(key: string) {
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  })
}

describe('useGameKeyboard — H key', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('calls onToggleHeatmap when H is pressed', () => {
    const opts = makeOpts()
    renderHook(() => useGameKeyboard(opts))
    pressKey('h')
    expect(opts.onToggleHeatmap).toHaveBeenCalledTimes(1)
  })

  it('also responds to capital H', () => {
    const opts = makeOpts()
    renderHook(() => useGameKeyboard(opts))
    pressKey('H')
    expect(opts.onToggleHeatmap).toHaveBeenCalledTimes(1)
  })

  it('does NOT call onToggleHeatmap when modal is open', () => {
    const opts = makeOpts({ isModalOpen: true })
    renderHook(() => useGameKeyboard(opts))
    pressKey('h')
    expect(opts.onToggleHeatmap).not.toHaveBeenCalled()
  })

  it('is a no-op if onToggleHeatmap is undefined', () => {
    const opts = makeOpts()
    const { onToggleHeatmap: _omit, ...rest } = opts
    renderHook(() => useGameKeyboard(rest as unknown as typeof opts))
    expect(() => pressKey('h')).not.toThrow()
  })

  it('does not interfere with arrow keys', () => {
    const opts = makeOpts()
    renderHook(() => useGameKeyboard(opts))
    pressKey('ArrowLeft')
    expect(opts.onPrev).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```
npm run test:run -- tests/integration/use-game-keyboard.test.ts
```

Expected: FAIL — `onToggleHeatmap` is not in the hook's options or handler.

- [ ] **Step 3: Update `useGameKeyboard` to support `onToggleHeatmap`**

Replace the entire body of `src/hooks/useGameKeyboard.ts`:

```typescript
import { useEffect } from 'react'

interface UseGameKeyboardOptions {
  onPrev: () => void
  onNext: () => void
  onFirst: () => void
  onLast: () => void
  onToggleHeatmap?: () => void
  isModalOpen: boolean
}

function isTypingTarget(el: Element | null): boolean {
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if ((el as HTMLElement).isContentEditable) return true
  return false
}

export function useGameKeyboard(options: UseGameKeyboardOptions): void {
  const { onPrev, onNext, onFirst, onLast, onToggleHeatmap, isModalOpen } = options

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isModalOpen) return
      if (isTypingTarget(document.activeElement)) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          onPrev()
          return
        case 'ArrowRight':
          e.preventDefault()
          onNext()
          return
        case 'Home':
          e.preventDefault()
          onFirst()
          return
        case 'End':
          e.preventDefault()
          onLast()
          return
        case 'h':
        case 'H':
          if (onToggleHeatmap) {
            e.preventDefault()
            onToggleHeatmap()
          }
          return
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onPrev, onNext, onFirst, onLast, onToggleHeatmap, isModalOpen])
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm run test:run -- tests/integration/use-game-keyboard.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Run typecheck and lint**

```
npm run typecheck
npm run lint
```

Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useGameKeyboard.ts tests/integration/use-game-keyboard.test.ts
git commit -m "feat(hook): add H-key onToggleHeatmap binding to useGameKeyboard"
```

---

## Task 10: `App.tsx` integration — heatmap state, sidebar toggle, wiring

**Files:**
- Modify: `src/App.tsx`

This task is wiring; behavior is verified end-to-end by Task 11's e2e test plus a manual browser smoke check before commit.

- [ ] **Step 1: Edit imports in `App.tsx`**

Add these imports:

```typescript
import { useChessGame, useThreatMap } from './hooks'
import { HeatmapSquare } from './components/Heatmap'
import { isLightSquare } from './components/Board'
```

Replace the existing `useChessGame` import line accordingly. The `isLightSquare` import works because Task 8 promoted it to the barrel.

- [ ] **Step 2: Add heatmap state and threat-map hook call**

Inside the `App` component, add right after `const [isLoadOpen, ...] = useState(false)`:

```typescript
  const [heatmapEnabled, setHeatmapEnabled] = useState(true)
```

After `const { fen, ... } = useChessGame()`:

```typescript
  const threatMap = useThreatMap(fen)
```

- [ ] **Step 3: Pass `onToggleHeatmap` to `useGameKeyboard`**

Update the existing `useGameKeyboard({...})` call to add the new option:

```typescript
  useGameKeyboard({
    onPrev: goPrev,
    onNext: goNext,
    onFirst: goFirst,
    onLast: goLast,
    onToggleHeatmap: () => setHeatmapEnabled((v) => !v),
    isModalOpen: isLoadOpen,
  })
```

- [ ] **Step 4: Build the `squareRenderer` and pass to `ChessBoard`**

Just before the `return` statement of the App component (after `getStatusText` is defined):

```typescript
  const squareRenderer = heatmapEnabled
    ? ({ square }: { square: import('chess.js').Square }) => (
        <HeatmapSquare
          square={square}
          control={threatMap.squares[square]}
          isInertPiece={threatMap.inertPieceSquares.has(square)}
          isLightSquare={isLightSquare(square)}
        />
      )
    : undefined
```

Pass the prop on `<ChessBoard ...>`:

```tsx
        <ChessBoard
          position={fen}
          orientation={orientation}
          lightSquareColor={SQUARE_COLORS[colorScheme].light}
          darkSquareColor={SQUARE_COLORS[colorScheme].dark}
          selectedSquare={selectedSquare}
          legalMoves={legalMoves}
          lastMove={displayedMove}
          onPieceDrop={onPieceDrop}
          onSquareClick={onSquareClick}
          onPieceDragBegin={onPieceDragBegin}
          onPieceDragEnd={onPieceDragEnd}
          squareRenderer={squareRenderer}
        />
```

- [ ] **Step 5: Add the sidebar Heatmap toggle button**

Add a new section in the sidebar JSX, between the existing "Board Colors" and "Game Info" blocks:

```tsx
      <div>
        <h2 className="text-lg font-semibold mb-2">Heatmap</h2>
        <button
          type="button"
          onClick={() => setHeatmapEnabled((v) => !v)}
          aria-pressed={heatmapEnabled}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            heatmapEnabled ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {heatmapEnabled ? 'On' : 'Off'} (H)
        </button>
      </div>
```

- [ ] **Step 6: Run typecheck, lint, and the full test suite**

```
npm run typecheck
npm run lint
npm run test:run
```

Expected: all pass. There is no new unit test for this task — it's pure wiring; the e2e test in Task 11 exercises the integration.

- [ ] **Step 7: Manual browser smoke test**

```
npm run dev
```

Open the dev URL (typically `http://localhost:5173`). Confirm by direct observation:

1. The board displays with stripe indicators visible by default (heatmap is on).
2. On the starting position, the e4/d4/e5/d5 area shows symmetric stripe patterns.
3. Press `H` — stripes disappear; the sidebar button switches from "On (H)" to "Off (H)".
4. Press `H` again — stripes return.
5. Click the sidebar "Heatmap" button — toggles same as keyboard.
6. Make a few moves; the heatmap updates with each move.
7. Use the `Prev`/`Next` navigation buttons — heatmap follows the displayed FEN.
8. Open the `Load…` dialog. Paste FEN `4k3/8/8/4r3/8/4N3/8/4K3 w - - 0 1` and load. Confirm a small lock SVG appears on e3 (the pinned knight).
9. Load FEN `4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1`. Confirm a red 3px inset border on d5 (the hanging black pawn).

If anything fails, debug and re-test before committing.

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): wire heatmap state, useThreatMap, sidebar toggle, H-key"
```

---

## Task 11: E2e smoke test

**Files:**
- Test: `tests/e2e/heatmap.spec.ts`

- [ ] **Step 1: Write the e2e spec**

Create `tests/e2e/heatmap.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

const PINNED_KNIGHT_FEN = '4k3/8/8/4r3/8/4N3/8/4K3 w - - 0 1'
const HANGING_PAWN_FEN = '4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1'

test.describe('Threat heatmap', () => {
  test('renders stripe indicators by default and toggles with H', async ({ page }) => {
    await page.goto('/')

    // Default: stripes visible
    const initialStripes = await page.locator('[data-stripe]').count()
    expect(initialStripes).toBeGreaterThan(0)

    // Press H — stripes go away
    await page.keyboard.press('h')
    await expect(page.locator('[data-stripe]')).toHaveCount(0)

    // Press H again — stripes return
    await page.keyboard.press('h')
    const afterToggle = await page.locator('[data-stripe]').count()
    expect(afterToggle).toBeGreaterThan(0)
  })

  test('shows a lock badge on an absolutely-pinned piece', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /load/i }).click()
    // The LoadDialog has a textarea; paste the FEN and submit.
    await page.locator('textarea').fill(PINNED_KNIGHT_FEN)
    await page.getByRole('button', { name: /load fen/i }).click()
    await expect(page.locator('[data-inert-lock="true"]')).toHaveCount(1)
  })

  test('shows a unilateral border on a hanging piece', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /load/i }).click()
    await page.locator('textarea').fill(HANGING_PAWN_FEN)
    await page.getByRole('button', { name: /load fen/i }).click()
    await expect(page.locator('[data-unilateral="true"]').first()).toBeVisible()
  })
})
```

> **Engineer note:** the LoadDialog test selectors (`textarea`, button names) are best-guess based on `src/components/Controls/LoadDialog.tsx`. If the actual selectors differ, open `LoadDialog.tsx` and adapt the locators to match.

- [ ] **Step 2: Start the dev server (in a separate terminal or via Playwright config)**

Playwright is already configured in this project. Start the dev server explicitly if the playwright config doesn't auto-start it:

```
npm run dev
```

Then in another terminal:

```
npm run test:e2e -- tests/e2e/heatmap.spec.ts
```

Expected: 3 tests pass.

- [ ] **Step 3: Run the full test suite**

```
npm run test:run
npm run test:e2e
```

Expected: all unit, integration, and e2e tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/heatmap.spec.ts
git commit -m "test(e2e): heatmap default-on, H toggle, lock badge, unilateral border"
```

---

## Task 12: Update `PROJECT_PROGRESS.json`

**Files:**
- Modify: `PROJECT_PROGRESS.json`

- [ ] **Step 1: Update Phase 4 status and deliverable notes**

Edit `PROJECT_PROGRESS.json`. In the `phase-4` entry:

1. Set `"status": "completed"` and add `"completedAt": "<TODAY ISO TIMESTAMP>"`.
2. For each deliverable `p4-d1`..`p4-d4`, set `"status": "completed"` and update notes to point to the new spec.
3. For `p4-d5`, update to:

```json
{
  "id": "p4-d5",
  "task": "Optional numeric overlay showing differential per square",
  "status": "deferred",
  "notes": "Deferred per docs/superpowers/specs/2026-05-03-phase-4-threat-heatmap-design.md §2 — paired indicators carry the count, making a numeric overlay redundant. Revisit only if accessibility feedback requests it."
}
```

4. Update `p4-d4` notes to reference the new spec rather than `docs/research/visualization.md`:

```json
{
  "id": "p4-d4",
  "task": "Color mapping per docs/superpowers/specs/2026-05-03-phase-4-threat-heatmap-design.md (paired indicators with sqrt-curve saturation, unilateral border, lock badge)",
  "status": "completed"
}
```

5. Update the top-level fields:
   - `"lastUpdated"`: today's ISO timestamp
   - `"currentPhase"`: `"phase-5"` (since 4 is now done) — *only* update this if Phase 3 is also genuinely complete; otherwise leave at `"phase-3"` and let the user reconcile.
   - `metrics.completedPhases`: increment by 1
   - `metrics.overallProgress`: recompute as `Math.round(completedPhases / totalPhases * 100)`

> **Engineer note:** Phase 3 status in `PROJECT_PROGRESS.json` is currently `"pending"` because `p3-d5` (timer) is deferred but unshipped. Don't change Phase 3 in this task; just complete Phase 4 in place. The `currentPhase` field is informational and should stay the way it was unless the user instructs otherwise.

- [ ] **Step 2: Run all checks**

```
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Expected: all pass. (The JSON edit doesn't affect builds; this confirms nothing was inadvertently broken.)

- [ ] **Step 3: Commit**

```bash
git add PROJECT_PROGRESS.json
git commit -m "chore(progress): mark Phase 4 deliverables complete; defer p4-d5"
```

---

## Final verification

After all tasks complete, run the full acceptance battery from spec §12:

- [ ] `npm run typecheck` — pass
- [ ] `npm run lint` — pass
- [ ] `npm run test:run` — pass (unit + integration)
- [ ] `npm run build` — pass
- [ ] `npm run test:e2e` — pass (chromium)
- [ ] Manual browser smoke: heatmap default-on, `H` toggles, sidebar button toggles, navigation updates the heatmap, pinned-knight FEN shows lock, hanging-pawn FEN shows unilateral border.

If all pass: Phase 4 is done. Optionally write a brief `docs/handoffs/HANDOFF_04.md` describing what was shipped and what's next.
