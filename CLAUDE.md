# Force Chess

Browser-based chess application with a threat-visualization heatmap as the headline differentiator. Focus is educational and analytical: real-time visual feedback on board control, threat assessment, and positional strength for every square.

## Tech Stack

- React 19, TypeScript 5.9 strict, Vite 7
- Vitest 4 + Testing Library + Playwright (chromium-only currently)
- Tailwind 4
- chess.js 1.4 (uses `.attackers()` for the threat analyzer in Phase 4)
- react-chessboard 5.10 (use `squareRenderer` for Phase 4 overlay)

## Where things live

- `src/modules/chess-engine/` — chess.js wrapper class (`ChessEngine`)
- `src/hooks/useChessGame.ts` — single source of truth for game state
- `src/components/Board/` — board wrapper around react-chessboard
- `src/components/Layout/` — app shell
- `src/components/Controls/`, `Notation/` — Phase 3 surfaces (Header, MoveHistory)
- `tests/unit/`, `tests/integration/`, `tests/e2e/` — vitest + playwright
- `docs/research/*.md` — algorithm specs (especially `visualization.md`)
- `docs/handoffs/HANDOFF_NN.md` — phase-boundary notes (kept light)
- `PROJECT_PROGRESS.json` — single source of truth for phase status

## Current phase

Phase 3 in progress: PGN/FEN import/export and game navigation. Phase 4 is the threat-viz heatmap.

## Coding conventions

- TDD: write the failing test, then the code, then commit
- Prefer Edit over Write for existing files
- No scaffolding tests (don't assert constants equal themselves; don't assert CSS class names; don't write tests that mainly verify a component renders)
- Behavior tests only — if removing a test wouldn't reduce confidence in a real failure mode, don't write it
- Narrow commits, one logical change per commit
- No emojis in code or commit messages unless explicitly requested

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
