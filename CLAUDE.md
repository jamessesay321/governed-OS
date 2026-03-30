# Advisory OS (formerly Governed OS) for SME Advisory

## Governing Documents
Before writing any code, read and follow these governing documents:
- **[docs/MASTER_AGENT_RULES.md](docs/MASTER_AGENT_RULES.md)** — Core mission, non-negotiable principles, AI guardrails, multi-tenancy enforcement, development philosophy, phase gates, and definition of success. This is the source of truth for WHAT we build and WHY.
- **[docs/WORKFLOW_ORCHESTRATION.md](docs/WORKFLOW_ORCHESTRATION.md)** — Structured engineering protocol for HOW we build. Plan-first workflow, subagent strategy, self-improvement loop, verification checklist, and task management discipline.
- **[docs/FPA_COMPETITIVE_AUDIT.md](docs/FPA_COMPETITIVE_AUDIT.md)** — Deep feature-by-feature analysis of 10 FP&A competitors (DataRails, Fathom, Syft, Jirav, Runway, Mosaic, Puzzle, Planful, Vena, Cube) plus Kevin Steel's Inflectiv Intelligence. Reference before building any sprint.
- **[docs/BUILD_VS_BUY_ANALYSIS.md](docs/BUILD_VS_BUY_ANALYSIS.md)** — Build vs buy decisions for 11 platform areas (integrations, PDF, email, payments, search, charts, storage, real-time, jobs, monitoring, AI). Phased recommendations with cost analysis. Check BEFORE adding any new vendor or building infrastructure.
- **[docs/STRATEGIC_MILESTONES.md](docs/STRATEGIC_MILESTONES.md)** — Phase triggers and milestone conditions. Check at every sprint to see if any trigger has fired. When a trigger fires, read the corresponding BUILD_VS_BUY section and plan the change.
- **[docs/FPA_INTEGRATION_LANDSCAPE.md](docs/FPA_INTEGRATION_LANDSCAPE.md)** — How all 10 competitors handle integrations, unified API provider comparison, and Grove's integration architecture roadmap.

Every feature, fix, or refactor must satisfy both documents. If in doubt, ask: "Does this increase institutional trust?"

### Build vs Buy Gate (MANDATORY)
Before building ANY infrastructure feature (email sending, PDF generation, payment processing, search, background jobs, etc.), check `docs/BUILD_VS_BUY_ANALYSIS.md` first. If a third-party service is recommended for the current phase, use it instead of building custom. Do not re-invent what a $15/mo service does better.

---

## Skills & Lessons Capture (MANDATORY)

After building or modifying any significant feature in Grove, check `~/research-analyst/` for a matching skill folder.
- If one exists, update `skill.md` or add a `lesson-{client}.md` file
- If none exists, create a new skill folder
- Always update `~/research-analyst/index.md` when adding new skills
- Skill folders live at `~/research-analyst/{skill-name}/` with `skill.md`, `lesson-{client}.md`, and `agent-config.md` inside

---

## Session Start Checklist

At the start of every session:
1. Read `/tasks/lessons.md` — do not repeat past mistakes
2. Read `/tasks/todo.md` — understand what's in progress and remaining
3. Run `python3 ~/.claude/skills/hash-verifier/scripts/verify_hashes.py` to check skill integrity
4. Ask: "What is the user's goal this session?" before writing code

---

## Pre-Implementation Gate (MANDATORY)

For ANY task that touches 3+ files OR adds a new API endpoint OR changes database schema:

1. **Enter PLAN MODE** before writing any code
2. Write a plan defining:
   - Files affected (list every file)
   - Schema changes (if any)
   - Security implications (SSRF, injection, auth bypass, RLS)
   - Audit logging requirements
   - Tests required
3. **Get user approval** before proceeding
4. Update `/tasks/todo.md` with the plan

Skipping this gate is a framework violation. If you catch yourself coding without a plan for a non-trivial task, STOP and plan first.

---

## Dependency Verification Gate (MANDATORY)

After ANY change that touches data sources, formatting, shared libraries, or API routes:

1. **Run `/verify`** (dependency-verifier skill) to cross-check all downstream pages
2. Identify every page that depends on the changed data/component
3. Verify each page shows correct data (not mock/stale), correct currency, correct status
4. Fix all FAIL items before committing
5. Log WARN items and fix in same session if possible

**Trigger conditions:**
- Xero/QBO connection or sync changes
- Currency or locale changes
- Schema migrations
- Changes to `/lib/financial/`, `/lib/kpi/`, or shared formatting
- Changes to any server component that passes props to client components

Never assume a downstream page "just works" — verify it. The cost of checking is minutes; the cost of shipping broken pages is user trust.

---

## Verification Gate (Before Marking Any Task Complete)

Before any task is marked done:
- [ ] Build passes (`npm run build`)
- [ ] Every page has a working back button AND a way to reach the home/dashboard page
- [ ] Never ask the user for information already collected. Always pre-populate forms from existing data (org name, website, interview, scan results)
- [ ] No `as any` in new/modified code
- [ ] Zod validation on all API inputs
- [ ] RLS policies cover any new tables/columns
- [ ] Audit logging on all mutations
- [ ] No server-side fetch of user-provided URLs without SSRF check
- [ ] Tests written for new logic (especially financial calculations)
- [ ] No cross-tenant data access possible

Ask: "Would a staff engineer approve this?" If not — refine.

---

## Post-Error Protocol

After any bug, failed build, or correction:
1. Fix the issue
2. Add a lesson to `/tasks/lessons.md` with: mistake, root cause, preventative rule
3. Update `/tasks/todo.md` if the task list has changed

Mistake rate must decline over time.

---

## Project Overview
Institutional-grade platform connecting SMEs, Fractional Executives, and Investors.
Turns messy financial data (Xero) into structured records, models, and dashboards.

---

## CRITICAL ARCHITECTURE: Claude API as Intelligence Engine

Advisory OS does NOT build custom analysis, narrative generation, or financial reasoning logic. All intelligence comes from Claude API calls. Advisory OS builds three things:
1. **Governed Data Infrastructure** — Xero OAuth pipeline, data model, audit trails, RLS, encryption
2. **UI Shell** — Dashboard layout, navigation, role-based views, component rendering
3. **Governance & Workflow Layer** — Audit trails, version history, approval gates, role-scoped visibility, immutable logs

### Model Strategy
- Pin model version for governance-sensitive outputs (audit trail entries, compliance)
- Float to latest for intelligence outputs (narratives, scenarios, commentary)
- Use `claude-sonnet-4-6` as default for speed/cost balance
- Use `claude-opus-4-6` for complex scenario analysis and board pack generation
- Always pass `max_tokens: 4096` for analysis, `max_tokens: 8192` for board packs

### Prompt Design Principles
- Data-forward: Pass Xero data and question, let Claude reason (don't hardcode financial formulas in prompts)
- Always include business context from onboarding profile
- Always request reasoning chain (collapsed by default, expandable in UI)
- Always request confidence level
- UK-specific: "This is a UK-based business. Use GBP. Reference UK tax rules (Corporation Tax, VAT, PAYE, Employer NI, Employer Pension)."

---

## Cross-Cutting UX Principles (All Sprints)

1. **Narrative first, numbers second** — every screen leads with Claude API-generated text summary, not a data grid
2. **Everything clickable, everything traceable** — no number without a drill path to source Xero transactions
3. **AI reasoning always available** — collapsed by default, expandable on click, platform-wide
4. **Plain English everywhere** — use the user's language from onboarding, Claude API handles translation
5. **Governance visible but not intrusive** — data freshness ("Synced 2 hours ago"), audit trail on every screen
6. **Confirmation before mutation** — any action that changes data requires explicit confirmation
7. **Real data or nothing** — never present estimated figures without clearly labelling as assumptions
8. **Variance colour coding** — Green = favourable, Amber = watch, Red = unfavourable (auto-determined by metric type)

---

## Sprint Roadmap

| Sprint | Focus | Status |
|--------|-------|--------|
| 1 | Foundation (Auth, Xero, Dashboard, Onboarding) | COMPLETE |
| 2 | Xero Integration with Governed Data Pipeline | COMPLETE |
| 3 | KPI Engine with Variance Analysis | COMPLETE |
| 4 | AI Onboarding Interview Enhancement | COMPLETE |
| 5 | NL Scenario Engine (what-if + goalseek) | COMPLETE |
| 6 | Modules and Playbook Maturity Scoring | COMPLETE |
| 7 | Macro-to-Micro Intelligence Layer (anomaly detection, AI explainers) | COMPLETE |
| 8 | Board Pack PDF Generation (7 themes, white-label) | COMPLETE |
| 9 | Knowledge Vault Foundations | COMPLETE |
| — | Security hardening (audit logging, error sanitisation, rate limiting, Zod coverage) | COMPLETE |

Full sprint specifications are in the CLAUDE_MD_ADDITIONS document at `/Users/james/Downloads/CLAUDE_MD_ADDITIONS_FINAL.md`.
Reference `/docs/FPA_COMPETITIVE_AUDIT.md` for competitive context before each sprint.

## Tech Stack
- **Framework:** Next.js 15 (App Router, TypeScript)
- **Database:** Supabase (Postgres + Row-Level Security)
- **Auth:** Supabase Auth
- **UI:** shadcn/ui + Tailwind CSS v4
- **Integration:** Xero OAuth 2.0 (`xero-node`)
- **AI:** Anthropic Claude API (intelligence engine — narratives, KPIs, scenarios, board packs, interview)
- **Testing:** Vitest
- **Deployment:** Vercel

## Non-Negotiable Rules
1. **Every table must have `org_id`** (except `organisations` and `profiles` which link via FK)
2. **RLS enforced at DB level** — never rely on app-level checks alone
3. **All financial math is deterministic** — pure TypeScript functions, no AI
4. **AI never writes to the database** — proposes JSON only
5. **Audit logs are immutable** — no UPDATE/DELETE policies
6. **No cross-tenant data leakage** — enforced by Supabase RLS
7. **No silent mutations** — everything logged to `audit_logs`
8. **No `as any`** — use proper types or `as Record<string, unknown>` with a TODO
9. **Zod validation on every API endpoint** — never trust client input
10. **SSRF protection on any server-side URL fetch** — block private IPs, metadata endpoints, non-HTTP protocols

## Project Structure
```
src/
├── app/(auth)/          # Login, signup, callback
├── app/(dashboard)/     # Protected routes (dashboard, settings, audit)
├── app/(onboarding)/    # Guided onboarding flow (welcome, interview, connect, complete)
├── app/api/xero/        # Xero OAuth + sync API routes
├── app/api/interview/   # AI interview engine
├── app/api/onboarding/  # Onboarding endpoints (scan, complete, skip)
├── app/api/kpi/         # KPI engine endpoints
├── app/api/narrative/   # Claude API narrative generation
├── lib/supabase/        # Supabase client helpers
├── lib/xero/            # Xero API client wrapper
├── lib/financial/       # Deterministic calculation engine
├── lib/interview/       # Interview engine + prompts
├── lib/audit/           # Audit logging utilities
├── lib/claude/          # Claude API client wrapper (prompts, model config)
├── components/ui/       # shadcn components
├── components/dashboard/# Dashboard components
├── components/onboarding/ # Onboarding flow components
├── components/layout/   # Shell, sidebar, nav
└── types/               # Shared TypeScript types
tasks/
├── todo.md              # Live task tracker — update during every session
└── lessons.md           # Mistake log — update after every error
```

## Conventions
- Use `server` Supabase client in Server Components and API routes
- Use `client` Supabase client in Client Components only
- Always check role before mutations: `requireRole(orgId, minRole)`
- Always log mutations: `logAudit({ ... })`
- Financial calculations go in `src/lib/financial/` with tests in `tests/financial/`
- Use Zod for all input validation
- Use `isUrlSafe()` for any server-side URL fetch (see `src/app/api/onboarding/scan/route.ts`)

## Scenario Chat Builder Rules
- The existing "Create New Scenario" form remains a supported flow; do not remove or degrade it.
- LLM is proposal-only: no assumptions are persisted without explicit user confirmation.
- Interpret and confirm must be separate endpoints.
- All LLM outputs must be parsed into a strict JSON schema; reject non-conforming output.
- If confidence < 0.7: request clarification; do not propose changes for confirmation.
- Max 5 assumption changes per user request.
- Every proposed/applied change must be inserted into scenario_change_log; never update existing log rows.
- Base period selection is binding context for Xero grounding and default effective dates.

### Frontend: Chat-based Scenario Builder
- Add ScenarioChatBuilder to Create Scenario page.
- Add interpret -> preview -> confirm loop.
- Preserve current form flow.

### API: Proposal + Confirmation workflow
- Implement POST /api/scenarios/:id/interpret returning a confirmation_token
- Implement POST /api/scenarios/:id/confirm applying changes and triggering recalculation
