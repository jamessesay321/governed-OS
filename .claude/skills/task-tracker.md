# Skill: Task Tracker & Feature Registry

## Purpose
Prevent features from being lost across session compactions, laptop shutdowns, or context window resets. Every agreed feature is captured in a persistent registry, verified against the codebase, and audited at session boundaries.

## Core Problem This Solves
Claude's context window compacts after long sessions. When it does, agreed-upon features (like "Semantic Intelligence Layer Phases B+C") can be silently dropped. The user then discovers weeks later that something they explicitly discussed and approved was never built. This skill ensures that NEVER happens again.

## The Registry
Location: `tasks/feature-registry.md`

Every feature discussed and agreed upon gets an entry with:
- **ID**: Sequential (F-001, F-002, etc.)
- **Feature**: Short name
- **Description**: What it does
- **Status**: `agreed` | `in-progress` | `built` | `verified` | `broken`
- **Date Agreed**: When user approved it
- **Date Built**: When code was committed
- **Verification**: How to confirm it works (file paths, build check, UI test)
- **Commit**: Git SHA when shipped
- **Notes**: Any caveats, dependencies, or follow-ups

## Mandatory Triggers

### 1. Session Start Audit (every session)
At the start of every session, after reading `tasks/todo.md` and `tasks/lessons.md`:
- Read `tasks/feature-registry.md`
- Count items by status: agreed (not built), in-progress, built (not verified), broken
- If ANY items are `agreed` but not `built` for more than 1 session, flag them prominently
- If ANY items are `broken`, flag as P0

### 2. Pre-Compaction Capture (before context runs low)
When context window is getting full (agent detects long session):
- Scan conversation for any new agreements not yet in the registry
- Add them before compaction happens
- Update status of any items worked on this session

### 3. Post-Build Verification (after every commit)
After committing code:
- Update registry entries for features touched in the commit
- Run verification checks (file exists, build passes, key exports present)
- Move status from `in-progress` to `built`

### 4. Periodic Deep Audit (every 5th session or on user request)
Full codebase scan:
- For each `built` or `verified` item, check that the key files still exist
- Check that imports are still valid (not dead code)
- Check that the feature's API endpoint returns 200 (if applicable)
- Move any broken items to `broken` status with notes

## How to Add a New Feature
When the user agrees to build something:
1. Immediately add it to `tasks/feature-registry.md` with status `agreed`
2. Include the verification criteria (what files/endpoints/UI elements confirm it works)
3. Reference it in `tasks/todo.md` if it's a current sprint item

## How to Verify a Feature
For each feature, the registry includes a verification section. Common checks:
- **File exists**: `glob` for the expected file path
- **Export exists**: `grep` for the key function/component export
- **Build passes**: `npm run build` succeeds
- **Endpoint responds**: The API route file exists and exports GET/POST
- **UI renders**: The page file exists at the expected route

## Integration with Existing Systems
- `tasks/todo.md` — Operational task list (what to do next). Registry is the AUDIT layer on top.
- `tasks/lessons.md` — Mistake log. Registry prevents the specific mistake of "forgetting agreed features."
- `CLAUDE.md` Session Start Checklist — Add registry audit as step 5.
- `.claude/skills/` — Each skill folder has its own scope. This skill tracks ALL features across all skills.

## Audit Output Format
```
=== FEATURE REGISTRY AUDIT ===
Total: XX features
  Agreed (not built): X  [LIST THEM - these are OVERDUE]
  In Progress: X
  Built (not verified): X
  Verified: X
  Broken: X  [LIST THEM - these are P0]

OVERDUE (agreed but not built):
  F-XXX: [name] — agreed [date], [X sessions ago]

BROKEN (was working, now isn't):
  F-XXX: [name] — [what broke]
===
```
