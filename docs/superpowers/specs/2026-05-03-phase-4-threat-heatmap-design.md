# Phase 4 — Threat Visualization Heatmap

**Date:** 2026-05-03
**Status:** Design approved; ready for implementation plan
**Supersedes:** the color-mapping recipe in `docs/research/visualization.md` (the research doc remains useful as background but its `getSquareColor()` rules are replaced by the paired-indicator scheme below)

## 1. Goal

Render a real-time, per-square visual layer over the existing chessboard that shows, at a glance:

- **How many pieces of each color attack each square** (pseudo-legal attackers)
- **How lopsided that contest is** (saturation conveys imbalance, not raw count)
- **Which pieces are paper tigers** (absolutely pinned non-king pieces are flagged)
- **Which squares are completely unilateral** (one side, no opposition — covers both hanging pieces and uncontested squares)

This is the headline differentiator for Force Chess. It is educational and analytical: a player should be able to look at a position and immediately see *where the pressure is, who's winning what, and which threats are real vs. nominal.*

## 2. Out of scope (deferred)

- Numeric overlay per square (`p4-d5` deliverable). Paired indicators carry the count; an additional number would be redundant. Revisit only if accessibility feedback requests it.
- King-attacks-defended-square inertness. The "inert" concept is restricted in Phase 4 to absolutely-pinned non-king pieces. Extending inertness to kings whose adjacent attacks all land on defended squares is deferred to a later phase — rare, more expensive to detect, low marginal educational value vs. the pin case.
- Indicator-mark refinement (horizontal lines vs. bars vs. pips vs. other). Phase 4 ships rudimentary horizontal stripes; a follow-up refinement pass tunes the visual marks once the logic is in place and we can see how it reads at real board sizes.
- Colorblind-safe palette as a configurable theme. Phase 4 uses the existing red/green family. Revisit if feedback flags it.
- "What if" hover preview, explicit attack vectors, SEE-style scoring. All deferred to Phase 5 or beyond.

## 3. Key design decisions

These were settled during brainstorming. They constrain the implementation plan.

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Attacker semantics: pseudo-legal.** Heatmap counts use `chess.attackers(sq, color)` directly. Pinned pieces still contribute to counts. | Standard "control map" interpretation; library-native; no extra logic to maintain. The fact that some attackers are inert is communicated separately by the lock badge. |
| 2 | **Inert = absolutely pinned non-king pieces.** A piece appears in `inertPieceSquares` iff removing it from the board would leave its own king attacked. | The 99% case for "pseudo-legal but not legal." King inertness is rare and defer-worthy. Detection is one clone + `isAttacked()` check per piece. |
| 3 | **Paired top/bottom indicators per square.** Position carries side (top = black, bottom = white); line count carries raw count. Replaces the simple-tint heatmap from `docs/research/visualization.md`. | Strictly more information per square: count, polarity, and balance are three independent visual channels. |
| 4 | **Asym + matched-offset saturation.** `matched = min(N_w, N_b)`; matched stripes on both sides desaturate (gray); only `surplus` stripes on the dominant side saturate. | Total saturated stripes = `\|N_w − N_b\|`. Balanced contests are visually quiet; lopsided contests draw the eye. |
| 5 | **Saturation curve: sqrt.** Per-stripe saturation = `sqrt(surplus / 5)`, clamped to `[0, 1]`. Max meaningful surplus = 5. | Linear underweights small surpluses (most positions). Sqrt ramps faster early, plateaus later. |
| 6 | **Unilateral marker (U1): 3px inset red border.** Trigger: `min(N_w, N_b) === 0 && max(N_w, N_b) > 0`. Same predicate for empty squares (uncontested control) and occupied squares (hanging piece). | Same data condition deserves the same marker. The piece glyph itself disambiguates "free material" from "uncontested square." |
| 7 | **Inert badge (A1): subtle monotone SVG lock, top-right of the piece's home square.** Color: `rgba(0,0,0,0.55)` on light squares, `rgba(255,255,255,0.65)` on dark. No piece-desat overlay; piece glyph stays at full strength. | Keeps the heatmap and the badge as orthogonal channels. Avoids overriding `pieceRenderer`. |
| 8 | **No square-fill tint.** Squares are not given a background color tint based on differential. Indicators carry all the heatmap information. | Avoids visual noise; pieces read clearly. The U1 border is the only square-level visual marker. |
| 9 | **Renderer: `react-chessboard` `squareRenderer`.** A per-square render function returns a `<HeatmapSquare>` React node. | Library-native, inherits sizing/orientation/animation. Per CLAUDE.md guidance for Phase 4. |
| 10 | **Toggle: single on/off, default ON, `H` keyboard shortcut.** One sidebar button + one keybinding. | Heatmap is the headline differentiator — first launch should show it. Multi-toggle (separate switches for badges, borders, etc.) is premature configuration. |
| 11 | **Heatmap reflects the *displayed* FEN.** When the user navigates back through history, the heatmap follows. | Falls out naturally — `fen` in `useChessGame` already tracks the displayed ply. |

## 4. Architecture

Three pure layers, decoupled by data:

```
                    ┌────────────────────────┐
                    │  ThreatAnalyzer (pure) │   src/modules/threat-analyzer/
                    │  fen → ThreatMap       │
                    └───────────┬────────────┘
                                │ ThreatMap
                                ▼
                    ┌────────────────────────┐
                    │  useThreatMap (hook)   │   src/hooks/useThreatMap.ts
                    │  fen → memoized map    │
                    └───────────┬────────────┘
                                │ ThreatMap
                                ▼
       ┌───────────────────────────────────────────────────┐
       │  App.tsx (owns heatmapEnabled, wires everything)  │
       └───────────────────────────────┬───────────────────┘
                                       │ squareRenderer={...}
                                       ▼
              ┌────────────────────────────────────────┐
              │  ChessBoard (passes squareRenderer)    │
              └────────────────────────┬───────────────┘
                                       │ per square
                                       ▼
                    ┌────────────────────────────────┐
                    │  HeatmapSquare (presentational)│   src/components/Heatmap/
                    │  SquareControl + flags → DOM   │
                    └────────────────────────────────┘
```

The analyzer never knows about React. The renderer never knows about chess.js. The hook is the only bridge.

## 5. Modules and files

### New files

```
src/modules/threat-analyzer/
  types.ts              # SquareControl, ThreatMap, ALL_SQUARES
  ThreatAnalyzer.ts     # analyze(fen: string): ThreatMap (pure function)
  index.ts

src/components/Heatmap/
  HeatmapSquare.tsx     # per-square renderer
  types.ts              # HeatmapSquareProps
  index.ts

src/hooks/
  useThreatMap.ts       # memoized hook with module-level LRU cache (size 50)

tests/unit/
  threat-analyzer.test.ts

tests/integration/
  heatmap-square.test.tsx
  use-threat-map.test.ts

tests/e2e/
  heatmap.spec.ts
```

### Touched files (extensions, not rewrites)

- `src/App.tsx` — `heatmapEnabled` state (default `true`); wire `useThreatMap(fen)`; pass `threatMap` and `heatmapEnabled` to `ChessBoard`; sidebar toggle button; bind `onToggleHeatmap` in `useGameKeyboard`.
- `src/components/Board/ChessBoard.tsx` — accept new `squareRenderer?: (sq: Square) => ReactNode` prop; pass through to `Chessboard` `options.squareRenderer`. Existing `customSquareStyles` for legal-move/last-move/selected highlighting continues to work alongside.
- `src/components/Board/types.ts` — extend `ChessBoardProps` with `squareRenderer`.
- `src/hooks/useGameKeyboard.ts` — add `onToggleHeatmap?: () => void` to options; bind `H` (lowercase, no modifiers); respects existing `isModalOpen` guard.
- `PROJECT_PROGRESS.json` — update p4-d4 wording so it points to this spec rather than `docs/research/visualization.md`; mark p4-d5 (numeric overlay) as deferred with a note.

## 6. Data model

```typescript
// src/modules/threat-analyzer/types.ts

export interface SquareControl {
  whiteAttackers: number   // count of pseudo-legal white attackers (chess.attackers(sq, 'w').length)
  blackAttackers: number   // count of pseudo-legal black attackers
}

export interface ThreatMap {
  squares: Record<Square, SquareControl>
  inertPieceSquares: Set<Square>   // home squares of absolutely-pinned non-king pieces
}

// Generated by iterating files a..h × ranks 8..1
export const ALL_SQUARES: readonly Square[] = (() => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'] as const
  const out: Square[] = []
  for (const r of ranks) for (const f of files) out.push(`${f}${r}` as Square)
  return out
})()
```

`SquareControl` is intentionally minimal. Everything else (`isUnilateral`, `whiteSurplus`, saturation level) is *derived in the renderer* from these two integers plus the `inertPieceSquares` set.

## 7. Algorithm: `analyze(fen)`

```typescript
export function analyze(fen: string): ThreatMap {
  const chess = new Chess(fen)

  // Step 1: per-square pseudo-legal attacker counts
  const squares: Record<Square, SquareControl> = {}
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
  if (!kingSq) return false   // no king of that color (not a real position; guard anyway)
  const enemy: Color = color === 'w' ? 'b' : 'w'
  return test.isAttacked(kingSq, enemy)
}

function findKing(chess: Chess, color: Color): Square | null {
  const board = chess.board()  // 8x8 array, rank 8 first, rank 1 last
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

**Cost:** 128 `attackers()` calls + up to 30 `Chess` clones with `remove()`/`isAttacked()`. Microseconds in practice; safely well under one render frame.

**Correctness notes:**
- `chess.attackers()` correctly handles pawn diagonal-attack semantics (pawns appear as attackers of their diagonal squares, not their forward-move squares).
- `chess.attackers()` returns geometric attackers, including pinned pieces — intended.
- The pin-check is correct because removing the piece is exactly the operation needed to test "is this piece what's blocking the discovered attack on the king."
- Edge case: in a double-check position, `chess.attackers(king_sq, enemy_color)` returns ≥ 2; the analyzer doesn't care about this — it just counts. This is correct.

## 8. Visualization contract: `HeatmapSquare`

### Props

```typescript
export interface HeatmapSquareProps {
  square: Square
  control: SquareControl       // { whiteAttackers, blackAttackers }
  isInertPiece: boolean        // true iff square ∈ inertPieceSquares
  isLightSquare: boolean       // for badge color picking
}
```

### Rendering rules

Given `N_w = control.whiteAttackers`, `N_b = control.blackAttackers`:

1. Compute `matched = Math.min(N_w, N_b)`, `surplus_w = Math.max(0, N_w − N_b)`, `surplus_b = Math.max(0, N_b − N_w)`.
2. Render `N_b` stripes in the **top** band: `matched` desaturated stripes followed by `surplus_b` saturated stripes (black-side color family).
3. Render `N_w` stripes in the **bottom** band: same structure, white-side color family.
4. If `matched === 0 && (N_w > 0 || N_b > 0)`: add a 3px inset red `box-shadow` to the square (the U1 unilateral marker).
5. If `isInertPiece`: render a small monotone SVG lock in the top-right corner (12–14px, color `rgba(0,0,0,0.55)` on light squares, `rgba(255,255,255,0.65)` on dark).
6. All overlay elements have `pointer-events: none` so drag/click events still pass through to the piece.

### Color and saturation

Concrete values committed for v1 (any future palette refinement edits these constants in one place):

| Token | Value |
|-------|-------|
| `BLACK_SIDE_COLOR` | `#c0392b` (red family) |
| `WHITE_SIDE_COLOR` | `#1f7a1f` (green family) |
| `DESAT_COLOR` | `#888888` (neutral gray) |
| `UNILATERAL_BORDER_COLOR` | `rgba(220,38,38,0.95)` |
| `MAX_SURPLUS` | `5` |

Per-stripe saturation magnitude `s` (a number in `[0, 1]`):
```
s = Math.min(Math.sqrt(surplus / MAX_SURPLUS), 1)
```
where `surplus` is whichever side this stripe belongs to (`surplus_w` for white-side, `surplus_b` for black-side). Matched stripes always use `s = 0`.

Stripe color is computed as a linear blend between `DESAT_COLOR` and the side's base color, weighted by `s`:
```
stripeColor = mix(DESAT_COLOR, sideBaseColor, s)
```
In CSS, this can be expressed via `color-mix(in srgb, ${sideBaseColor} ${s*100}%, ${DESAT_COLOR} ${(1-s)*100}%)` or, if `color-mix` browser-support is a concern, by computing the RGB blend in JS and emitting `rgb(...)` inline. Either is acceptable; pick one in the implementation plan.

### Notes

- Stripes are ~3px tall, separated by 2px gaps, in a flex column. Top band stacks top-down; bottom band uses `flex-direction: column-reverse` so stripes count outward from the piece.
- The visual style of the stripes themselves is rudimentary in v1; a future refinement pass may replace stripes with bars, pips, or another mark. The rendering rules (count, position, saturation) remain stable through such a swap.
- The renderer is pure: same props in, same DOM out. No state, no effects.

## 9. Integration: hook and toggle

### `useThreatMap(fen)`

```typescript
const cache = new Map<string, ThreatMap>()  // module-level LRU
const MAX_CACHE = 50

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
      if (oldest !== undefined) cache.delete(oldest)
    }
    return map
  }, [fen])
}
```

`Map` insertion order acts as the LRU — `delete + set` on read promotes to most-recent.

### `App.tsx` wiring

`isLightSquare` is the helper already defined in `src/components/Board/ChessBoard.tsx`. Promote it to `src/components/Board/index.ts` (or a new `src/utils/squareColor.ts`) so it can be reused by both `ChessBoard.tsx` and the `App` -> `HeatmapSquare` wiring without duplication.

```typescript
const [heatmapEnabled, setHeatmapEnabled] = useState(true)
const threatMap = useThreatMap(fen)

useGameKeyboard({
  onPrev: goPrev,
  onNext: goNext,
  onFirst: goFirst,
  onLast: goLast,
  onToggleHeatmap: () => setHeatmapEnabled((v) => !v),
  isModalOpen: isLoadOpen,
})

const squareRenderer = heatmapEnabled
  ? (sq: Square) => (
      <HeatmapSquare
        square={sq}
        control={threatMap.squares[sq]}
        isInertPiece={threatMap.inertPieceSquares.has(sq)}
        isLightSquare={isLightSquare(sq)}
      />
    )
  : undefined
```

When `heatmapEnabled` is `false`, no `squareRenderer` is passed and `react-chessboard` renders normally with no heatmap layer. `useThreatMap(fen)` is still called — cheap, memoized, and avoids a hook-count mismatch on toggle.

### Sidebar toggle button

A new "Heatmap" button rendered alongside "Board Colors" in the sidebar. Tailwind classes consistent with existing sidebar buttons; visual state reflects `heatmapEnabled`.

### Keyboard

`H` (lowercase, no modifiers) toggles `heatmapEnabled`. `useGameKeyboard` already gates on `isModalOpen` to avoid stealing focus from text inputs in `LoadDialog`; we reuse that guard.

## 10. Testing strategy

Per `CLAUDE.md`: **behavior tests only.** No tests that just verify a component renders, no asserting on CSS class names that contribute nothing to the contract. If removing a test wouldn't reduce confidence in a real failure mode, don't write it.

### `tests/unit/threat-analyzer.test.ts`

Curated FENs vs. hand-computed expected `ThreatMap`s:

- **Starting position.** Verify symmetry: `whiteAttackers(sq)` for white-side squares equals `blackAttackers(mirrored_sq)` for black-side squares. Verify pawns have the expected number of attackers/defenders. Verify `inertPieceSquares` is empty (no pins in starting position).
- **Ruy Lopez after 3.Bb5.** Spot-check several squares against a hand-computed table. Reminder: `chess.attackers(sq, c)` does NOT include a piece sitting on `sq` itself, so for c6, `blackAttackers` counts pieces *other than* the knight on c6 that defend c6 (e.g., the d7 pawn, the b7 pawn). For c6, `whiteAttackers` counts the bishop on b5. For e5, `whiteAttackers` counts the knight on f3 and the pawn on e4 is irrelevant (e4 doesn't attack e5). Verify both counts on c6, e5, d4, and one or two empty central squares.
- **Pinned-knight position.** Construct a position with a white knight absolutely pinned by a black rook against the white king. Verify the knight's square is in `inertPieceSquares`. Verify a *non-pinned* knight in the same position is not.
- **Relatively-pinned piece.** Construct a position with a piece pinned to the queen (not the king). Verify it does NOT appear in `inertPieceSquares` (the analyzer's "inert" predicate is absolute pin against the king only).
- **Pawn-attack-vs-move asymmetry.** Verify a pawn appears as an attacker of its diagonal squares and NOT its forward-move squares.
- **Position with no pieces of one color attacking a given square.** Verify count is 0, not undefined.

The aim is to lock down the analyzer's contract: *for these inputs, exactly this output*. Any future refactor must preserve these.

### `tests/integration/heatmap-square.test.tsx`

Drive `HeatmapSquare` with prop combinations and assert observable structure (DOM element counts, semantically meaningful attributes, not class names):

- `(N_w=2, N_b=0)`: 2 stripe elements in the white-side band, 0 in the black-side band. Border is present (unilateral). No lock.
- `(N_w=3, N_b=3)`: 3 stripes in each band. None saturated (assert via inline-style or semantic data attribute). No border.
- `(N_w=5, N_b=2)`: 5 stripes in white band (2 desat + 3 saturated), 2 stripes in black band (both desat). No border.
- `(N_w=0, N_b=0)`: zero stripes, no border, no lock.
- `isInertPiece=true`: lock SVG is present.
- `isInertPiece=true, N_w=0, N_b=0`: lock present, no stripes — verifies channels are independent.

Saturation semantics (saturated vs. desaturated) are exposed via a stable mechanism for the test (e.g., an inline `data-saturated="true|false"` on each stripe, or an inline `style.background` value the test inspects). Do *not* assert against arbitrary internal class names that may be refactored.

### `tests/integration/use-threat-map.test.ts`

- Same FEN passed twice in successive renders returns referentially equal `ThreatMap` (memoization works).
- Different FEN returns different `ThreatMap`.
- Cache eviction: pass 51 distinct FENs; the first FEN is no longer cached (verify by passing it again and observing fresh computation — could mock `analyze` via spy, or assert by reference inequality).

### `tests/e2e/heatmap.spec.ts`

Minimal Playwright smoke test:

1. Load the app. Confirm at least one stripe element is rendered (heatmap visible by default).
2. Press `H`. Confirm stripe elements are gone.
3. Press `H` again. Confirm stripes return.
4. Load FEN `4k3/8/8/4r3/8/4N3/8/4K3 w - - 0 1` via `LoadDialog`. The white knight on e3 is absolutely pinned along the e-file by the black rook on e5 against the white king on e1. Confirm a lock SVG is present on e3.
5. Load FEN `4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1` via `LoadDialog`. The black pawn on d5 is attacked by the white pawn on e4 with zero black defenders — unilateral. Confirm a 3px inset red border on d5.

E2e is deliberately minimal — exhaustive logic verification belongs in unit/integration. E2e proves the wiring works end-to-end.

## 11. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| `react-chessboard` 5.x `squareRenderer` API differs from what we assume | Design boundary is "the heatmap layer is a pluggable per-square renderer." If the API is e.g. `customSquare` or accepts different args, adapt the call site without changing the analyzer or `HeatmapSquare`. Verify in the implementation plan's first task. |
| Pin detection has subtle edge cases (e.g., en passant pins, two pinned pieces in a row) | Unit tests cover the common cases. The remove-and-recheck approach is logically correct for absolute pins; if a test surfaces an edge case, fix the analyzer in isolation. |
| Heatmap visual is too noisy at small board sizes | Indicator-style refinement is explicitly deferred — Phase 4 ships the rudimentary version, then we refine based on actual feel. |
| Performance regression on rapid navigation | Memoization makes repeat-FEN visits free; only the first visit per ply pays the cost. If a real measurement shows a problem, add a debounce on `useThreatMap` keyed by RAF. |

## 12. Acceptance criteria

Phase 4 ships when:

1. `analyze(fen)` produces correct `ThreatMap`s for the curated unit-test corpus.
2. `HeatmapSquare` renders the rules in section 8 correctly under the integration-test cases.
3. `useThreatMap` memoizes correctly and evicts at the configured cache size.
4. The app shows the heatmap by default; `H` toggles it; the sidebar button toggles it.
5. The heatmap follows the displayed FEN through history navigation.
6. `npm run typecheck`, `npm run lint`, `npm run test:run`, `npm run build`, and `npm run test:e2e` all pass.
7. Manual smoke-test in browser confirms the visual matches the contract on a real position with at least one pinned piece and one hanging piece.

## 13. Implementation ordering note

Suggested for the implementation plan (writing-plans will detail tasks):

1. Analyzer module + unit tests (pure data layer first, no UI).
2. `useThreatMap` hook + memoization tests.
3. `HeatmapSquare` component + integration tests.
4. Wire `squareRenderer` prop into `ChessBoard`.
5. Wire `App.tsx` state, sidebar toggle, keyboard shortcut.
6. E2e smoke test.
7. Update `PROJECT_PROGRESS.json` for Phase 4 deliverables.

Each step should land as a narrow commit per `CLAUDE.md` conventions.
