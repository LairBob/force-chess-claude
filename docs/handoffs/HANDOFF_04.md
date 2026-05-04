# HANDOFF_04 — Phase 4: Threat Visualization Heatmap (Complete)

**Status**: Shipped 2026-05-04. Merged to `main` (commit `8af318d`). PR [#2](https://github.com/LairBob/force-chess-claude/pull/2) closed as merged.

## Read first

1. `PROJECT_PROGRESS.json` — Phase 4 deliverables marked completed; p4-d5 (numeric overlay) deferred.
2. `docs/superpowers/specs/2026-05-03-phase-4-threat-heatmap-design.md` — full design: algorithm, data model, visualization rules, decisions table, deferred items.
3. `docs/superpowers/plans/2026-05-03-phase-4-threat-heatmap.md` — task-by-task implementation plan (12 tasks).
4. `CLAUDE.md` — project conventions (TDD, behavior tests only, narrow commits, no emojis).

## What shipped

The paired-indicator threat-visualization heatmap, replacing the simple-tint scheme described in `docs/research/visualization.md` (the research doc remains as background reading; its `getSquareColor()` recipe is superseded by the spec).

For each square, the renderer paints stripes — top edge for black's pressure, bottom edge for white's. Stripe count equals the pseudo-legal attacker count from `chess.attackers()`. Saturation follows the **asym + matched-offset** rule: paired stripes desaturate to gray; only the surplus on the dominant side saturates, with magnitude `sqrt(surplus / 5)` clamped to [0, 1]. Squares with one side at zero AND the other above zero get a 3px inset red border (the "unilateral" marker — covers both hanging pieces and uncontested squares). Absolutely-pinned non-king pieces wear a subtle monotone SVG lock badge.

Architecture: three decoupled layers, communicating via plain data.

- `src/modules/threat-analyzer/` — pure `analyze(fen) → ThreatMap`. Uses `chess.attackers()` for counts and a remove-and-recheck trick (with king-already-in-check short-circuit guard) for absolute-pin detection.
- `src/hooks/useThreatMap.ts` — memoizing hook with module-level LRU (size 50, touch-on-read promotion). Test-only `__resetThreatMapCacheForTests` helper.
- `src/components/Heatmap/HeatmapSquare.tsx` — presentational renderer. No state, no effects, no chess.js coupling.

Wired into `App.tsx` with `heatmapEnabled` state (default ON), an `H` keyboard shortcut (via `useGameKeyboard`), and a sidebar toggle button. The board's `squareRenderer` prop forwards through a `useMemo`-wrapped adapter that bridges react-chessboard 5's `{piece, square, children} → JSX.Element` signature to our internal `{square} → ReactNode`.

## Test coverage

- 191 unit/integration tests (40 net new for Phase 4 across analyzer, hook, renderer, board pass-through, keyboard binding).
- 3 e2e tests (`tests/e2e/heatmap.spec.ts`): default-on stripes, `H` toggle round-trip, lock badge on pinned-knight FEN, unilateral border on hanging-pawn FEN.
- All green: `typecheck`, `lint`, `test:run`, `build`, `test:e2e`.

## Deferred (intentionally out of Phase 4)

Per spec §2:

- **Numeric overlay per square** (p4-d5) — paired indicators carry the count, so a numeric label would be redundant. Revisit if accessibility feedback requests it.
- **King-into-defended-square inertness** — current "inert" definition is absolute-pin-against-king only. Extending to kings whose adjacent enemies are all defended is rare, expensive, and low-value vs. the pin case.
- **Indicator visual refinement** — stripes are deliberately rudimentary; a follow-up pass should evaluate bars / pips / other marks at real board sizes.
- **Colorblind-safe palette** — current red/green family is the v1 default; a configurable accessibility theme is a Phase 5+ candidate.

From code review (non-blocking, future cleanup):

- Document the `__` test-only export prefix convention in `CLAUDE.md`. Only one use today (`__resetThreatMapCacheForTests`); will compound if reused without an explicit convention.

## Operational notes

Universal (any host):

- Remote branch `origin/phase-4-threat-heatmap` may persist after merge depending on your GitHub repo settings. Delete with `git push origin --delete phase-4-threat-heatmap` if desired.
- `PROJECT_PROGRESS.json`'s `currentPhase` is still `"phase-3"` because Phase 3's p3-d5 (timer) was deferred-not-shipped. Reconcile when you start Phase 5 or revisit the timer.

Local to the original Windows host this phase was developed on (irrelevant on a fresh clone):

- Orphan worktree directory at `.worktrees/phase-4-threat-heatmap/` — git's worktree registry no longer references it, but a leftover node process holds files. Will release on shell restart; then `Remove-Item -Recurse -Force .worktrees\phase-4-threat-heatmap`. Fresh clones on other hosts will not have this directory.

## What's next

Phase 5 (Enhanced Visualization Modes) is unstarted — no spec, no plan, no scope. Possible directions per the spec's deferred list: indicator-style refinement, "what if" hover preview, attack vectors, SEE-style scoring, colorblind-safe palette toggle, accessibility numeric overlay.

## Workflow used

This phase used the superpowers skills end-to-end: `brainstorming` → `writing-plans` → `subagent-driven-development` → `finishing-a-development-branch`. The visual-companion mockups generated during brainstorming are preserved at `.superpowers/brainstorm/2079-1777829602/content/` (gitignored). `.gitignore` now excludes `.worktrees/` and `.superpowers/`.

## Quick start commands

```bash
cd <path-to-force-chess-claude>
npm install          # if needed
npm run test:run     # 191 tests pass
npm run dev          # localhost:5173 (or next port)
```

In the dev server, the heatmap is on by default. Press `H` to toggle, or use the sidebar "Heatmap" button.

Two FENs useful for visual verification (paste via the Load… dialog):
- `4k3/8/8/4r3/8/4N3/8/4K3 w - - 0 1` — pinned white knight on e3, lock badge expected.
- `4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1` — hanging black pawn on d5, red border expected.

## Fresh-host setup (cold start)

If you're picking this work up on a new machine (Linux VM, fresh container, etc.), the steps below should get you to a green test suite from a clean checkout. Tested mental model: an Ubuntu/Debian VM with a regular user account.

```bash
# 1. System dependencies (skip what's already installed)
#    Node.js 20.x LTS or newer (Vite 7 + React 19 require modern Node)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# 2. GitHub CLI (optional, for managing PRs from the VM)
sudo apt-get install -y gh
gh auth login

# 3. Clone the repo
git clone https://github.com/LairBob/force-chess-claude.git
cd force-chess-claude

# 4. Configure git identity (one-time)
git config user.name "Laurent Stanevich"
git config user.email "laurent@stanevich.com"

# 5. Install npm dependencies
npm install

# 6. Install Playwright browsers (required for `npm run test:e2e`)
npx playwright install --with-deps chromium

# 7. Verify clean baseline
npm run typecheck
npm run lint
npm run test:run     # expect 191 passing
npm run build
npm run test:e2e     # expect 4 passing (1 import-and-navigate + 3 heatmap)

# 8. Run the dev server (only if you want to interactively poke the UI)
npm run dev          # http://localhost:5173 — forward the port if on a remote VM
```

Notes for remote-VM development:
- Forward port 5173 (or whatever Vite picks) over SSH to view the dev server in a local browser: `ssh -L 5173:localhost:5173 user@vm.example.com`.
- If running Claude Code on the VM, the auto-memory entries written on the original host (under `~/.claude/projects/.../memory/`) do NOT transfer — they're per-machine. The new instance will start with empty AI working memory and rebuild it over time. Project state (this handoff doc, the spec, the plan, `PROJECT_PROGRESS.json`, CLAUDE.md, git history) is what travels with the repo.
- Visual-companion brainstorm artifacts at `.superpowers/brainstorm/` are gitignored and won't be on the fresh clone. They were design-time scratchpad; the spec captures everything that matters from them.
