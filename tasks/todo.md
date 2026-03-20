# Advisory OS — Task Tracker

## Sprint 1: Foundation — COMPLETE

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
- [x] Onboarding flow (welcome, website scan, interview, Xero connect, completion)
- [x] Website scanning with Claude AI (business intelligence extraction)
- [x] Org-scoped onboarding flag (`has_completed_onboarding`)
- [x] Supabase migration: onboarding columns on organisations table
- [x] Xero env vars added to Vercel
- [x] Deployed to Vercel (staging)
- [x] Security: SSRF protection, Zod validation, HTTP headers, Skills defense suite, no `as any`
- [x] Framework: Updated lessons.md, strengthened CLAUDE.md with enforcement gates

## Technical Debt (Carry-forward)

- [ ] End-to-end manual testing (Xero connect → sync → dashboard reconciliation)
- [ ] RLS policy integration tests (cross-tenant read denial)
- [ ] Write tests for onboarding flow
- [ ] Audit RLS policies on new onboarding columns
- [ ] Re-enable email confirmation for production
- [ ] Regenerate Supabase TypeScript types after migration
- [ ] Reconciliation function (`src/lib/financial/reconcile.ts`)

## Sprint 2: Xero Integration with Governed Data Pipeline — IN PROGRESS

- [ ] Database: Create governed data model tables (xero_raw, xero_mapped, mapping_rules)
- [ ] Auto-mapping: Claude API maps Xero chart of accounts to standard KPI framework
- [ ] Pull: Trial Balance, P&L, Balance Sheet, Aged AR/AP, Bank Transactions
- [ ] Sync: Daily auto-sync + manual refresh, raw + normalised storage
- [ ] UK Tax Engine: Corporation Tax, VAT settings, PAYE/NI/Pension rate fields
- [ ] HMRC Payment Plans: VAT, Corp Tax, PAYE payment plan support
- [ ] 13-Week Cash Flow: Direct + indirect method views
- [ ] Data freshness indicator on all data screens
- [ ] RLS policies on all new tables
- [ ] Audit logging on all sync operations

## Sprint 3: KPI Engine with Variance Analysis — PLANNED

- [ ] Pre-built KPI library (30+ KPIs: profitability, liquidity, growth, efficiency)
- [ ] Custom KPI support (plain English formula → Claude API calculation)
- [ ] KPI configuration (cadence, targets, alert thresholds)
- [ ] Narrative-first dashboard (Claude API-generated text summary with inline numbers)
- [ ] One-click drill-down (KPI → category → Xero transactions)
- [ ] Variance analysis panel (slide-in, compare to: month/quarter/year/budget/target)
- [ ] Dashboard widget system (KPI cards with sparklines, waterfall charts, financial tables)
- [ ] Variance colour coding (green/amber/red, auto-determined by metric type)

## Sprint 4: AI Onboarding Interview Enhancement — PLANNED

- [ ] Enhance interview with Xero data context (P&L, Balance Sheet in prompts)
- [ ] Auto-suggest KPI configuration from interview outputs
- [ ] Auto-suggest dashboard layout from business profile
- [ ] Voice option via Vapi.ai (chat as default)

## Sprint 5: NL Scenario Engine — PLANNED

- [ ] Single text box NL interface ("What happens if...")
- [ ] Three-statement impact analysis (P&L, BS, CF)
- [ ] Goalseek mode ("What do I need to...")
- [ ] Scenario save/compare (up to 3 side-by-side)
- [ ] Smart context resolution (auto-identify clients, teams from Xero data)

## Sprint 6: Modules and Playbook Maturity Scoring — PLANNED

- [ ] Operational maturity visualisation (radar chart, scoring)
- [ ] Module system (cash-forecast, workforce-planning, unit-economics, etc.)
- [ ] Playbook actions linked to maturity gaps

## Sprint 7: Macro-to-Micro Intelligence Layer — PLANNED

- [ ] Personalised monetary impact statements
- [ ] Automated insights (weekly/monthly/quarterly digests)
- [ ] Proactive anomaly detection on each Xero sync
- [ ] Financial explainer library (contextualised to user's actual data)

## Sprint 8: Board Pack PDF Generation — PLANNED

- [ ] Claude API content generation (exec summary, P&L, KPIs, recommendations)
- [ ] Board pack builder UI (section selection, reorder, commentary)
- [ ] Interactive HTML export (dark mode, collapsible, tooltips)
- [ ] PDF export (block-by-block rendering, governance metadata)
- [ ] Theme presets (7 themes, white-label ready)
- [ ] Version history (immutable, diff tracking)

## Sprint 9: Knowledge Vault Foundations — PLANNED

- [ ] Document storage with full provenance chain
- [ ] Immutable versioning (cell-level audit trail pattern)
- [ ] Search across all stored outputs
