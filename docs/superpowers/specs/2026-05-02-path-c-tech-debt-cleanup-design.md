# Path C: Tech-Debt Cleanup Before Phase 3

**Date:** 2026-05-02
**Status:** Design — pending user review
**Owner:** Claude (auto mode)
**Estimated wall-clock:** ~1.5 sessions if executed serially; ~0.6 sessions with the parallel plan in §5.

---

## 1. Goal

Eliminate accumulated technical debt and stale process scaffolding so that Phase 3 (game controls + import/export) and Phase 4 (threat visualization) can be built on a current, accurate, well-tested foundation. **No functional changes to gameplay.** The shipped chess application behaves identically before and after.

## 2. Why now

A full re-evaluation surfaced three classes of debt that get more expensive to carry the longer we leave them:

1. **`react-chessboard@4.7.3` is pinned**; v5.10.0 is current and explicitly supports React 19. The original pin reason ("React 19 incompatibility") is obsolete. v5's new `squareRenderer` API is the primary mechanism we'll want for Phase 4's heatmap overlay; building Phase 4 on v4 would mean either rewriting that work later or compositing CSS-gradient strings forever.
2. **The session-management process** (CLAUDE_PROJECT_GUIDELINES.md, per-session charter.json + progress.json, 200-line handoffs, 75% token-pause protocol) was load-bearing for short-context agents. With the 1M context window it's overhead — and starting to drift (session-03 already skipped its per-session JSON files).
3. **~18 scaffolding tests and 5 placeholder E2E tests** test that constants equal themselves and that JSX has the literal class names we wrote. They never catch real failures and tax future refactors.

A targeted cleanup now — done in one focused session — costs less than carrying these costs into every Phase 3+ change.

## 3. Scope

### In scope (Path C as approved by user)

- **A.** react-chessboard v4 → v5 migration
- **B.** Delete empty stub modules and components, dead Vite template CSS, and unused asset svgs
- **C.** Drop placeholder example tests + the 5 placeholder E2E tests; reduce Playwright to chromium-only until we have real flows
- **D.** Drop the ~18 scaffolding tests (color hex constants, default-config-equals-itself, CSS class assertions)
- **E.** Replace `docs/CLAUDE_PROJECT_GUIDELINES.md` with a slim repo-root `CLAUDE.md`; delete per-session charter/progress JSON; fix the README roadmap table; add a one-line note to PROJECT_PROGRESS.json Phase 4 about chess.js's `attackers()` API
- **F.** Add ~15-20 chess-rules tests (castling both sides + blocked, en passant, all 4 underpromotions, threefold repetition, 50-move rule, FEN/PGN round-trip, undo through capture and through promotion)
- **G.** Resolve the path-alias mismatch — `vitest.config.ts` defines `@components`, `@modules`, `@hooks`, etc. but no source file uses them. **Decision: remove the unused aliases** (the codebase is too small to need them; can re-add when it isn't)
- **H.** Re-baseline the 80% coverage thresholds in `vitest.config.ts` after the test cleanup, against real numbers
- **I.** Extract `App.tsx`'s inline header and sidebar JSX into `Header`, `MoveHistory`, and `StatusPanel` components — only because Phase 3 will add controls into both

### Out of scope (explicitly)

- No changes to `ChessEngine`, `useChessGame`, or `GameLayout` behavior
- No new game features (Phase 3 work begins after this cleanup)
- No threat-visualization implementation (Phase 4)
- No CSS theming overhaul
- No accessibility audit (deferred to Phase 7)
- No charter.json / progress.json schema migration — we delete, not migrate
- No upgrades to React, Tailwind, Vite, Vitest, TypeScript, ESLint (all current)

## 4. Bucket-by-bucket plan

Each bucket is sized small enough to be a single discrete change with a clear pass/fail signal.

### Bucket 1 — react-chessboard v4 → v5
**Files:** `package.json`, `package-lock.json`, `src/components/Board/ChessBoard.tsx`, `src/components/Board/types.ts`, `tests/unit/board.test.ts`, `tests/integration/board.test.tsx`
**Work:** Bump dep to `^5.10.0`. Apply known prop renames:
- `customLightSquareStyle` → `lightSquareStyle`
- `customDarkSquareStyle` → `darkSquareStyle`
- `customSquareStyles` → `squareStyles`
- `customSquare` → `squareRenderer` (we don't use it yet; note for Phase 4)
- `arePiecesDraggable` → `allowDragging`
- `boardOrientation` (verify still applies)
- `showBoardNotation` (verify still applies)
- v5 uses an `options` prop pattern in some examples — verify whether the inline-prop form still works or migration is needed
**Pass:** `npm run typecheck && npm run test:run && npm run dev` shows board renders, drag works, click works, highlights still apply.

### Bucket 2 — Delete dead code
**Files to delete:**
- `src/modules/notation/index.ts`, `src/modules/notation/` (dir)
- `src/modules/threat-analyzer/index.ts`, `src/modules/threat-analyzer/` (dir)
- `src/modules/ai-opponent/index.ts`, `src/modules/ai-opponent/` (dir)
- `src/modules/game-state/index.ts`, `src/modules/game-state/` (dir)
- `src/components/Notation/index.ts` (will be re-created by Bucket I)
- `src/components/Visualization/index.ts`
- `src/components/Controls/index.ts` (will be re-created by Bucket I)
- `src/App.css`
- `src/assets/react.svg`
- `public/vite.svg`
**Work:** Pure deletion. Verify nothing imports them (grep).
**Pass:** `npm run typecheck && npm run build` succeeds; no broken imports.

### Bucket 3 — Test cleanup (placeholders + scaffolding)
**Files to delete:**
- `tests/unit/example.test.ts`
- `tests/integration/example.test.tsx`
- `tests/e2e/example.spec.ts`
**Files to trim:** `tests/unit/board.test.ts` (keep behavior tests, drop config-equals-itself tests), `tests/integration/board.test.tsx` (keep behavior tests, drop CSS-class assertions), `tests/integration/layout.test.tsx` (keep "renders header/sidebar/footer slots" but drop `flex` class assertions).
**Pass:** `npm run test:run` passes with reduced count, all remaining tests are behavior tests.

### Bucket 4 — New chess-rules.test.ts
**File:** new `tests/unit/chess-rules.test.ts`
**Work:** ~15-20 tests against the `ChessEngine` class:
- Castling kingside (white & black) succeeds from default-cleared position
- Castling kingside blocked when piece between king and rook
- Castling queenside succeeds; queenside blocked variant
- Castling forfeited after king moves; after rook moves
- En passant: legal capture when set up; illegal one move later
- Underpromotion to knight (delivers a fork); to rook; to bishop
- Auto-promotion to queen when no piece specified
- Threefold repetition detected after appropriate sequence
- 50-move rule detected (loadFEN sets halfmove clock; engine reports draw)
- Insufficient material variants (K vs K, K+B vs K, K+N vs K)
- FEN round-trip: load FEN → make 5 moves → loadFEN(getFEN()) → identical state
- PGN round-trip: load PGN of a famous short game → getPGN() → re-parses identically
- Undo through capture: capture, undo, captured piece restored to its square
- Undo through promotion: promote, undo, pawn restored at original square
**Pass:** All new tests pass; no existing tests broken.

### Bucket 5 — Process scaffolding overhaul
**Files to delete:**
- `docs/CLAUDE_PROJECT_GUIDELINES.md`
- `docs/sessions/session-01/charter.json`, `docs/sessions/session-01/progress.json`
- `docs/sessions/session-02/charter.json`, `docs/sessions/session-02/progress.json`
- `docs/sessions/SESSION_INDEX.json`
- `docs/sessions/session-01/`, `docs/sessions/session-02/` (empty after deletions)
- `docs/sessions/` (empty after the above)
*(Note: `session-03` never had per-session JSON files — that drift is a tell that this layer already wasn't pulling its weight.)*
**Files to write:**
- `CLAUDE.md` at repo root: ~50 lines covering: project purpose, tech stack, where to find things, current phase, coding conventions (TDD, prefer Edit over Write, narrow PRs, no scaffolding tests), how to verify state (`npm run typecheck && npm run test:run && npm run dev`)
**Files to modify:**
- `README.md`: rewrite the Roadmap table to reflect actual status (Phases 0-2 complete, 3 in progress next, 4-8 pending). Remove the "Session Management" section (replace with one sentence pointing to `docs/handoffs/`).
- `PROJECT_PROGRESS.json`: add a Phase 4 deliverables list with one item noting chess.js's built-in `attackers()` API as the basis for the threat-analyzer
**Files to keep as-is:**
- `docs/research/*.md` (all six research docs)
- `docs/handoffs/HANDOFF_01.md`, `HANDOFF_02.md`, `HANDOFF_03.md` (historical record)
- `PROJECT_PROGRESS.json` (modified, not deleted)
**Pass:** No code references deleted files; README and CLAUDE.md are accurate.

### Bucket 6 — Playwright reduction
**File:** `playwright.config.ts`
**Work:** Reduce `projects` array to `chromium` only. Add a comment that the multi-browser matrix returns when we have real E2E flows in Phase 7 (polish).
**Pass:** `npm run test:e2e` runs (will be empty after Bucket 3, which is fine).

### Bucket 7 — Vitest alias removal
**File:** `vitest.config.ts`
**Work:** Delete the `resolve.alias` block. (No source uses these.)
**Pass:** `npm run test:run` passes; `npm run typecheck` passes.

### Bucket 8 — Coverage threshold rebaseline
**File:** `vitest.config.ts`
**Work:** Run `npm run test:coverage` against the cleaned-up suite. Set new thresholds at the floor of (current measurement, 80%). Probably stays at 80% but may need adjustment.
**Order:** Must happen *after* Buckets 1, 3, 4, 7 are merged.

### Bucket 9 — App.tsx component extraction (minimal)
**Files:**
- `src/App.tsx` — slimmed down to composition only
- `src/components/Controls/Header.tsx` — new (the title + button row)
- `src/components/Controls/index.ts` — re-created (exports `Header`)
- `src/components/Notation/MoveHistory.tsx` — new (the move list panel)
- `src/components/Notation/index.ts` — re-created (exports `MoveHistory`)
- `tests/integration/move-history.test.tsx` — new (one test for the row-pairing logic, since the white-black pairing reduce is the only thing in `MoveHistory` worth asserting)
**Note on YAGNI:** The status pill and "Game Info" block stay inline in `App.tsx` for now. Extracting them too would be speculative — we only know we want `Header` and `MoveHistory` because Phase 3 will add buttons to one and navigation to the other. Status panel extraction can wait until Phase 3 or Phase 5 actually puts pressure on it.
**Order:** Must happen *after* Bucket 2 (which deleted the empty index.ts files) and Bucket 1 (so we're extracting the v5-migrated form).
**Pass:** `npm run dev` shows visually identical UI; `npm run typecheck && npm run test:run` passes.

## 5. Parallel execution plan

### Conflict matrix
| Bucket pairs that touch the same file |
|---|
| 1 ↔ 3 (board tests) |
| 2 ↔ 9 (Controls/index.ts, Notation/index.ts) |
| 6 ↔ 3 (e2e/example.spec.ts) |
| 7 ↔ 8 (vitest.config.ts) |

### Strategy: Phased execution with isolated worktrees for the largest independent buckets

**Phase 1 — Three background agents in worktrees + main session running small isolated tasks, all kicked off in one message:**
- **Worktree A** (background agent): Bucket 1 (react-chessboard migration) — owns all board files including the board test files
- **Worktree B** (background agent): Bucket 4 (chess-rules.test.ts) — adds one new file, no conflicts
- **Worktree C** (background agent): Bucket 5 (process docs overhaul) — touches only `docs/`, `README.md`, `CLAUDE.md` (new), `PROJECT_PROGRESS.json`
- **Main session**: Bucket 2 (deletions) → Bucket 6 (playwright config) → Bucket 7 (vitest alias removal) → Bucket 3 (test scaffolding cleanup, *excluding* board tests which Worktree A owns)

**Phase 2 — Merge:** Pull in worktree branches, resolve any straggler conflicts, run `npm run typecheck && npm run test:run` as a sanity gate.

**Phase 3 — Sequential:**
- Bucket 9 (App.tsx extraction) — needs Phase 2 done so the deleted index.ts files exist as a clean slate
- Bucket 8 (coverage rebaseline) — needs Phases 1+2 done so coverage numbers are real

**Phase 4 — Final verification:**
- `npm run typecheck`
- `npm run lint`
- `npm run test:run`
- `npm run test:e2e` (chromium)
- `npm run build`
- Manual: `npm run dev`, click around, drag a piece, undo, new game, check colors swap

### Why this shape
- The three biggest, most-isolated chunks become parallel agents (~30/20/15 min each → wall-clock ≈ max ≈ 30 min instead of sum ≈ 65 min)
- The small cross-cutting tasks stay in main session where coordination is free
- Phase 3 is sequential because it depends on Phase 2 having merged

## 6. Tracking

- **TaskCreate** the 9 buckets up front; **TaskUpdate** to `in_progress` / `completed` as work flips
- One commit per bucket where practical (preserves bisectability); worktree merges produce one commit each
- After Phase 4 verification: one commit message summarizing the cleanup with bucket list
- `PROJECT_PROGRESS.json` updated once at the end (Phase 4 attackers note)

## 7. Verification gate (Definition of Done)

All of:
- `npm run typecheck` — passes
- `npm run lint` — passes
- `npm run test:run` — passes; total test count is lower than before but every remaining test asserts behavior
- `npm run test:coverage` — meets the rebaselined thresholds
- `npm run test:e2e` — passes (probably zero tests until Phase 3+ adds real ones; that's expected)
- `npm run build` — succeeds
- `npm run dev` — board renders, click-and-drag both work, undo/new-game work, color swap works, last-move and selected-square highlights look identical to before
- No imports reference deleted files
- README roadmap table reflects actual phase status
- CLAUDE.md exists at repo root; CLAUDE_PROJECT_GUIDELINES.md and per-session charter/progress JSON do not exist

## 8. Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| react-chessboard v5 has additional breaking changes beyond the documented prop renames | Medium | Worktree A's brief includes "if you hit a v5 issue not in the migration guide, stop and report; don't paper over it." Verify in browser before merging. |
| Worktree merge conflicts | Low | Conflict matrix maps the overlaps; main session avoids the files worktrees own |
| New chess-rules tests reveal a real bug in `ChessEngine` | Possible | Good — that's exactly what these tests are for. Fix the bug as part of Bucket 4 and note in commit. |
| Coverage threshold rebaseline reveals coverage dropped meaningfully | Possible | Investigate; either add behavior tests for the missed paths or accept the lower threshold with a note in CLAUDE.md |
| User wanted to keep something we're deleting | Low | This spec lists every deletion; user can flag in review |

## 9. Rollback

Each bucket is one or more commits. If something breaks at the verification gate, `git revert <commit>` of the offending bucket restores function. The worktree branches stay around until merged; we can re-run a bucket if needed.

## 10. After this is done

The next brainstorming session covers Phase 3 (game controls + PGN/FEN import-export + game navigation). With the codebase cleaned, the new `Controls/Header.tsx` and `Notation/MoveHistory.tsx` components from Bucket 9 give Phase 3 obvious extension points. The chess-rules test suite from Bucket 4 will catch regressions if Phase 3's import paths corrupt state.
