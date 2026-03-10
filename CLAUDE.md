# Governed OS for SME Advisory

## Governing Documents
Before writing any code, read and follow these governing documents:
- **[docs/MASTER_AGENT_RULES.md](docs/MASTER_AGENT_RULES.md)** — Core mission, non-negotiable principles, AI g is tuardrails, multi-tenancy enforcement, development philosophy, phase gates, and definition of success. This is the source of truth for WHAT we build and WHY.
- **[docs/WORKFLOW_ORCHESTRATION.md](docs/WORKFLOW_ORCHESTRATION.md)** — Structured engineering protocol for HOW we build. Plan-first workflow, subagent strategy, self-improvement loop, verification checklist, and task management discipline.

Every feature, fix, or refactor must satisfy both documents. If in doubt, ask: "Does this increase institutional trust?"

## Project Overview
Institutional-grade platform connecting SMEs, Fractional Executives, and Investors.
Turns messy financial data (Xero) into structured records, models, and dashboards.

## Tech Stack
- **Framework:** Next.js 15 (App Router, TypeScript)
- **Database:** Supabase (Postgres + Row-Level Security)
- **Auth:** Supabase Auth
- **UI:** shadcn/ui + Tailwind CSS v4
- **Integration:** Xero OAuth 2.0 (`xero-node`)
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

## Project Structure
```
src/
├── app/(auth)/          # Login, signup, callback
├── app/(dashboard)/     # Protected routes (dashboard, settings, audit)
├── app/api/xero/        # Xero OAuth + sync API routes
├── lib/supabase/        # Supabase client helpers
├── lib/xero/            # Xero API client wrapper
├── lib/financial/       # Deterministic calculation engine
├── lib/audit/           # Audit logging utilities
├── components/ui/       # shadcn components
├── components/dashboard/# Dashboard components
├── components/layout/   # Shell, sidebar, nav
└── types/               # Shared TypeScript types
```

## Conventions
- Use `server` Supabase client in Server Components and API routes
- Use `client` Supabase client in Client Components only
- Always check role before mutations: `requireRole(orgId, minRole)`
- Always log mutations: `logAudit({ ... })`
- Financial calculations go in `src/lib/financial/` with tests in `tests/financial/`
- Use Zod for all input validation

## Current Phase: Phase 1 (Foundation)
- Auth, Org setup, RBAC, Xero OAuth, Data ingestion, Dashboard, Audit logging
- No scenario engine, no investor portal, no AI intelligence layer

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
