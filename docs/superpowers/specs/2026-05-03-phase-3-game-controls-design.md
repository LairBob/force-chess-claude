# Phase 3 — Game Controls + Import/Export — Design

**Date:** 2026-05-03
**Phase:** 3 (Game Controls + Import/Export)
**Status:** Approved (brainstorm complete; implementation plan pending)

## Goals

Deliver four coupled features that share state and UI surface:

1. **PGN import/export** — paste a PGN to load a game; copy the current game as PGN.
2. **FEN import/export** — paste a FEN to load a position; copy the current position's FEN.
3. **Game navigation** — first / previous / next / last buttons, click-to-jump in the move history, keyboard shortcuts.
4. **Redo** — subsumed by forward navigation; no separate "Redo" button.

## Non-goals (explicit)

- **Timer/clock** — orthogonal feature, separate later spec.
- **Variations / branching** — Phase 5+ concern; PGN's `(...)` annotations are accepted as input but variations are not preserved (chess.js v1.4 discards them on `loadPgn`).
- **Multi-game PGNs** — Phase 8.
- **`.pgn` file upload / download** — clipboard-only for v1; can be a follow-up spec.
- **Promotion piece picker** — pre-existing limitation; auto-queens remain auto-queens.
- **Confirmation dialog before truncating future moves** — chess apps don't, we don't.

## Architecture

### State model: engine + redo stack

`useChessGame` adds one new piece of state:

```ts
const [redoStack, setRedoStack] = useState<Move[]>([])
```

**Invariants:**

- The engine always holds the *currently-displayed* position — not necessarily the latest position of the loaded game.
- `history` (from `engine.getHistory()`) = moves **up to and including** the displayed ply.
- `redoStack` = moves **after** the displayed ply, ordered so that `pop()` returns the next forward move.
- Together, `history.concat([...redoStack].reverse())` = the full canonical move list of the loaded game.

**Transitions:**

| Action | Engine | redoStack |
|---|---|---|
| `goPrev()` | `undoMove()` | `push(undone)` |
| `goNext()` | `makeMove(top)` | `pop()` |
| `goFirst()` | loop `goPrev` until `history.length === 0` | grows |
| `goLast()` | loop `goNext` until `redoStack.length === 0` | empties |
| `goToPly(n)` | walk in the right direction by `n - currentPly` steps | adjusts |
| `makeMove(...)` (user plays a new move) | if `redoStack.length > 0` clear it, then `engine.makeMove` | cleared |
| `loadFEN(fen)` | `engine.loadFEN(fen)` | cleared |
| `loadPGN(pgn)` | `engine.loadPGN(pgn)` then immediately `goFirst()` | populated with full game |
| `reset()` | `engine.reset()` | cleared |
| `undoMove()` (legacy) | thin alias for `goPrev()` | as `goPrev` |

`displayedPly` is derived: `history.length`. It is the ply *after* the displayed move (i.e., it equals the number of half-moves played to reach the current position).

### Where `loadPGN` leaves the playhead

Decision: **land on ply 0 — the starting position, with the full game in `redoStack`**. (Not "move 1" in chess notation, which is after white plays.) The most common reason to paste a PGN is "I want to review this game from the start." Stepping forward with `→` then walks through the game.

### Naming

- Inside `useChessGame`, rename the local state variable `lastMove` to `displayedMove` (the move *to* the displayed position, not necessarily the latest move played).
- **The hook's return key also changes from `lastMove` to `displayedMove`.** Consumers (currently just `App.tsx`) must update their destructure.
- The prop on `<ChessBoard />` keeps the name `lastMove` — that prop is purely about visual from/to highlighting and the meaning is unchanged from the board's perspective. `App.tsx` will pass `<ChessBoard lastMove={displayedMove} ... />`.

## Components

### New: `<GameNav />` — `src/components/Controls/GameNav.tsx`

Four-button strip rendered above `<MoveHistory />` in the sidebar.

```
[<<] [<] [>] [>>]
```

**Props:**
- `canGoBack: boolean`
- `canGoForward: boolean`
- `onFirst: () => void`
- `onPrev: () => void`
- `onNext: () => void`
- `onLast: () => void`

Buttons render as icon-only (or text glyphs) with `aria-label` of "First move", "Previous move", "Next move", "Last move". Disabled when not applicable.

### Updated: `<MoveHistory />` — `src/components/Notation/MoveHistory.tsx`

- Each SAN cell becomes a `<button>` (tab-focusable, screen-reader-friendly).
- New props:
  - `currentPly: number` — the ply currently displayed; the corresponding **cell** (one half-move) gets a highlight class. Mapping: cell at history-index `i` represents ply `i+1`; highlight when `currentPly === i + 1`. Whole rows are not highlighted.
  - `onJumpToPly: (ply: number) => void` — clicking the cell at history-index `i` calls `onJumpToPly(i + 1)`.
- Auto-scroll the highlighted cell into view with `ref.scrollIntoView({ block: 'nearest' })` **only when `currentPly` changes**, not on every render (avoid fighting manual scrolling).
- When `currentPly === 0` (starting position), no cell is highlighted.

### New: `<LoadDialog />` — `src/components/Controls/LoadDialog.tsx`

Modal with:

- Backdrop (click to close), `Esc` to close, focus-trap within the dialog.
- Title: "Load Position or Game".
- `<textarea>` (8 rows, monospace, ~80 char wide).
- Validation message area below (red text) — empty when no error.
- Footer: `[Cancel]` `[Load]`. `Load` disabled while textarea is empty.
- On `Load`:
  - Run `detectFormat`.
  - If FEN: call `loadFEN`. If success → close. If failure → show "Invalid FEN" inline.
  - If PGN: call `loadPGN`. If success → close. If failure → show "Invalid PGN" inline.
  - If unknown: show "This doesn't look like a valid FEN or PGN" inline.
- Modal stays open on any failure.

**Props:**
- `isOpen: boolean`
- `onClose: () => void`
- `onLoadFEN: (fen: string) => boolean`
- `onLoadPGN: (pgn: string) => boolean`

### New: `<ExportPanel />` — `src/components/Controls/ExportPanel.tsx`

A small sidebar section with two buttons:

- `[Copy FEN]` — copies `engine.getFEN()` (FEN of the **displayed** ply, not the latest game position).
- `[Copy PGN]` — copies `engine.getPGN()` (full game from move 1).
- Each button shows a transient "Copied!" message for ~1500 ms after a successful clipboard write.
- Uses `navigator.clipboard.writeText`. On rejection, shows "Copy failed — please select and copy manually" instead.

**Props:**
- `getFEN: () => string`
- `getPGN: () => string`

### Updated: `<Header />` — `src/components/Controls/Header.tsx`

Add a `[Load…]` button that opens `<LoadDialog />`. Undo button stays. **No Redo button** — the `[>]` nav button covers that.

### Updated: `<App />`

- Pull `displayedPly`, `goFirst`, `goPrev`, `goNext`, `goLast`, `goToPly`, `loadFEN`, `loadPGN`, `getFEN`, `getPGN` from `useChessGame`.
- Local state: `isLoadDialogOpen: boolean`.
- Mount `<LoadDialog />`, `<GameNav />`, `<ExportPanel />` in the right places.
- Use a small `useGameKeyboard` hook (see below).

### New: `useGameKeyboard` — `src/hooks/useGameKeyboard.ts`

A single global keyboard listener bound to `document`.

**Signature:**
```ts
interface UseGameKeyboardOptions {
  onPrev: () => void
  onNext: () => void
  onFirst: () => void
  onLast: () => void
  isModalOpen: boolean
}

function useGameKeyboard(options: UseGameKeyboardOptions): void
```

**Bindings:**

| Key | Action |
|---|---|
| `←` / `ArrowLeft` | `onPrev` |
| `→` / `ArrowRight` | `onNext` |
| `Home` | `onFirst` |
| `End` | `onLast` |

**Guards (early return; do not call the handler):**
- `isModalOpen === true`.
- `document.activeElement` is an editable element (`<input>`, `<textarea>`, `<select>`, or any element with `contentEditable === 'true'`). Helper: `isTypingTarget(el)`.

When the handler does fire, it calls `e.preventDefault()` so `Home`/`End` do not page-scroll the surrounding document.

## Format detection

Pure helper at `src/utils/detectFormat.ts`:

```ts
export function detectFormat(raw: string): 'fen' | 'pgn' | 'unknown' {
  const s = raw.trim()
  if (!s) return 'unknown'
  if (/^\s*\[[A-Za-z]+\s+"/m.test(s)) return 'pgn'   // tag pair
  if (/^\s*1\.\s/m.test(s)) return 'pgn'              // movetext start
  if (s.includes('\n')) return 'pgn'                  // multi-line ⇒ PGN
  if (/^[1-8rnbqkpRNBQKP/]+\s+[wb]\s/.test(s)) return 'fen'
  return 'unknown'
}
```

Tested independently as a pure function.

## Data flow

```
User pastes text → LoadDialog → detectFormat → loadFEN | loadPGN
  → engine.loadFEN/loadPGN → syncState() → React re-renders

User clicks [<] → useChessGame.goPrev → engine.undoMove + redoStack.push → syncState

User clicks move 7 in MoveHistory → onJumpToPly(7) → useChessGame.goToPly(7) → walks engine

User makes a new move at ply 4 of 20:
  redoStack has 16 entries → makeMove clears redoStack → engine.makeMove → syncState

User clicks [Copy FEN] → navigator.clipboard.writeText(engine.getFEN()) → "Copied!"
```

## Error handling

- **Bad FEN paste:** `engine.loadFEN` returns `false`; dialog shows "Invalid FEN" inline; modal stays open.
- **Bad PGN paste:** `engine.loadPGN` returns `false`; dialog shows "Invalid PGN" inline; modal stays open.
- **Empty paste:** `Load` button disabled; submission impossible.
- **Clipboard write failure:** catch the rejection from `writeText`; show "Copy failed — please select and copy manually" for ~1500 ms. No DOM-injection fallback.
- **Navigation past bounds:** all `goX()` functions are no-ops if at the boundary. Buttons are also disabled, but the function must not throw if called anyway (defensive against keyboard fires racing state).
- **Initial-FEN mid-game positions (no move history):** nav buttons all disabled; move history shows "No moves yet"; redo stack empty.

## Testing

Following the project TDD + behavior-only convention:

### Unit (pure-function level)

- `detectFormat` — table-driven: empty, FEN with extra whitespace, PGN with headers, PGN movetext only, garbage, ambiguous-but-detectable.
- `useChessGame` redo-stack invariants (via `renderHook`):
  - go prev then forward → state matches start.
  - go to first → history empty, redoStack contains all moves in correct order.
  - go to last → redoStack empty, engine at the final position.
  - navigate-then-move clears redoStack (truncate-and-replace).
  - `loadPGN` then `goFirst` semantics: engine at starting position, full game in redoStack.

### Integration (component-level)

- `GameNav` button enabled/disabled mirrors hook state across navigation transitions.
- `MoveHistory` highlights the row at `currentPly`.
- Clicking a move in `MoveHistory` calls `onJumpToPly` with the right ply index.
- `LoadDialog` happy path: paste FEN → loads → dialog closes; paste PGN → loads → closes; paste garbage → error text shows, dialog stays open.
- `ExportPanel` `[Copy FEN]` writes the FEN of the **displayed** ply, not the latest position. (This is the test that locks in the "copy reflects ply" semantic.)
- `useGameKeyboard` does **not** fire when a textarea has focus.

### E2E (Playwright, chromium-only)

One smoke test:

1. Load the Fischer–Spassky PGN from `docs/research/notation-systems.md`.
2. Verify move count.
3. Click move 8 in `MoveHistory`.
4. Verify board state matches the expected FEN.
5. Press `→`.
6. Press `End`.
7. Click `[Copy PGN]`, paste-assert via `page.evaluate(() => navigator.clipboard.readText())`.

Tests that should **not** be written (per `CLAUDE.md`):

- "the new Load button exists in the DOM"
- "MoveHistory renders without crashing"
- "ExportPanel renders two buttons"

## Files

```
NEW:
  src/components/Controls/GameNav.tsx
  src/components/Controls/LoadDialog.tsx
  src/components/Controls/ExportPanel.tsx
  src/utils/detectFormat.ts
  src/hooks/useGameKeyboard.ts
  tests/unit/detect-format.test.ts
  tests/integration/load-dialog.test.tsx
  tests/integration/game-nav.test.tsx
  tests/integration/move-history-navigation.test.tsx
  tests/integration/export-panel.test.tsx
  tests/integration/use-chess-game-redo.test.ts
  tests/integration/use-game-keyboard.test.ts
  tests/e2e/import-and-navigate.spec.ts

MODIFIED:
  src/hooks/useChessGame.ts            (redo stack + nav functions; rename lastMove → displayedMove internally; expose getFEN/getPGN/displayedPly)
  src/components/Controls/Header.tsx   (add [Load…] button)
  src/components/Controls/index.ts     (export new components)
  src/components/Notation/MoveHistory.tsx (clickable + highlighted, currentPly + onJumpToPly props)
  src/App.tsx                          (wire it all up)
  PROJECT_PROGRESS.json                (mark p3-d2/3/4 complete after merge; p3-d5 left pending)
```

## Risks & open considerations

1. **Auto-scroll on long games** — `scrollIntoView` is fine but worth checking that it does not fight the user's manual scroll. Mitigation: only auto-scroll when `currentPly` *changes*, not on every render.
2. **PGN with comments / NAGs / variations** — chess.js v1.4 parses comments and NAGs but discards variations on `loadPgn`. Acceptable loss for Phase 3; flagged for Phase 5+.
3. **Initial-FEN games with no move history** — navigation is meaningful only after moves accumulate; nav buttons stay disabled. Already handled by the boolean props, but covered by a test.
4. **Clipboard permissions** — `navigator.clipboard.writeText` requires a secure context (localhost is fine for dev). Production deployments will need HTTPS, which is standard.
5. **Keyboard shortcut conflict with existing browser shortcuts** — `←`/`→` are not bound by the browser; `Home`/`End` are normally page-scroll. The `isTypingTarget` guard plus the modal guard should cover the common collision cases. Worth a manual smoke test in the dev server.

## Out-of-scope follow-ups (for later specs)

- Timer/clock (the deferred fifth Phase 3 deliverable).
- `.pgn` file upload + download.
- Promotion piece picker.
- Variations / branching (Phase 5+).
- Multi-game PGN handling (Phase 8).
- PGN header display (Event, White, Black, Result) — parsed and retained, but not surfaced in the UI in Phase 3.
