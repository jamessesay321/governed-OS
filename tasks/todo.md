# Phase 1 — Foundation: Task Tracker

## Completed

- [x] Project scaffolding (Next.js 15, TypeScript, Tailwind, shadcn/ui)
- [x] Supabase schema & RLS migration (`supabase/migrations/001_schema.sql`)
- [x] Authentication (login, signup, callback, middleware)
- [x] Organisation setup (create org + owner profile on signup)
- [x] Role-based access control (owner > admin > advisor > viewer)
- [x] Invitation flow (invite by email, accept by token)
- [x] Xero OAuth 2.0 integration (connect, callback, disconnect, status)
- [x] Xero data sync pipeline (chart of accounts, invoices, bank transactions)
- [x] Financial normalisation engine (raw → monthly aggregates)
- [x] Core actuals dashboard (P&L table, KPI cards, period selector)
- [x] Sync status indicator
- [x] Immutable audit logging (utility + viewer page)
- [x] Supabase Database types with full generic support
- [x] Zod validation on API routes
- [x] Unit tests (financial calculations, role checks)
- [x] Self-improvement loop (`/tasks/lessons.md`)

## In Progress

- [ ] Reconciliation function (`src/lib/financial/reconcile.ts`)

## Remaining

- [ ] Run Supabase migration against live database
- [ ] End-to-end manual testing (Xero connect → sync → dashboard reconciliation)
- [ ] RLS policy integration tests (cross-tenant read denial)
- [ ] Deploy to Vercel (staging)
- [ ] Security review (token encryption, CSRF, input validation)
