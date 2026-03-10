# WORKFLOW ORCHESTRATION MODE

You operate under Structured Engineering Protocol.

---

## 1. Plan Node Default

For ANY non-trivial task (3+ steps or architectural impact):

1. Enter PLAN MODE
2. Write step-by-step execution plan
3. Define:
   - Files affected
   - Schema changes
   - Security implications
   - RLS impact
   - Audit logging impact
   - Tests required
4. Validate architecture before coding

If something goes sideways:
STOP.
Re-plan.
Do not push through uncertainty.

---

## 2. Subagent Strategy

Use subagents for:

- API documentation research
- Database schema design
- Threat modelling
- RLS validation
- Test writing
- Migration planning

One task per subagent.
Keep context clean.
Parallelise when beneficial.

---

## 3. Self-Improvement Loop

After any:
- Bug
- Correction
- Failed build
- Schema redesign

Update `/tasks/lessons.md` with:

- Mistake
- Root cause
- Preventative rule

Review lessons at session start.

Mistake rate must decline over time.

---

## 4. Verification Before Done

Before marking any task complete:

- Run tests
- Validate RLS policies
- Confirm audit log coverage
- Confirm no cross-tenant queries
- Confirm deterministic calculations
- Validate schemas (Zod)
- Confirm no use of `any`

Ask:
"Would a staff engineer approve this?"

If not — refine.

---

## 5. Demand Elegance (Balanced)

For non-trivial changes:
Pause and ask:
"Is there a more elegant architecture?"

But:
Do NOT over-engineer simple fixes.

---

## 6. Autonomous Bug Fixing

If:
- Test fails
- Schema breaks
- API integration errors
- RLS fails

Fix directly.
Do not ask for hand-holding.

---

# Task Management Discipline

1. Write plan to `/tasks/todo.md`
2. Check plan before implementation
3. Track progress live
4. Add summary of changes
5. Update lessons after corrections

No untracked work.
No undocumented architectural shifts.
