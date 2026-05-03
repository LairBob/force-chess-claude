# Phase 3 — Game Controls + Import/Export — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship PGN/FEN import/export, game navigation (first/prev/next/last + click-to-jump), and redo (subsumed by forward navigation) for Force Chess. Timer/clock is deferred.

**Architecture:** Extend `useChessGame` with a `redoStack: Move[]` alongside the existing engine. The engine is always at the *displayed* ply; `history` is moves up to that ply; `redoStack` is moves after that ply (top-of-stack = next forward move). Truncate-and-replace semantics on new moves. New UI surfaces: a four-button `<GameNav />` strip, a `<LoadDialog />` modal, an `<ExportPanel />` sidebar block, and a clickable `<MoveHistory />` with current-ply highlight.

**Tech Stack:** React 19, TypeScript 5.9 strict, Vite 7, Vitest 4, @testing-library/react, Playwright (chromium-only), chess.js 1.4, react-chessboard 5.10, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-05-03-phase-3-game-controls-design.md`

---

## Task ordering rationale

1. **Hook refactor (rename only)** before behavior changes — keeps the diff in later tasks focused on the new logic.
2. **Hook state model** before any UI — without `redoStack` and the nav functions, no component has anything to wire up.
3. **Pure helpers** (`detectFormat`, `useGameKeyboard`) — leaf-level, fully testable on their own, no UI dependencies.
4. **UI components** in dependency order: leaves first (`GameNav`, updated `MoveHistory`, `LoadDialog`, `ExportPanel`), then `Header`, then `App` wiring.
5. **E2E** at the end, when everything is wired.
6. **Verification + progress doc** as the final checkpoint.

---

## Task 1: Rename `lastMove` → `displayedMove` (refactor-only)

**Why first:** The state variable's *meaning* changes once navigation lands (the move *to* the displayed position is not necessarily the latest played). Renaming up-front lets every later task use the correct name. This task changes zero behavior.

**Files:**
- Modify: `src/hooks/useChessGame.ts` (rename internal state variable, return key, and parameter; keep type shape `{ from: Square; to: Square } | null`)
- Modify: `src/App.tsx` (destructure `displayedMove` and pass `<ChessBoard lastMove={displayedMove} />`)
- Modify: `tests/integration/useChessGame.test.ts` (every `result.current.lastMove` → `result.current.displayedMove`)

- [ ] **Step 1: Rename in `src/hooks/useChessGame.ts`**

  Inside `UseChessGameReturn`:
  ```ts
  // BEFORE
  lastMove: { from: Square; to: Square } | null
  // AFTER
  displayedMove: { from: Square; to: Square } | null
  ```

  Inside the function body, rename the state variable and every setter:
  ```ts
  const [displayedMove, setDisplayedMove] = useState<{ from: Square; to: Square } | null>(null)
  // ...all setLastMove(...) → setDisplayedMove(...)
  ```

  Update the return object key from `lastMove` to `displayedMove`.

- [ ] **Step 2: Rename in `src/App.tsx`**

  ```tsx
  // BEFORE
  const { ..., lastMove, ... } = useChessGame()
  // ...
  <ChessBoard ... lastMove={lastMove} ... />

  // AFTER
  const { ..., displayedMove, ... } = useChessGame()
  // ...
  <ChessBoard ... lastMove={displayedMove} ... />
  ```

  The `<ChessBoard />` prop name stays `lastMove` — only the hook's return key and the variable name change.

- [ ] **Step 3: Update `tests/integration/useChessGame.test.ts`**

  Every `result.current.lastMove` access becomes `result.current.displayedMove`. (There are several across the file.)

- [ ] **Step 4: Verify**

  Run: `npm run typecheck && npm run test:run`
  Expected: typecheck passes, all 98 tests still pass.

- [ ] **Step 5: Commit**

  ```bash
  git add src/hooks/useChessGame.ts src/App.tsx tests/integration/useChessGame.test.ts
  git commit -m "refactor(hook): rename lastMove → displayedMove in useChessGame"
  ```

---

## Task 2: Add `redoStack` + `goPrev` / `goNext` to `useChessGame`

**Files:**
- Modify: `src/hooks/useChessGame.ts`
- Create: `tests/integration/use-chess-game-redo.test.ts`

- [ ] **Step 1: Write failing tests for `goPrev` / `goNext`**

  Create `tests/integration/use-chess-game-redo.test.ts`:

  ```ts
  import { describe, it, expect } from 'vitest'
  import { renderHook, act } from '@testing-library/react'
  import { useChessGame } from '../../src/hooks/useChessGame'

  describe('useChessGame navigation', () => {
    it('goPrev undoes the last move and pushes onto redoStack', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.makeMove('e2', 'e4')
        result.current.makeMove('e7', 'e5')
      })

      expect(result.current.history).toHaveLength(2)

      act(() => {
        result.current.goPrev()
      })

      expect(result.current.history).toHaveLength(1)
      expect(result.current.history[0].san).toBe('e4')
      expect(result.current.canGoForward).toBe(true)
      expect(result.current.canGoBack).toBe(true)
    })

    it('goNext replays the most recently undone move', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.makeMove('e2', 'e4')
        result.current.makeMove('e7', 'e5')
        result.current.goPrev()
      })

      expect(result.current.history).toHaveLength(1)

      act(() => {
        result.current.goNext()
      })

      expect(result.current.history).toHaveLength(2)
      expect(result.current.history[1].san).toBe('e5')
      expect(result.current.canGoForward).toBe(false)
    })

    it('goPrev/goNext round-trip preserves position', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.makeMove('d2', 'd4')
        result.current.makeMove('d7', 'd5')
      })
      const fenAfterTwo = result.current.fen

      act(() => {
        result.current.goPrev()
        result.current.goNext()
      })

      expect(result.current.fen).toBe(fenAfterTwo)
    })

    it('canGoBack is false at the starting position', () => {
      const { result } = renderHook(() => useChessGame())
      expect(result.current.canGoBack).toBe(false)
    })

    it('canGoForward is false when redoStack is empty', () => {
      const { result } = renderHook(() => useChessGame())
      expect(result.current.canGoForward).toBe(false)

      act(() => {
        result.current.makeMove('e2', 'e4')
      })
      expect(result.current.canGoForward).toBe(false)
    })

    it('goPrev is a no-op at the starting position', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.goPrev()
      })

      expect(result.current.history).toHaveLength(0)
      expect(result.current.canGoBack).toBe(false)
    })
  })
  ```

- [ ] **Step 2: Run tests to confirm they fail**

  Run: `npm run test:run -- tests/integration/use-chess-game-redo.test.ts`
  Expected: All 6 tests FAIL with TypeScript errors about missing `goPrev`, `goNext`, `canGoBack`, `canGoForward`.

- [ ] **Step 3: Add `redoStack` state, `goPrev`/`goNext`, and `canGoBack`/`canGoForward` to `useChessGame`**

  In `src/hooks/useChessGame.ts`:

  Update `UseChessGameReturn`:
  ```ts
  interface UseChessGameReturn {
    fen: string
    gameState: GameState
    history: Move[]
    displayedMove: { from: Square; to: Square } | null
    selectedSquare: Square | null
    legalMoves: Square[]
    canGoBack: boolean
    canGoForward: boolean

    makeMove: (from: Square, to: Square, promotion?: string) => boolean
    selectSquare: (square: Square | null) => void
    undoMove: () => boolean
    reset: () => void
    loadFEN: (fen: string) => boolean
    loadPGN: (pgn: string) => boolean
    goPrev: () => void
    goNext: () => void

    onPieceDrop: (source: Square, target: Square, piece: string) => boolean
    onSquareClick: (square: Square) => void
    onPieceDragBegin: (piece: string, sourceSquare: Square) => void
    onPieceDragEnd: () => void
  }
  ```

  Add the redo stack state, just below the other useState calls:
  ```ts
  const [redoStack, setRedoStack] = useState<Move[]>([])
  ```

  Implement `goPrev` and `goNext` (place near `undoMove`):
  ```ts
  const goPrev = useCallback(() => {
    const undone = engine.undoMove()
    if (!undone) return
    setRedoStack((prev) => [...prev, undone])
    const newHistory = engine.getHistory()
    setDisplayedMove(
      newHistory.length > 0
        ? { from: newHistory[newHistory.length - 1].from, to: newHistory[newHistory.length - 1].to }
        : null
    )
    setSelectedSquare(null)
    syncState()
  }, [engine, syncState])

  // NOTE: Never call engine.* or setX() inside a setState updater function —
  // React 19 StrictMode can invoke updaters twice, which would double-apply
  // moves to the engine. Always do the engine mutation first (synchronously),
  // then call the setters with plain values or pure functional updates.
  const goNext = useCallback(() => {
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    const move = engine.makeMove({
      from: next.from,
      to: next.to,
      promotion: next.promotion as 'q' | 'r' | 'b' | 'n' | undefined,
    })
    if (!move) return
    setRedoStack((prev) => prev.slice(0, -1))
    setDisplayedMove({ from: move.from, to: move.to })
    setSelectedSquare(null)
    syncState()
  }, [engine, redoStack, syncState])
  ```

  Compute `canGoBack`/`canGoForward` and include in the return:
  ```ts
  const canGoBack = history.length > 0
  const canGoForward = redoStack.length > 0

  return {
    fen,
    gameState,
    history,
    displayedMove,
    selectedSquare,
    legalMoves,
    canGoBack,
    canGoForward,
    makeMove,
    selectSquare,
    undoMove,
    reset,
    loadFEN,
    loadPGN,
    goPrev,
    goNext,
    onPieceDrop,
    onSquareClick,
    onPieceDragBegin,
    onPieceDragEnd,
  }
  ```

- [ ] **Step 4: Run tests to confirm they pass**

  Run: `npm run test:run -- tests/integration/use-chess-game-redo.test.ts`
  Expected: All 6 tests PASS. Also run `npm run test:run` for full regression — all pre-existing tests should still pass (the new return keys are additive; nothing was removed).

- [ ] **Step 5: Commit**

  ```bash
  git add src/hooks/useChessGame.ts tests/integration/use-chess-game-redo.test.ts
  git commit -m "feat(hook): add redoStack and goPrev/goNext navigation to useChessGame"
  ```

---

## Task 3: Add `goFirst` / `goLast` / `goToPly` + `displayedPly`

**Files:**
- Modify: `src/hooks/useChessGame.ts`
- Modify: `tests/integration/use-chess-game-redo.test.ts`

- [ ] **Step 1: Write failing tests**

  Append to `tests/integration/use-chess-game-redo.test.ts`:

  ```ts
  describe('useChessGame goFirst/goLast/goToPly', () => {
    function playFiveMoves(result: ReturnType<typeof renderHook<ReturnType<typeof useChessGame>, void>>['result']) {
      act(() => {
        result.current.makeMove('e2', 'e4')
        result.current.makeMove('e7', 'e5')
        result.current.makeMove('g1', 'f3')
        result.current.makeMove('b8', 'c6')
        result.current.makeMove('f1', 'b5')
      })
    }

    it('goFirst empties history and populates redoStack with the full game', () => {
      const { result } = renderHook(() => useChessGame())
      playFiveMoves(result)

      act(() => {
        result.current.goFirst()
      })

      expect(result.current.history).toHaveLength(0)
      expect(result.current.canGoForward).toBe(true)
      expect(result.current.displayedPly).toBe(0)
      expect(result.current.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    })

    it('goLast empties redoStack', () => {
      const { result } = renderHook(() => useChessGame())
      playFiveMoves(result)
      const finalFen = result.current.fen

      act(() => {
        result.current.goFirst()
      })
      expect(result.current.canGoForward).toBe(true)

      act(() => {
        result.current.goLast()
      })

      expect(result.current.history).toHaveLength(5)
      expect(result.current.canGoForward).toBe(false)
      expect(result.current.fen).toBe(finalFen)
    })

    it('goToPly navigates to a specific ply (forward)', () => {
      const { result } = renderHook(() => useChessGame())
      playFiveMoves(result)

      act(() => {
        result.current.goFirst()
      })
      act(() => {
        result.current.goToPly(3)
      })

      expect(result.current.history).toHaveLength(3)
      expect(result.current.displayedPly).toBe(3)
      expect(result.current.history[2].san).toBe('Nf3')
    })

    it('goToPly navigates to a specific ply (backward)', () => {
      const { result } = renderHook(() => useChessGame())
      playFiveMoves(result)

      act(() => {
        result.current.goToPly(2)
      })

      expect(result.current.history).toHaveLength(2)
      expect(result.current.displayedPly).toBe(2)
      expect(result.current.history[1].san).toBe('e5')
    })

    it('goToPly is a no-op when ply is out of bounds', () => {
      const { result } = renderHook(() => useChessGame())
      playFiveMoves(result)

      act(() => {
        result.current.goToPly(99)
      })
      expect(result.current.displayedPly).toBe(5)

      act(() => {
        result.current.goToPly(-1)
      })
      expect(result.current.displayedPly).toBe(5)
    })

    it('displayedPly equals history.length', () => {
      const { result } = renderHook(() => useChessGame())
      expect(result.current.displayedPly).toBe(0)

      act(() => {
        result.current.makeMove('e2', 'e4')
      })
      expect(result.current.displayedPly).toBe(1)
    })
  })
  ```

- [ ] **Step 2: Run tests to confirm they fail**

  Run: `npm run test:run -- tests/integration/use-chess-game-redo.test.ts`
  Expected: 6 new tests FAIL.

- [ ] **Step 3: Implement `goFirst` / `goLast` / `goToPly` and expose `displayedPly`**

  In `src/hooks/useChessGame.ts`, add after `goNext`:

  ```ts
  const goFirst = useCallback(() => {
    const fullStack: Move[] = [...redoStack]
    let undone = engine.undoMove()
    while (undone) {
      fullStack.push(undone)
      undone = engine.undoMove()
    }
    setRedoStack(fullStack)
    setDisplayedMove(null)
    setSelectedSquare(null)
    syncState()
  }, [engine, redoStack, syncState])

  const goLast = useCallback(() => {
    if (redoStack.length === 0) return
    // Apply engine mutations synchronously, BEFORE any setState call.
    const reversed = [...redoStack].reverse()
    let lastMove: Move | null = null
    for (const m of reversed) {
      const made = engine.makeMove({
        from: m.from,
        to: m.to,
        promotion: m.promotion as 'q' | 'r' | 'b' | 'n' | undefined,
      })
      if (made) lastMove = made
    }
    setRedoStack([])
    if (lastMove) setDisplayedMove({ from: lastMove.from, to: lastMove.to })
    setSelectedSquare(null)
    syncState()
  }, [engine, redoStack, syncState])

  const goToPly = useCallback(
    (targetPly: number) => {
      const currentPly = engine.getHistory().length
      const totalPly = currentPly + redoStack.length
      if (targetPly < 0 || targetPly > totalPly || targetPly === currentPly) return

      if (targetPly < currentPly) {
        // Walk back: pop moves from engine and push onto redoStack.
        const stepsBack = currentPly - targetPly
        const popped: Move[] = []
        for (let i = 0; i < stepsBack; i++) {
          const undone = engine.undoMove()
          if (undone) popped.push(undone)
        }
        const newHistory = engine.getHistory()
        setRedoStack((prev) => [...prev, ...popped])
        setDisplayedMove(
          newHistory.length > 0
            ? {
                from: newHistory[newHistory.length - 1].from,
                to: newHistory[newHistory.length - 1].to,
              }
            : null
        )
      } else {
        // Walk forward: pop from redoStack and apply to engine — synchronously,
        // BEFORE the setState calls.
        const stepsForward = targetPly - currentPly
        const remaining = [...redoStack]
        let lastMove: Move | null = null
        for (let i = 0; i < stepsForward && remaining.length > 0; i++) {
          const m = remaining.pop()!
          const made = engine.makeMove({
            from: m.from,
            to: m.to,
            promotion: m.promotion as 'q' | 'r' | 'b' | 'n' | undefined,
          })
          if (made) lastMove = made
        }
        setRedoStack(remaining)
        if (lastMove) setDisplayedMove({ from: lastMove.from, to: lastMove.to })
      }
      setSelectedSquare(null)
      syncState()
    },
    [engine, redoStack, syncState]
  )
  ```

  Add `displayedPly` to the return type and value:
  ```ts
  // in UseChessGameReturn:
  displayedPly: number
  goFirst: () => void
  goLast: () => void
  goToPly: (ply: number) => void

  // in the function body, derive:
  const displayedPly = history.length

  // in the return object:
  return {
    ...,
    displayedPly,
    canGoBack,
    canGoForward,
    ...,
    goPrev,
    goNext,
    goFirst,
    goLast,
    goToPly,
    ...,
  }
  ```

- [ ] **Step 4: Run tests to confirm pass**

  Run: `npm run test:run -- tests/integration/use-chess-game-redo.test.ts`
  Expected: All tests in the file PASS. Also run `npm run test:run` to confirm no regressions.

- [ ] **Step 5: Commit**

  ```bash
  git add src/hooks/useChessGame.ts tests/integration/use-chess-game-redo.test.ts
  git commit -m "feat(hook): add goFirst/goLast/goToPly and displayedPly"
  ```

---

## Task 4: Truncate-on-move + `loadFEN`/`loadPGN` redoStack handling

**Files:**
- Modify: `src/hooks/useChessGame.ts`
- Modify: `tests/integration/use-chess-game-redo.test.ts`

- [ ] **Step 1: Write failing tests**

  Append to `tests/integration/use-chess-game-redo.test.ts`:

  ```ts
  describe('useChessGame truncate-and-replace + load', () => {
    it('makeMove clears redoStack when not at the latest ply', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.makeMove('e2', 'e4')
        result.current.makeMove('e7', 'e5')
        result.current.makeMove('g1', 'f3')
        result.current.goToPly(1)
      })
      expect(result.current.canGoForward).toBe(true)

      act(() => {
        result.current.makeMove('d7', 'd5')
      })

      expect(result.current.history).toHaveLength(2)
      expect(result.current.history[1].san).toBe('d5')
      expect(result.current.canGoForward).toBe(false)
    })

    it('loadFEN clears redoStack', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.makeMove('e2', 'e4')
        result.current.goPrev()
      })
      expect(result.current.canGoForward).toBe(true)

      act(() => {
        result.current.loadFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
      })

      expect(result.current.canGoForward).toBe(false)
      expect(result.current.canGoBack).toBe(false)
    })

    it('loadPGN populates redoStack and lands at ply 0', () => {
      const { result } = renderHook(() => useChessGame())

      const pgn = '1. e4 e5 2. Nf3 Nc6 3. Bb5'
      act(() => {
        const ok = result.current.loadPGN(pgn)
        expect(ok).toBe(true)
      })

      expect(result.current.displayedPly).toBe(0)
      expect(result.current.canGoForward).toBe(true)
      expect(result.current.canGoBack).toBe(false)
      expect(result.current.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')

      act(() => {
        result.current.goLast()
      })
      expect(result.current.history).toHaveLength(5)
      expect(result.current.history[4].san).toBe('Bb5')
    })

    it('reset clears redoStack', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.loadPGN('1. e4 e5 2. Nf3')
      })
      expect(result.current.canGoForward).toBe(true)

      act(() => {
        result.current.reset()
      })

      expect(result.current.canGoForward).toBe(false)
      expect(result.current.canGoBack).toBe(false)
    })
  })
  ```

- [ ] **Step 2: Run tests to confirm fail**

  Run: `npm run test:run -- tests/integration/use-chess-game-redo.test.ts`
  Expected: The 4 new tests FAIL.

- [ ] **Step 3: Update `makeMove`, `loadFEN`, `loadPGN`, `reset`**

  In `src/hooks/useChessGame.ts`:

  ```ts
  // makeMove: clear redoStack when a new move is played
  const makeMove = useCallback(
    (from: Square, to: Square, promotion?: string): boolean => {
      const move = engine.makeMove({ from, to, promotion: promotion as 'q' | 'r' | 'b' | 'n' })
      if (move) {
        setDisplayedMove({ from, to })
        setSelectedSquare(null)
        setRedoStack([])
        syncState()
        return true
      }
      return false
    },
    [engine, syncState]
  )

  // reset: also clear redoStack
  const reset = useCallback(() => {
    engine.reset()
    setDisplayedMove(null)
    setSelectedSquare(null)
    setRedoStack([])
    syncState()
  }, [engine, syncState])

  // loadFEN: clear redoStack
  const loadFEN = useCallback(
    (newFEN: string): boolean => {
      const success = engine.loadFEN(newFEN)
      if (success) {
        setDisplayedMove(null)
        setSelectedSquare(null)
        setRedoStack([])
        syncState()
      }
      return success
    },
    [engine, syncState]
  )

  // loadPGN: populate redoStack with the full game (in reverse so pop yields move 1),
  // then leave engine at ply 0.
  const loadPGN = useCallback(
    (pgn: string): boolean => {
      const success = engine.loadPGN(pgn)
      if (!success) return false

      const fullHistory = engine.getHistory() // engine is at the END of the game now
      // Walk back to ply 0
      while (engine.undoMove()) { /* unwind */ }

      // redoStack must have move 1 on top of stack? No — top-of-stack via pop() = next forward move.
      // Move 1 is the *first* forward move from ply 0. So move 1 must be the LAST element.
      // We have fullHistory ordered move 1, 2, ..., N. Reverse it so element [N-1] = move 1.
      // Top of stack via [...].pop() returns the LAST element. So redoStack[length-1] should be move 1.
      // That means we want redoStack = [moveN, moveN-1, ..., move1].
      const stack = [...fullHistory].reverse()

      setRedoStack(stack)
      setDisplayedMove(null)
      setSelectedSquare(null)
      syncState()
      return true
    },
    [engine, syncState]
  )
  ```

  **Note on the comment block above:** keep one short comment in the code itself explaining *why* `redoStack` is reversed (the pop-yields-next-forward-move invariant) — that's a non-obvious why. Drop the longer reasoning; the spec captures it.

  Final code comment in `loadPGN`:
  ```ts
  // redoStack invariant: top-of-stack (last element) = next forward move. So move 1 must be
  // the last element of the array. Reverse the history (which is move 1..N) accordingly.
  const stack = [...fullHistory].reverse()
  ```

- [ ] **Step 4: Run tests to confirm pass**

  Run: `npm run test:run`
  Expected: all tests pass (new + pre-existing). Specifically: `loadPGN` test confirms ply 0 with full redoStack, `goLast` from there reaches the original final position.

- [ ] **Step 5: Commit**

  ```bash
  git add src/hooks/useChessGame.ts tests/integration/use-chess-game-redo.test.ts
  git commit -m "feat(hook): truncate-on-move and loadPGN-lands-at-ply-0"
  ```

---

## Task 5: Expose `getFEN` / `getPGN` from the hook

**Files:**
- Modify: `src/hooks/useChessGame.ts`

- [ ] **Step 1: Write failing test**

  Append to `tests/integration/use-chess-game-redo.test.ts`:

  ```ts
  describe('useChessGame getFEN/getPGN', () => {
    it('getFEN reflects the displayed ply, not the latest position', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.makeMove('e2', 'e4')
        result.current.makeMove('e7', 'e5')
      })
      const finalFen = result.current.getFEN()

      act(() => {
        result.current.goPrev()
      })
      const oneMoveFen = result.current.getFEN()

      expect(oneMoveFen).not.toBe(finalFen)
      expect(oneMoveFen).toContain(' b ')
    })

    it('getPGN returns the full canonical game regardless of displayed ply', () => {
      const { result } = renderHook(() => useChessGame())

      act(() => {
        result.current.makeMove('e2', 'e4')
        result.current.makeMove('e7', 'e5')
        result.current.goPrev()
      })

      const pgn = result.current.getPGN()
      expect(pgn).toContain('1. e4')
      expect(pgn).toContain('e5')
    })
  })
  ```

  **Open question:** does chess.js's `pgn()` reflect *engine state* or *full history*? When you `engine.undo()`, chess.js drops the last move from its internal history, so `pgn()` only shows what's in the engine right now. That means `getPGN()` of "engine alone" only reflects up to the displayed ply, **not** the canonical full game.

  This is a real semantic gap. The spec says `[Copy PGN]` should return the full game. So we must reconstruct it: PGN = the moves in `history` (engine) + the moves in `redoStack` (reversed) replayed.

  Adjust the test accordingly to assert full-game behavior even after navigating back:

  ```ts
  it('getPGN returns the full canonical game regardless of displayed ply', () => {
    const { result } = renderHook(() => useChessGame())

    act(() => {
      result.current.makeMove('e2', 'e4')
      result.current.makeMove('e7', 'e5')
      result.current.makeMove('g1', 'f3')
      result.current.goToPly(1) // navigate back to after 1.e4
    })

    const pgn = result.current.getPGN()
    expect(pgn).toContain('1. e4')
    expect(pgn).toContain('e5')
    expect(pgn).toContain('Nf3')
  })
  ```

- [ ] **Step 2: Run test to confirm fail**

  Run: `npm run test:run -- tests/integration/use-chess-game-redo.test.ts`
  Expected: 2 new tests FAIL with "getFEN is not a function".

- [ ] **Step 3: Implement `getFEN` and `getPGN`**

  In `src/hooks/useChessGame.ts`:

  Add to `UseChessGameReturn`:
  ```ts
  getFEN: () => string
  getPGN: () => string
  ```

  Implement:
  ```ts
  const getFEN = useCallback(() => engine.getFEN(), [engine])

  const getPGN = useCallback(() => {
    // Reconstruct the canonical full-game PGN regardless of displayed ply.
    // Strategy: walk the engine forward through the redoStack (in reverse so pop = next forward),
    // capture pgn(), then walk back to restore engine state. This avoids leaking state.
    const stackCopy = [...redoStack]
    const replayed: Move[] = []
    while (stackCopy.length > 0) {
      const m = stackCopy.pop()!
      const made = engine.makeMove({
        from: m.from,
        to: m.to,
        promotion: m.promotion as 'q' | 'r' | 'b' | 'n' | undefined,
      })
      if (made) replayed.push(made)
    }
    const pgn = engine.getPGN()
    // Restore engine to original displayed ply
    for (let i = 0; i < replayed.length; i++) {
      engine.undoMove()
    }
    return pgn
  }, [engine, redoStack])
  ```

  Add both to the return object.

  **Note:** `getPGN`'s side-effect-then-restore pattern is acceptable here because `engine` is encapsulated state owned by the hook, and the operations are synchronous within a single React render cycle. There is no concurrent access. If this proves problematic in practice, switch to a "pure replay from initial FEN" approach later.

- [ ] **Step 4: Run tests to confirm pass**

  Run: `npm run test:run`
  Expected: all pass.

- [ ] **Step 5: Commit**

  ```bash
  git add src/hooks/useChessGame.ts tests/integration/use-chess-game-redo.test.ts
  git commit -m "feat(hook): expose getFEN/getPGN reflecting displayed-ply / full-game semantics"
  ```

---

## Task 6: `detectFormat` pure helper

**Files:**
- Create: `src/utils/detectFormat.ts`
- Create: `tests/unit/detect-format.test.ts`

- [ ] **Step 1: Write failing tests**

  Create `tests/unit/detect-format.test.ts`:

  ```ts
  import { describe, it, expect } from 'vitest'
  import { detectFormat } from '../../src/utils/detectFormat'

  describe('detectFormat', () => {
    it('returns "unknown" for empty string', () => {
      expect(detectFormat('')).toBe('unknown')
      expect(detectFormat('   \n\t  ')).toBe('unknown')
    })

    it('detects starting-position FEN', () => {
      expect(
        detectFormat('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
      ).toBe('fen')
    })

    it('detects FEN with surrounding whitespace', () => {
      expect(
        detectFormat('   rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b - - 0 1   ')
      ).toBe('fen')
    })

    it('detects PGN with header tag pair', () => {
      const pgn = '[Event "Test"]\n[Site "Local"]\n\n1. e4 e5'
      expect(detectFormat(pgn)).toBe('pgn')
    })

    it('detects PGN with movetext only and a leading move number', () => {
      expect(detectFormat('1. e4 e5 2. Nf3 Nc6')).toBe('pgn')
    })

    it('detects multi-line text as PGN even without explicit signals', () => {
      expect(detectFormat('1. e4 e5\n2. Nf3 Nc6')).toBe('pgn')
    })

    it('returns "unknown" for arbitrary garbage', () => {
      expect(detectFormat('hello world')).toBe('unknown')
      expect(detectFormat('not a chess thing')).toBe('unknown')
    })

    it('returns "unknown" for an incomplete FEN-looking string', () => {
      // Missing active color field
      expect(detectFormat('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')).toBe('unknown')
    })
  })
  ```

- [ ] **Step 2: Run tests to confirm fail**

  Run: `npm run test:run -- tests/unit/detect-format.test.ts`
  Expected: All FAIL with "Cannot find module".

- [ ] **Step 3: Implement `detectFormat`**

  Create `src/utils/detectFormat.ts`:

  ```ts
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
  ```

- [ ] **Step 4: Run tests to confirm pass**

  Run: `npm run test:run -- tests/unit/detect-format.test.ts`
  Expected: All 8 PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add src/utils/detectFormat.ts tests/unit/detect-format.test.ts
  git commit -m "feat(utils): add detectFormat helper for FEN/PGN sniffing"
  ```

---

## Task 7: `useGameKeyboard` hook

**Files:**
- Create: `src/hooks/useGameKeyboard.ts`
- Create: `tests/integration/use-game-keyboard.test.ts`

- [ ] **Step 1: Write failing tests**

  Create `tests/integration/use-game-keyboard.test.ts`:

  ```ts
  import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
  import { renderHook } from '@testing-library/react'
  import { useGameKeyboard } from '../../src/hooks/useGameKeyboard'

  function fireKey(key: string) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    document.dispatchEvent(event)
    return event
  }

  describe('useGameKeyboard', () => {
    let onPrev: ReturnType<typeof vi.fn>
    let onNext: ReturnType<typeof vi.fn>
    let onFirst: ReturnType<typeof vi.fn>
    let onLast: ReturnType<typeof vi.fn>

    beforeEach(() => {
      onPrev = vi.fn()
      onNext = vi.fn()
      onFirst = vi.fn()
      onLast = vi.fn()
    })

    afterEach(() => {
      // Clean up any focused inputs
      document.body.innerHTML = ''
    })

    it('ArrowLeft calls onPrev', () => {
      renderHook(() =>
        useGameKeyboard({ onPrev, onNext, onFirst, onLast, isModalOpen: false })
      )
      fireKey('ArrowLeft')
      expect(onPrev).toHaveBeenCalledTimes(1)
    })

    it('ArrowRight calls onNext', () => {
      renderHook(() =>
        useGameKeyboard({ onPrev, onNext, onFirst, onLast, isModalOpen: false })
      )
      fireKey('ArrowRight')
      expect(onNext).toHaveBeenCalledTimes(1)
    })

    it('Home calls onFirst, End calls onLast', () => {
      renderHook(() =>
        useGameKeyboard({ onPrev, onNext, onFirst, onLast, isModalOpen: false })
      )
      fireKey('Home')
      fireKey('End')
      expect(onFirst).toHaveBeenCalledTimes(1)
      expect(onLast).toHaveBeenCalledTimes(1)
    })

    it('does not fire when isModalOpen is true', () => {
      renderHook(() =>
        useGameKeyboard({ onPrev, onNext, onFirst, onLast, isModalOpen: true })
      )
      fireKey('ArrowLeft')
      fireKey('ArrowRight')
      fireKey('Home')
      fireKey('End')
      expect(onPrev).not.toHaveBeenCalled()
      expect(onNext).not.toHaveBeenCalled()
      expect(onFirst).not.toHaveBeenCalled()
      expect(onLast).not.toHaveBeenCalled()
    })

    it('does not fire when a textarea has focus', () => {
      const ta = document.createElement('textarea')
      document.body.appendChild(ta)
      ta.focus()
      expect(document.activeElement).toBe(ta)

      renderHook(() =>
        useGameKeyboard({ onPrev, onNext, onFirst, onLast, isModalOpen: false })
      )
      fireKey('ArrowLeft')
      expect(onPrev).not.toHaveBeenCalled()
    })

    it('does not fire when an input has focus', () => {
      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()

      renderHook(() =>
        useGameKeyboard({ onPrev, onNext, onFirst, onLast, isModalOpen: false })
      )
      fireKey('ArrowLeft')
      expect(onPrev).not.toHaveBeenCalled()
    })

    it('ignores unrelated keys', () => {
      renderHook(() =>
        useGameKeyboard({ onPrev, onNext, onFirst, onLast, isModalOpen: false })
      )
      fireKey('a')
      fireKey('Enter')
      expect(onPrev).not.toHaveBeenCalled()
      expect(onNext).not.toHaveBeenCalled()
    })

    it('removes the listener on unmount', () => {
      const { unmount } = renderHook(() =>
        useGameKeyboard({ onPrev, onNext, onFirst, onLast, isModalOpen: false })
      )
      unmount()
      fireKey('ArrowLeft')
      expect(onPrev).not.toHaveBeenCalled()
    })
  })
  ```

- [ ] **Step 2: Run tests to confirm fail**

  Run: `npm run test:run -- tests/integration/use-game-keyboard.test.ts`
  Expected: All FAIL with "Cannot find module".

- [ ] **Step 3: Implement `useGameKeyboard`**

  Create `src/hooks/useGameKeyboard.ts`:

  ```ts
  import { useEffect } from 'react'

  interface UseGameKeyboardOptions {
    onPrev: () => void
    onNext: () => void
    onFirst: () => void
    onLast: () => void
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
    const { onPrev, onNext, onFirst, onLast, isModalOpen } = options

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
        }
      }

      document.addEventListener('keydown', handler)
      return () => document.removeEventListener('keydown', handler)
    }, [onPrev, onNext, onFirst, onLast, isModalOpen])
  }
  ```

- [ ] **Step 4: Run tests to confirm pass**

  Run: `npm run test:run -- tests/integration/use-game-keyboard.test.ts`
  Expected: All 8 PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add src/hooks/useGameKeyboard.ts tests/integration/use-game-keyboard.test.ts
  git commit -m "feat(hook): add useGameKeyboard for nav shortcuts (←→ Home End)"
  ```

---

## Task 8: `<GameNav />` component

**Files:**
- Create: `src/components/Controls/GameNav.tsx`
- Create: `tests/integration/game-nav.test.tsx`
- Modify: `src/components/Controls/index.ts` (add export)

- [ ] **Step 1: Write failing tests**

  Create `tests/integration/game-nav.test.tsx`:

  ```tsx
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
  ```

- [ ] **Step 2: Run tests to confirm fail**

  Run: `npm run test:run -- tests/integration/game-nav.test.tsx`
  Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement `<GameNav />`**

  Create `src/components/Controls/GameNav.tsx`:

  ```tsx
  interface GameNavProps {
    canGoBack: boolean
    canGoForward: boolean
    onFirst: () => void
    onPrev: () => void
    onNext: () => void
    onLast: () => void
  }

  const buttonClass =
    'px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed rounded text-sm font-mono transition-colors'

  export function GameNav({
    canGoBack,
    canGoForward,
    onFirst,
    onPrev,
    onNext,
    onLast,
  }: GameNavProps) {
    return (
      <div className="flex gap-1" data-testid="game-nav">
        <button
          type="button"
          aria-label="First move"
          disabled={!canGoBack}
          onClick={onFirst}
          className={buttonClass}
        >
          {'⏮'}
        </button>
        <button
          type="button"
          aria-label="Previous move"
          disabled={!canGoBack}
          onClick={onPrev}
          className={buttonClass}
        >
          {'←'}
        </button>
        <button
          type="button"
          aria-label="Next move"
          disabled={!canGoForward}
          onClick={onNext}
          className={buttonClass}
        >
          {'→'}
        </button>
        <button
          type="button"
          aria-label="Last move"
          disabled={!canGoForward}
          onClick={onLast}
          className={buttonClass}
        >
          {'⏭'}
        </button>
      </div>
    )
  }
  ```

- [ ] **Step 4: Add export**

  Modify `src/components/Controls/index.ts`:

  ```ts
  export { Header } from './Header'
  export { GameNav } from './GameNav'
  ```

  (Preserve any other existing exports already in the file.)

- [ ] **Step 5: Run tests to confirm pass**

  Run: `npm run test:run -- tests/integration/game-nav.test.tsx`
  Expected: All 3 PASS.

- [ ] **Step 6: Commit**

  ```bash
  git add src/components/Controls/GameNav.tsx src/components/Controls/index.ts tests/integration/game-nav.test.tsx
  git commit -m "feat(controls): add GameNav with first/prev/next/last buttons"
  ```

---

## Task 9: `<MoveHistory />` updates — clickable + highlighted + auto-scroll

**Files:**
- Modify: `src/components/Notation/MoveHistory.tsx`
- Create: `tests/integration/move-history-navigation.test.tsx`

- [ ] **Step 1: Write failing tests**

  Create `tests/integration/move-history-navigation.test.tsx`:

  ```tsx
  import { describe, it, expect, vi } from 'vitest'
  import { render, screen } from '@testing-library/react'
  import userEvent from '@testing-library/user-event'
  import { MoveHistory } from '../../src/components/Notation/MoveHistory'
  import type { Move } from '../../src/modules/chess-engine'

  function move(san: string): Move {
    return {
      from: 'e2',
      to: 'e4',
      piece: 'p',
      color: 'w',
      flags: 'b',
      san,
      lan: 'e2e4',
    }
  }

  const SAMPLE: Move[] = [move('e4'), move('e5'), move('Nf3'), move('Nc6')]

  describe('MoveHistory navigation', () => {
    it('clicking a SAN cell calls onJumpToPly with ply = index + 1', async () => {
      const onJumpToPly = vi.fn()
      render(
        <MoveHistory history={SAMPLE} currentPly={4} onJumpToPly={onJumpToPly} />
      )

      // Cell texts: "e4" "e5" "Nf3" "Nc6"
      await userEvent.click(screen.getByRole('button', { name: /^e4$/ }))
      expect(onJumpToPly).toHaveBeenLastCalledWith(1)

      await userEvent.click(screen.getByRole('button', { name: /^Nc6$/ }))
      expect(onJumpToPly).toHaveBeenLastCalledWith(4)
    })

    it('highlights the cell at currentPly', () => {
      render(
        <MoveHistory history={SAMPLE} currentPly={2} onJumpToPly={() => {}} />
      )
      const e5 = screen.getByRole('button', { name: /^e5$/ })
      expect(e5.className).toMatch(/bg-blue-/)

      const e4 = screen.getByRole('button', { name: /^e4$/ })
      expect(e4.className).not.toMatch(/bg-blue-/)
    })

    it('does not highlight any cell when currentPly is 0', () => {
      render(
        <MoveHistory history={SAMPLE} currentPly={0} onJumpToPly={() => {}} />
      )
      for (const san of ['e4', 'e5', 'Nf3', 'Nc6']) {
        expect(screen.getByRole('button', { name: new RegExp(`^${san}$`) }).className).not.toMatch(
          /bg-blue-/
        )
      }
    })

    it('renders empty state when history is empty', () => {
      render(<MoveHistory history={[]} currentPly={0} onJumpToPly={() => {}} />)
      expect(screen.getByText('No moves yet')).toBeInTheDocument()
    })
  })
  ```

- [ ] **Step 2: Run tests to confirm fail**

  Run: `npm run test:run -- tests/integration/move-history-navigation.test.tsx`
  Expected: FAIL — current `MoveHistory` does not accept `currentPly` / `onJumpToPly`, and cells are spans, not buttons.

- [ ] **Step 3: Update `<MoveHistory />`**

  Replace `src/components/Notation/MoveHistory.tsx`:

  ```tsx
  import { useEffect, useRef } from 'react'
  import type { Move } from '../../modules/chess-engine'

  interface MoveHistoryProps {
    history: Move[]
    currentPly: number
    onJumpToPly: (ply: number) => void
  }

  export function MoveHistory({ history, currentPly, onJumpToPly }: MoveHistoryProps) {
    const highlightedRef = useRef<HTMLButtonElement | null>(null)
    const lastScrolledPly = useRef<number>(-1)

    useEffect(() => {
      if (currentPly !== lastScrolledPly.current && highlightedRef.current) {
        highlightedRef.current.scrollIntoView({ block: 'nearest' })
        lastScrolledPly.current = currentPly
      }
    }, [currentPly])

    if (history.length === 0) {
      return (
        <div data-testid="move-history" className="bg-gray-800 rounded p-2 max-h-48 overflow-y-auto">
          <p className="text-gray-500 text-sm">No moves yet</p>
        </div>
      )
    }

    const rows: { number: number; whiteIndex: number; blackIndex: number | null }[] = []
    for (let i = 0; i < history.length; i += 2) {
      rows.push({
        number: Math.floor(i / 2) + 1,
        whiteIndex: i,
        blackIndex: i + 1 < history.length ? i + 1 : null,
      })
    }

    const cellBase = 'w-16 text-left px-1 rounded transition-colors hover:bg-gray-700'
    const cellHighlight = 'bg-blue-600/40'

    return (
      <div data-testid="move-history" className="bg-gray-800 rounded p-2 max-h-48 overflow-y-auto">
        <div className="text-sm font-mono">
          {rows.map((row) => (
            <div key={row.number} className="flex gap-2 items-center">
              <span className="text-gray-500 w-8">{row.number}.</span>
              <button
                type="button"
                ref={currentPly === row.whiteIndex + 1 ? highlightedRef : undefined}
                onClick={() => onJumpToPly(row.whiteIndex + 1)}
                className={`${cellBase} ${currentPly === row.whiteIndex + 1 ? cellHighlight : ''}`}
                data-testid={`white-move-${row.number}`}
              >
                {history[row.whiteIndex].san}
              </button>
              {row.blackIndex !== null ? (
                <button
                  type="button"
                  ref={currentPly === row.blackIndex + 1 ? highlightedRef : undefined}
                  onClick={() => onJumpToPly(row.blackIndex! + 1)}
                  className={`${cellBase} ${currentPly === row.blackIndex + 1 ? cellHighlight : ''}`}
                  data-testid={`black-move-${row.number}`}
                >
                  {history[row.blackIndex].san}
                </button>
              ) : (
                <span className="w-16" />
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 4: Run tests to confirm pass**

  Run: `npm run test:run`
  Expected: new tests PASS. **Pre-existing tests that referenced `MoveHistory` may break.** The component now requires `currentPly` and `onJumpToPly` as required props.

  - If existing `tests/integration/example.test.tsx` or `tests/integration/layout.test.tsx` rendered `<MoveHistory />` directly, update those calls to pass the new props.
  - Search: `grep -rn "<MoveHistory" tests/ src/` to find all usages.
  - The `App.tsx` usage will be fixed in Task 13.

  After fixing call sites, run again: `npm run test:run`. Expected: all PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add src/components/Notation/MoveHistory.tsx tests/integration/move-history-navigation.test.tsx
  # Plus any test-call-site fixups discovered in step 4
  git commit -m "feat(notation): clickable MoveHistory with current-ply highlight and auto-scroll"
  ```

---

## Task 10: `<LoadDialog />` modal

**Files:**
- Create: `src/components/Controls/LoadDialog.tsx`
- Create: `tests/integration/load-dialog.test.tsx`
- Modify: `src/components/Controls/index.ts`

- [ ] **Step 1: Write failing tests**

  Create `tests/integration/load-dialog.test.tsx`:

  ```tsx
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
        <LoadDialog
          isOpen={isOpen}
          onClose={onClose}
          onLoadFEN={onLoadFEN}
          onLoadPGN={onLoadPGN}
        />
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

      // userEvent.type strips newlines in some configs; use direct assignment.
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
  ```

- [ ] **Step 2: Run tests to confirm fail**

  Run: `npm run test:run -- tests/integration/load-dialog.test.tsx`
  Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement `<LoadDialog />`**

  Create `src/components/Controls/LoadDialog.tsx`:

  ```tsx
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
        // Focus the textarea on open
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
  ```

- [ ] **Step 4: Add export**

  Modify `src/components/Controls/index.ts`:

  ```ts
  export { Header } from './Header'
  export { GameNav } from './GameNav'
  export { LoadDialog } from './LoadDialog'
  ```

- [ ] **Step 5: Run tests to confirm pass**

  Run: `npm run test:run -- tests/integration/load-dialog.test.tsx`
  Expected: All 8 PASS.

- [ ] **Step 6: Commit**

  ```bash
  git add src/components/Controls/LoadDialog.tsx src/components/Controls/index.ts tests/integration/load-dialog.test.tsx
  git commit -m "feat(controls): add LoadDialog for FEN/PGN paste import"
  ```

---

## Task 11: `<ExportPanel />` component

**Files:**
- Create: `src/components/Controls/ExportPanel.tsx`
- Create: `tests/integration/export-panel.test.tsx`
- Modify: `src/components/Controls/index.ts`

- [ ] **Step 1: Write failing tests**

  Create `tests/integration/export-panel.test.tsx`:

  ```tsx
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
      // The status message appears
      expect(await screen.findByText(/Copied/i)).toBeInTheDocument()
    })

    it('shows a failure message when clipboard write rejects', async () => {
      writeText.mockRejectedValueOnce(new Error('blocked'))
      render(<ExportPanel getFEN={() => 'x'} getPGN={() => 'y'} />)

      await userEvent.click(screen.getByRole('button', { name: /Copy FEN/i }))
      expect(await screen.findByText(/Copy failed/i)).toBeInTheDocument()
    })
  })
  ```

- [ ] **Step 2: Run tests to confirm fail**

  Run: `npm run test:run -- tests/integration/export-panel.test.tsx`
  Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement `<ExportPanel />`**

  Create `src/components/Controls/ExportPanel.tsx`:

  ```tsx
  import { useState } from 'react'

  interface ExportPanelProps {
    getFEN: () => string
    getPGN: () => string
  }

  type Status =
    | { kind: 'idle' }
    | { kind: 'copied'; format: 'FEN' | 'PGN' }
    | { kind: 'failed' }

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
  ```

- [ ] **Step 4: Add export**

  Modify `src/components/Controls/index.ts`:

  ```ts
  export { Header } from './Header'
  export { GameNav } from './GameNav'
  export { LoadDialog } from './LoadDialog'
  export { ExportPanel } from './ExportPanel'
  ```

- [ ] **Step 5: Run tests to confirm pass**

  Run: `npm run test:run -- tests/integration/export-panel.test.tsx`
  Expected: All 4 PASS.

- [ ] **Step 6: Commit**

  ```bash
  git add src/components/Controls/ExportPanel.tsx src/components/Controls/index.ts tests/integration/export-panel.test.tsx
  git commit -m "feat(controls): add ExportPanel with Copy FEN / Copy PGN"
  ```

---

## Task 12: Update `<Header />` with `[Load…]` button

**Files:**
- Modify: `src/components/Controls/Header.tsx`

- [ ] **Step 1: Add `onLoad` prop and Load button**

  Replace `src/components/Controls/Header.tsx`:

  ```tsx
  interface HeaderProps {
    canUndo: boolean
    onUndo: () => void
    onFlipBoard: () => void
    onNewGame: () => void
    onLoad: () => void
  }

  export function Header({ canUndo, onUndo, onFlipBoard, onNewGame, onLoad }: HeaderProps) {
    return (
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-xl font-bold text-white">Force Chess</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onLoad}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
          >
            Load…
          </button>
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition-colors"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={onFlipBoard}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
          >
            Flip Board
          </button>
          <button
            type="button"
            onClick={onNewGame}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
          >
            New Game
          </button>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify typecheck flags App.tsx**

  Run: `npm run typecheck`
  Expected: An error in `src/App.tsx` because `Header` now requires `onLoad`. That error will be fixed in Task 13.

- [ ] **Step 3: Skip commit; bundled with App wiring**

  Don't commit yet — the codebase is in a temporarily broken state. Task 13 wires up `App.tsx` and we commit both together.

---

## Task 13: Wire it all up in `App.tsx`

**Files:**
- Modify: `src/App.tsx`
- Modify: `tests/integration/example.test.tsx` and `tests/integration/layout.test.tsx` if they reference `MoveHistory` directly (fix props)

- [ ] **Step 1: Rewrite `App.tsx` to wire everything**

  Replace `src/App.tsx`:

  ```tsx
  import { useState } from 'react'
  import { ChessBoard, SQUARE_COLORS } from './components/Board'
  import { GameLayout } from './components/Layout'
  import { Header, GameNav, LoadDialog, ExportPanel } from './components/Controls'
  import { MoveHistory } from './components/Notation'
  import { useChessGame } from './hooks'
  import { useGameKeyboard } from './hooks/useGameKeyboard'

  type ColorScheme = keyof typeof SQUARE_COLORS

  function App() {
    const [orientation, setOrientation] = useState<'white' | 'black'>('white')
    const [colorScheme, setColorScheme] = useState<ColorScheme>('green')
    const [isLoadOpen, setIsLoadOpen] = useState(false)

    const {
      fen,
      gameState,
      history,
      displayedMove,
      displayedPly,
      selectedSquare,
      legalMoves,
      canGoBack,
      canGoForward,
      onPieceDrop,
      onSquareClick,
      onPieceDragBegin,
      onPieceDragEnd,
      undoMove,
      reset,
      loadFEN,
      loadPGN,
      goFirst,
      goPrev,
      goNext,
      goLast,
      goToPly,
      getFEN,
      getPGN,
    } = useChessGame()

    useGameKeyboard({
      onPrev: goPrev,
      onNext: goNext,
      onFirst: goFirst,
      onLast: goLast,
      isModalOpen: isLoadOpen,
    })

    const handleFlipBoard = () => {
      setOrientation((prev) => (prev === 'white' ? 'black' : 'white'))
    }

    const getStatusText = () => {
      if (gameState.isCheckmate) {
        return `Checkmate! ${gameState.turn === 'w' ? 'Black' : 'White'} wins!`
      }
      if (gameState.isStalemate) return 'Stalemate - Draw!'
      if (gameState.isDraw) return 'Draw!'
      if (gameState.isCheck) return `${gameState.turn === 'w' ? 'White' : 'Black'} is in check!`
      return `${gameState.turn === 'w' ? 'White' : 'Black'} to move`
    }

    const header = (
      <Header
        canUndo={history.length > 0}
        onUndo={undoMove}
        onFlipBoard={handleFlipBoard}
        onNewGame={reset}
        onLoad={() => setIsLoadOpen(true)}
      />
    )

    const sidebar = (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">Status</h2>
          <div
            className={`px-3 py-2 rounded text-sm ${
              gameState.isCheck || gameState.isCheckmate
                ? 'bg-red-900/50 text-red-200'
                : gameState.isDraw || gameState.isStalemate
                  ? 'bg-yellow-900/50 text-yellow-200'
                  : 'bg-gray-700 text-gray-200'
            }`}
          >
            {getStatusText()}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Move History</h2>
          <GameNav
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            onFirst={goFirst}
            onPrev={goPrev}
            onNext={goNext}
            onLast={goLast}
          />
          <div className="mt-2">
            <MoveHistory history={history} currentPly={displayedPly} onJumpToPly={goToPly} />
          </div>
        </div>

        <ExportPanel getFEN={getFEN} getPGN={getPGN} />

        <div>
          <h2 className="text-lg font-semibold mb-2">Board Colors</h2>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SQUARE_COLORS) as ColorScheme[]).map((scheme) => (
              <button
                key={scheme}
                type="button"
                onClick={() => setColorScheme(scheme)}
                className={`px-3 py-1.5 rounded text-sm capitalize transition-colors ${
                  colorScheme === scheme ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {scheme}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Game Info</h2>
          <div className="text-sm text-gray-400 space-y-1">
            <p>Move: {gameState.moveNumber}</p>
            <p>Ply: {displayedPly}</p>
            <p>Orientation: {orientation}</p>
          </div>
        </div>
      </div>
    )

    return (
      <>
        <GameLayout header={header} sidebar={sidebar}>
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
          />
        </GameLayout>
        <LoadDialog
          isOpen={isLoadOpen}
          onClose={() => setIsLoadOpen(false)}
          onLoadFEN={loadFEN}
          onLoadPGN={loadPGN}
        />
      </>
    )
  }

  export default App
  ```

- [ ] **Step 2: Fix any pre-existing test that renders `<MoveHistory />` directly**

  Run: `npm run test:run`

  If `tests/integration/layout.test.tsx` or other tests fail because they instantiate `<MoveHistory history={...} />` without the new required props, update them to pass `currentPly={0}` and `onJumpToPly={() => {}}`. (These are noise-removal updates, not behavior changes.)

- [ ] **Step 3: Typecheck and full test run**

  Run: `npm run typecheck && npm run test:run`
  Expected: typecheck passes, all tests pass.

- [ ] **Step 4: Lint and build**

  Run: `npm run lint && npm run build`
  Expected: both succeed with zero errors.

- [ ] **Step 5: Manual smoke test in dev server**

  Run: `npm run dev`

  In a browser:
  1. Make a few moves; verify nav strip enables/disables correctly.
  2. Click a past move in history; verify board jumps and current-ply highlight moves.
  3. Press `←` `→` `Home` `End`; verify navigation.
  4. Click `Load…`; paste `1. e4 e5 2. Nf3`; verify load succeeds and engine sits at ply 0 with `[>]` enabled.
  5. Click `Copy FEN`; verify clipboard has the displayed-ply FEN.
  6. Click `Copy PGN`; verify full game.
  7. Navigate back to ply 1, make a different move; verify redo stack truncates.

  If anything misbehaves, fix in this task. Use Playwright MCP if no human is available — interact with the app, verify state.

- [ ] **Step 6: Commit**

  ```bash
  git add src/App.tsx src/components/Controls/Header.tsx tests/
  git commit -m "feat(app): wire GameNav, LoadDialog, ExportPanel, and keyboard nav into App"
  ```

---

## Task 14: E2E test — import & navigate

**Files:**
- Create: `tests/e2e/import-and-navigate.spec.ts`

- [ ] **Step 1: Confirm Playwright is configured to grant clipboard permissions**

  Read `playwright.config.ts` (or equivalent). If not already there, this test needs `permissions: ['clipboard-read', 'clipboard-write']` and `context: { permissions: [...] }` set on the chromium project. If unsure, set them inline in the test via `page.context().grantPermissions(...)`.

- [ ] **Step 2: Write the E2E spec**

  Create `tests/e2e/import-and-navigate.spec.ts`:

  ```ts
  import { test, expect } from '@playwright/test'

  // Truncated Fischer–Spassky 1992 PGN — small, fully valid game prefix.
  const PGN = `[Event "F/S Return Match"]
  [Site "Belgrade, Serbia JUG"]
  [Date "1992.11.04"]
  [Round "29"]
  [White "Fischer, Robert J."]
  [Black "Spassky, Boris V."]
  [Result "*"]

  1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O *`

  test('import PGN, navigate, copy', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/')

    // Open Load dialog
    await page.getByRole('button', { name: 'Load…' }).click()
    const ta = page.getByRole('textbox')
    await ta.fill(PGN)
    await page.getByRole('button', { name: 'Load' }).click()

    // After loading, ply 0; first cell of move history should NOT be highlighted yet
    // and Next button should be enabled. Click Last to fast-forward.
    await page.getByLabel('Last move').click()

    // Move history should show 8 full moves (16 plies including the white-only last move 8). Spot-check.
    await expect(page.getByTestId('white-move-1')).toHaveText('e4')
    await expect(page.getByTestId('black-move-1')).toHaveText('e5')
    await expect(page.getByTestId('white-move-8')).toHaveText('c3')

    // Click move 4 (white) — should jump to ply 7 (after 4. Ba4)
    await page.getByTestId('white-move-4').click()

    // Press ArrowRight twice
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')

    // Press End to jump to last
    await page.keyboard.press('End')

    // Click Copy PGN
    await page.getByRole('button', { name: 'Copy PGN' }).click()

    // Read clipboard
    const clip = await page.evaluate(() => navigator.clipboard.readText())
    expect(clip).toContain('1. e4')
    expect(clip).toContain('e5')
    expect(clip).toContain('Nf3')
    expect(clip).toContain('O-O')
  })
  ```

- [ ] **Step 3: Run the E2E test**

  Run: `npm run test:e2e -- import-and-navigate`
  Expected: PASS.

  If clipboard read fails on chromium (some sandbox configs block it), fall back to asserting that the success message "Copied PGN to clipboard" appeared instead, and add a comment noting why.

- [ ] **Step 4: Commit**

  ```bash
  git add tests/e2e/import-and-navigate.spec.ts
  git commit -m "test(e2e): import PGN, navigate, and copy round-trip"
  ```

---

## Task 15: Update `PROJECT_PROGRESS.json` and final verification

**Files:**
- Modify: `PROJECT_PROGRESS.json`

- [ ] **Step 1: Update `PROJECT_PROGRESS.json`**

  Inside the `phase-3` entry, mark `p3-d2`, `p3-d3`, and `p3-d4` as `"completed"`. `p3-d5` (timer/clock) stays `"pending"`. The phase status itself stays `"pending"` until the timer ships.

  Update `lastUpdated` to today's ISO date: `"2026-05-03T00:00:00Z"`.

- [ ] **Step 2: Final verification**

  Run all four:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test:run`
  - `npm run build`

  Expected: every command exits 0.

- [ ] **Step 3: Manual smoke test (one more pass)**

  Run: `npm run dev`. Repeat the smoke test from Task 13 step 5. Verify nothing has regressed.

- [ ] **Step 4: Commit**

  ```bash
  git add PROJECT_PROGRESS.json
  git commit -m "chore: mark Phase 3 import/export and navigation deliverables complete"
  ```

---

## Self-review summary

- **Spec coverage:** every spec section maps to a task. State model → Tasks 2–5; navigation UI → Task 8; clickable history → Task 9; load dialog → Task 10; export → Task 11; header + wire-up → Tasks 12–13; keyboard → Task 7; format detection → Task 6; testing requirements → embedded as steps in their tasks; E2E → Task 14.
- **Placeholders:** none. Every step contains real code or a concrete command.
- **Type consistency:** `useChessGame` return type extends additively (Tasks 2–5); `displayedMove` introduced in Task 1 and used consistently afterward; component prop names (`canGoBack`, `canGoForward`, `currentPly`, `onJumpToPly`, `getFEN`, `getPGN`) are stable across producer (hook) and consumers (components).
- **Open caveats called out in plan:** chess.js's `pgn()` reflects engine state only — Task 5 reconstructs full-PGN deliberately; clipboard-read in E2E may need permission grant; pre-existing tests may need prop-update touch-ups (Task 9 step 4, Task 13 step 2).
