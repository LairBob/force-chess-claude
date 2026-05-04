# Force Chess

Browser-based chess application with a threat-visualization heatmap as the headline differentiator. Focus is educational and analytical: real-time visual feedback on board control, threat assessment, and positional strength for every square.

## Tech Stack

- React 19, TypeScript 5.9 strict, Vite 7
- Vitest 4 + Testing Library + Playwright (chromium-only currently)
- Tailwind 4
- chess.js 1.4 (`.attackers()` and `.findPiece()` are used by the threat analyzer)
- react-chessboard 5.10 (`squareRenderer` option drives the heatmap overlay; signature is `({piece, square, children}) => JSX.Element`, adapted in `ChessBoard.tsx`)

## Where things live

- `src/modules/chess-engine/` — chess.js wrapper class (`ChessEngine`)
- `src/hooks/useChessGame.ts` — single source of truth for game state
- `src/components/Board/` — board wrapper around react-chessboard
- `src/components/Layout/` — app shell
- `src/components/Controls/`, `Notation/` — Phase 3 surfaces (Header, MoveHistory)
- `src/modules/threat-analyzer/` — Phase 4 pure analyzer (FEN → ThreatMap)
- `src/components/Heatmap/` — Phase 4 presentational renderer (`HeatmapSquare`)
- `src/hooks/useThreatMap.ts` — Phase 4 memoizing hook (module-level LRU)
- `tests/unit/`, `tests/integration/`, `tests/e2e/` — vitest + playwright
- `docs/research/*.md` — background algorithm research; `visualization.md`'s color-mapping recipe is superseded by the Phase 4 spec
- `docs/superpowers/specs/*.md` — approved feature designs (Phase 4 onward)
- `docs/superpowers/plans/*.md` — implementation plans for those designs
- `docs/handoffs/HANDOFF_NN.md` — phase-boundary notes (kept light)
- `docs/AI_COLLAB_NOTES.md` — durable AI-collaboration conventions distilled from prior phases
- `PROJECT_PROGRESS.json` — single source of truth for phase status

## Current phase

Phase 4 (threat-visualization heatmap) is shipped on `main`. Phase 5 (Enhanced Visualization Modes) is unstarted — no spec, no plan. Phase 3's `p3-d5` (chess clock/timer) remains deferred and is the reason `PROJECT_PROGRESS.json`'s `currentPhase` still reads `"phase-3"`.

## Coding conventions

- TDD: write the failing test, then the code, then commit
- Prefer Edit over Write for existing files
- No scaffolding tests (don't assert constants equal themselves; don't assert CSS class names; don't write tests that mainly verify a component renders)
- Behavior tests only — if removing a test wouldn't reduce confidence in a real failure mode, don't write it
- Narrow commits, one logical change per commit
- No emojis in code or commit messages unless explicitly requested
- Test-only exports use the `__` prefix (e.g., `__resetThreatMapCacheForTests`) and must NOT appear in barrel `index.ts` files
- Chess test positions: verify FENs against `chess.js` output (`new Chess(fen).attackers(...)`, etc.) before asserting expected counts. Mental ray-tracing produces silent off-by-one errors, especially on pawn diagonals and pin lines that pass through occupied squares

## Verification

Before claiming work complete, run:

- `npm run typecheck`
- `npm run lint`
- `npm run test:run`
- `npm run build`

For UI changes also: `npm run dev`, then exercise the change in a browser (use Playwright MCP if no human is available).

## What's NOT load-bearing

- There is no "75% token pause protocol." Pause at natural seams (phase boundary, end of session, blocking question).
- There are no per-session `charter.json` or `progress.json` files. Use git log + `PROJECT_PROGRESS.json` + handoff docs.
- Do not recreate the `docs/sessions/` directory.
