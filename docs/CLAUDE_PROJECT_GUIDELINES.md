# Claude Project Guidelines

## Token Management Protocol

### Automatic Pause Trigger
Each Claude Code instance working on this project MUST:

1. **Monitor token consumption** throughout the session
2. **Initiate automatic pause** at approximately **75% token consumption**
3. **Never exceed 85%** without completing handoff documentation

### Pause Procedure
When approaching 75% token limit:

1. **Stop new feature work immediately**
2. **Complete any in-progress file edits** (no partial changes)
3. **Update all tracking documents**:
   - `docs/sessions/session-NN/progress.json` - Mark current status
   - `docs/sessions/SESSION_INDEX.json` - Update session status
   - `PROJECT_PROGRESS.json` - Update phase/deliverable status
4. **Generate handoff document**:
   - Create `docs/handoffs/HANDOFF_NN.md` using template
   - Include ALL context needed for next instance
5. **Commit all changes** with clear commit message
6. **Notify user** that pause is occurring

### Handoff Document Requirements
Every handoff MUST include:

1. **Session Summary**
   - Session ID, phase, date, status
   - Duration and work completed

2. **Progress Achieved**
   - Checklist of completed items
   - Any incomplete items with reason

3. **Current State**
   - Files modified (with descriptions)
   - Git branch and commit status
   - Any running services

4. **Context for Next Session**
   - Immediate next steps (prioritized list)
   - Key decisions made with rationale
   - Open questions needing resolution
   - Known issues and workarounds

5. **Commands to Resume**
   - Setup commands needed
   - How to verify state

6. **Test Status**
   - Which tests pass/fail
   - Any skipped tests

## Session Lifecycle

```
START SESSION
     │
     ▼
┌─────────────────┐
│ Read HANDOFF_NN │ ◄── Most recent handoff
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create session  │
│ charter.json    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    WORKING      │◄──┐
│  (update todos) │   │
└────────┬────────┘   │
         │            │
    ┌────┴────┐       │
    │ <75%?   │───Yes─┘
    └────┬────┘
         │ No
         ▼
┌─────────────────┐
│ PAUSE PROTOCOL  │
│ (see above)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate        │
│ HANDOFF_NN.md   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Commit & notify │
└─────────────────┘
```

## Context Restoration

When starting a new session:

1. **Read the most recent handoff**: `docs/handoffs/HANDOFF_NN.md`
2. **Read project progress**: `PROJECT_PROGRESS.json`
3. **Read session index**: `docs/sessions/SESSION_INDEX.json`
4. **Read relevant research docs** based on current phase
5. **Create new session folder** and charter
6. **Verify project state** (run tests, check git status)

## File Naming Conventions

- Handoffs: `HANDOFF_01.md`, `HANDOFF_02.md`, etc.
- Sessions: `session-01/`, `session-02/`, etc.
- Use zero-padded numbers for sorting

## Commit Message Format

```
[Phase N]: Brief description

- Bullet point details
- What was accomplished

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Test-Driven Development

- Write tests BEFORE implementation
- Maintain 80% coverage minimum
- Run tests after each significant change
- Never commit with failing tests (unless documented)

## Important Reminders

1. **Read before write**: Always read files before editing
2. **Small commits**: Commit frequently with clear messages
3. **Update tracking**: Keep progress.json current in real-time
4. **No assumptions**: Ask user for clarification when uncertain
5. **Token awareness**: Monitor consumption, pause proactively
