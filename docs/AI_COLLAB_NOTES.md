# AI Collaboration Notes

Durable conventions for AI agents working in this repository. These supplement `CLAUDE.md`'s coding conventions; they're distilled from prior phases (most recently Phase 4) and exist here so they travel with the repo across hosts and sessions.

## Calibrate review depth by task complexity

For `superpowers:subagent-driven-development` plan execution, the skill's strict flow dispatches three subagents per task: implementer, spec-compliance reviewer, then code-quality reviewer. For long plans (12+ tasks) that's 36+ dispatches, which exhausts the controller's context budget without commensurate quality gain on mechanical tasks. Per-task discipline matters; multi-stage ritual does not.

Apply review depth proportional to risk:

- **Combined review** (single subagent doing spec + quality with the prompt clearly partitioned) — for verbatim-from-plan, mechanical tasks touching 1–2 files with a clear contract.
- **Strict two-stage** (separate spec reviewer THEN code-quality reviewer if spec passes) — for tasks involving library-API verification, novel algorithms, multi-file integration, or security/correctness sensitivity.
- **Inline diff inspection by the controller** (no review subagent) — for very small commits like JSON-only edits or comment-only changes.

In all cases, `npm run typecheck`, `npm run lint`, `npm run test:run`, and `npm run build` are non-negotiable gates regardless of review mode. When deviating from the skill's strict flow, surface the deviation in the user-facing message so the user can override.

## Pushing to `main` is a separate gate from merging

When the user authorizes a merge-to-main workflow via `superpowers:finishing-a-development-branch` (e.g., chooses options "1 and 2" — local merge plus remote feature branch push plus PR), perform the local merge and the remote-feature-branch operations, but STOP before pushing the merged `main` to origin. Surface the post-merge state explicitly: the merge commit SHA, the diff summary, the PR URL, and the fact that `origin/main` is now one commit behind. Then wait for explicit confirmation before `git push origin main`.

This generalizes to any origin-modifying action that affects shared state visible to other contributors or CI: force pushes, branch deletions on origin, tag pushes, releases. Local merges and feature-branch pushes are routine authorized operations; main-branch pushes are not.

The reasoning: auto-mode rules require explicit user confirmation for actions that "modify shared or production systems," and `main` is the production branch.

## Visual Companion — offer early, then poll `state/events`

When `superpowers:brainstorming` enters territory with visual decisions (UI mockups, color choices, layouts, side-by-side comparisons), offer the Visual Companion in its own dedicated message early in the brainstorm. The offer message MUST contain only the offer text — no clarifying questions, no other content — per the skill's flow.

Once accepted, decide PER QUESTION whether to use browser or terminal. Visual decisions go to the browser; conceptual decisions stay in terminal. A question *about* a visual topic is not automatically a visual question.

After pushing any interactive screen with `data-choice` / `onclick="toggleSelect(this)"` options, on the NEXT turn ALWAYS read `$STATE_DIR/events` before prompting the user again. Browser clicks are recorded there as JSON lines; the user may have indicated their selection by clicking and won't expect to repeat it in terminal text. The last `choice` event is typically the final selection. Failing to poll wastes both the user's attention and the controller's context budget on a confirmation round-trip that didn't need to happen.

When the next question is conceptual and the browser would be stale, push a `waiting.html` screen so the user doesn't see resolved-but-still-displayed interactive content. Companion mockup files persist in `.superpowers/brainstorm/<session>/content/` when the server is launched with `--project-dir`, which is useful when documenting design rationale post-hoc.

## Hand-verify chess test positions

(This convention also lives in `CLAUDE.md` because it's specific to the codebase, but it's worth restating in this doc since it's the kind of error pattern that recurs.)

When constructing chess test positions for plans, specs, or test code, verify the position's geometry against `chess.js`'s actual output rather than relying on mental ray-tracing. Pin lines through occupied squares, pawn diagonal-attack semantics, and "blocked vs unblocked" slider rays are the most common silent-error sources. A one-line shell check is faster than a debugging cycle:

```
node -e "const {Chess} = require('chess.js'); const c = new Chess('<fen>'); console.log({ wA: c.attackers('<sq>', 'w'), bA: c.attackers('<sq>', 'b') })"
```

If the spec or plan requires a specific tactical motif (absolute pin, fork, discovered check), construct the position incrementally: place the pieces in the verifier first, confirm `chess.js` agrees with the intended geometry, then transcribe the resulting FEN into the document. Don't claim a pin or a defended-square count without that verification step.
