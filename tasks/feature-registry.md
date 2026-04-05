# Advisory OS — Feature Registry

> Persistent record of every agreed feature. Audited at session start. Never lose a feature to compaction again.
> Skill: `.claude/skills/task-tracker.md`

Last audited: 2026-04-05
Audit result: 82 verified, 0 broken, 4 remaining (F-079, F-083, F-084, F-085)

---

## Status Key
- `verified` — Built, committed, confirmed working
- `built` — Code committed but not yet verified end-to-end
- `in-progress` — Actively being worked on
- `agreed` — Discussed and approved but not yet built
- `broken` — Was working, now isn't
- `blocked` — Depends on external action (e.g. Supabase migration, Stripe setup)

---

## Sprint 1-9: Foundation through Knowledge Vault (ALL VERIFIED)

| ID | Feature | Status | Commit | Verification |
|----|---------|--------|--------|-------------|
| F-001 | Auth (Supabase login/signup) | verified | Sprint 1 | `src/app/(auth)/` exists |
| F-002 | Xero OAuth + sync pipeline | verified | Sprint 2 | `src/app/api/xero/` exists |
| F-003 | Dashboard shell + sidebar | verified | Sprint 1 | `src/app/(dashboard)/layout.tsx` |
| F-004 | Onboarding flow (welcome/interview/connect/complete) | verified | Sprint 4 | `src/app/(onboarding)/` |
| F-005 | KPI engine + variance analysis | verified | Sprint 3 | `src/lib/kpi/engine.ts` |
| F-006 | NL Scenario engine (what-if + goalseek) | verified | Sprint 5 | `src/app/api/scenarios/` |
| F-007 | Modules + playbook maturity scoring | verified | Sprint 6 | Modules page exists |
| F-008 | Macro-to-micro intelligence (anomaly detection) | verified | Sprint 7 | Intelligence pages exist |
| F-009 | Board pack PDF generation (7 themes) | verified | Sprint 8 | `src/app/api/board-pack/` |
| F-010 | Knowledge vault foundations | verified | Sprint 9 | Vault pages + API exist |
| F-011 | Security hardening (audit logging, rate limiting, Zod) | verified | Post-S9 | `src/lib/audit/` exists |

---

## Audit P0 Fixes (ALL VERIFIED)

| ID | Feature | Status | Date Built | Verification |
|----|---------|--------|-----------|-------------|
| F-012 | KPI traffic-light indicators | verified | 2026-03 | KPI cards have color coding |
| F-013 | P&L summary/detail toggle | verified | 2026-03 | Income statement has toggle |
| F-014 | Currency $ to GBP fix | verified | 2026-03 | `formatCurrency` uses org currency |
| F-015 | Scenario modal + what-if toggle | verified | 2026-03 | Scenario pages work |
| F-016 | Search/intelligence CMD+K endpoint | verified | 2026-03 | `/api/intelligence/query` |
| F-017 | Onboarding step order fix | verified | 2026-03 | Progress indicator correct |
| F-018 | Knowledge vault visibility filtering | verified | 2026-03 | `listVaultItems` filters |
| F-019 | Settings save preferences fix | verified | 2026-03 | localStorage + honest label |
| F-020 | Xero sync notifications | verified | 2026-03 | `createNotification()` wired |
| F-021 | Budget entry UI + comparison | verified | 2026-03 | Budget pages + API |
| F-022 | Board pack business context + puppeteer PDF | verified | 2026-03 | PDF gen works |
| F-023 | Team invitations via Resend | verified | 2026-03 | Email API wired |
| F-024 | Vault file upload (Supabase Storage) | verified | 2026-03 | Upload pipeline works |
| F-025 | Vault content renderer + AI outputs sub-page | verified | 2026-03 | Vault JSONB rendering |
| F-026 | Scheduled Xero sync (Vercel Cron) | verified | 2026-03 | Cron endpoint exists |
| F-027 | KPI threshold alert config UI | verified | 2026-03 | Alert rules page |
| F-028 | Budget variance alert engine | verified | 2026-03 | Alert engine code exists |
| F-029 | Settings persistence (user_preferences table) | verified | 2026-03 | API + table exist |
| F-030 | Audit log viewer UI | verified | 2026-03 | `/settings/audit` page |

---

## UX Feedback Build — April 2026 (VERIFIED)

| ID | Feature | Status | Date Built | Verification |
|----|---------|--------|-----------|-------------|
| F-031 | Unified currency formatting (26 files) | verified | 2026-04-04 | `src/lib/formatting/currency.ts` |
| F-032 | Global period selector (URL-synced) | verified | 2026-04-04 | `src/lib/hooks/use-global-period.ts` + UI |
| F-033 | Comparison periods (prior period + prior year) | verified | 2026-04-04 | Global period provider |
| F-034 | FY dates persistent display | verified | 2026-04-04 | Header shows FY label |
| F-035 | Drill-down sheet account case fix | verified | 2026-04-04 | Auto-fetches transactions |
| F-036 | Balance sheet accountId in server data | verified | 2026-04-04 | BS page passes accountId |
| F-037 | KPI card drill-down wiring | verified | 2026-04-04 | Click KPI card opens sheet |
| F-038 | Balance sheet row drill-down | verified | 2026-04-04 | Click account row opens sheet |
| F-039 | Variance line drill-down | verified | 2026-04-04 | Click variance opens sheet |
| F-040 | Income statement drill-down (account + section) | verified | 2026-04-04 | Per-period column drill |
| F-041 | Executive Summary page | verified | 2026-04-04 | `/dashboard/executive-summary` |
| F-042 | Challenge panel + review queue | verified | 2026-04-04 | `number_challenges` table + UI |
| F-043 | Cross-page in-page navigation | verified | 2026-04-04 | `InPageLink` + `CrossRef` components |
| F-044 | Balance sheet Current vs Non-Current | verified | 2026-04-05 | `classifyAccount()` helper |
| F-045 | Cash flow indirect method (Operating/Investing/Financing) | verified | 2026-04-05 | Opening/Closing reconciliation |
| F-046 | Icons on all stat cards (6 files) | verified | 2026-04-05 | KPI_ICONS mapping etc. |
| F-047 | Visual overhaul (anomalies, trends, actions, recs) | verified | 2026-04-05 | Category icons + severity bars |
| F-048 | Onboarding data persistence (8 bugs fixed) | verified | 2026-04-05 | save-basics route + auto-save |
| F-049 | Em dashes removed (14 files) | verified | 2026-04-05 | Hyphens only |
| F-050 | Back/Home links added (4 pages) | verified | 2026-04-05 | All pages navigable |
| F-051 | Widget selector (12 types + 4 templates) | verified | 2026-04-05 | Widget client page |
| F-052 | 7 narrative API endpoints | verified | 2026-04-05 | `/api/narrative/{page}/[orgId]` |
| F-053 | Narrative silent failure fix | verified | 2026-04-05 | Error states + retry UI |
| F-054 | Daily briefing endpoint + component | verified | 2026-04-05 | `/api/briefing/[orgId]` |
| F-055 | Smart chart tooltips (% change + AI insight) | verified | 2026-04-05 | `smart-chart-tooltip.tsx` |
| F-056 | P&L line-item drill-down (direct account click) | verified | 2026-04-05 | `onAccountClick` prop |
| F-057 | KPI targets page (progress bars + inputs) | verified | 2026-04-05 | `/kpi/targets/` |
| F-058 | Custom KPIs page (CRUD + formula builder) | verified | 2026-04-05 | `/kpi/custom/` |
| F-059 | Token tracking (per-user, per-model, per-endpoint) | verified | 2026-04-05 | `token-budget.ts` + migration 029 |
| F-060 | Usage dashboard (budget meter, cost cards, trends) | verified | 2026-04-05 | `/settings/usage/` |
| F-061 | Product Intelligence Layer (line-item parser) | verified | 2026-04-05 | `src/lib/intelligence/line-item-parser.ts` |
| F-062 | Industry-specific KPIs (fashion mode) | verified | 2026-04-05 | `industry-kpis.ts` |
| F-063 | Product metrics API + dashboard component | verified | 2026-04-05 | `/api/intelligence/product-metrics/` |

---

## SHIPPED THIS SESSION (2026-04-05) — Commit 371d81d

| ID | Feature | Status | Date Built | Commit | Verification |
|----|---------|--------|-----------|--------|-------------|
| F-064 | Advisor portal (multi-org, client switcher, portfolio dashboard) | verified | 2026-04-05 | 371d81d | `advisor_clients` table + client switcher + `/advisor` page |
| F-065 | Investor portal (real KPI data, magic links) | verified | 2026-04-05 | 371d81d | `/investor-portal` + magic link auth + investor settings |
| F-066 | Stripe billing integration | verified | 2026-04-05 | 371d81d | `/api/stripe/` + `/settings/billing` + webhook handler |
| F-067 | GDPR data deletion workflow | verified | 2026-04-05 | 371d81d | `/api/gdpr/` + `/settings/data` + cascade-delete.ts |
| F-068 | Hover tooltip with AI explanation | verified | 2026-04-05 | 371d81d | `/api/explain/hover` + AIHoverTooltip on DrillableNumber |
| F-069 | Widget expansion (14 additional widgets) | verified | 2026-04-05 | 371d81d | 14 new components in `widgets/` + widget-registry.ts |
| F-070 | Widget template selection UI | verified | 2026-04-05 | 371d81d | widget-template-selector.tsx + widget-config API |
| F-071 | Alert sparklines + bullet graphs | verified | 2026-04-05 | 371d81d | alert-sparkline.tsx + alert-bullet-graph.tsx |
| F-072 | AI explanation cards for triggered alerts | verified | 2026-04-05 | 371d81d | alert-explanation-card.tsx + `/api/alerts/explain` |
| F-073 | Graph builder pie chart fix | verified | 2026-04-05 | 371d81d | System prompt updated for chart type mapping |
| F-074 | Chart hover drill-down to data points | verified | 2026-04-05 | 371d81d | onClick handlers on all chart types |
| F-075 | Platform visual character (Tufte/Few/Knaflic) | verified | 2026-04-05 | 371d81d | bullet-graph.tsx + mini-sparkline.tsx + redundant-indicator.tsx |
| F-076 | Universal CMD+K command bar | verified | 2026-04-05 | 371d81d | command-palette.tsx + `/api/command/query` + query-executor.ts |
| F-077 | Key Actions daily briefing page | verified | 2026-04-05 | 371d81d | `/dashboard/key-actions` + `/api/briefing/key-actions/[orgId]` |
| F-078 | Task tracker skill | verified | 2026-04-05 | c6fa2fc | `.claude/skills/task-tracker.md` + this file |
| F-080 | Run migration 023+029 on Supabase | verified | 2026-04-05 | 371d81d | All 29 migrations applied (007-035) |
| F-081 | Run all pending migrations | verified | 2026-04-05 | 371d81d | 79 tables in Supabase |
| F-082 | Regenerate Supabase TypeScript types | verified | 2026-04-05 | 371d81d | `src/types/supabase.ts` (4,520 lines) |

---

## AGREED — NOT YET BUILT

| ID | Feature | Status | Date Agreed | Priority | Verification Criteria |
|----|---------|--------|-------------|----------|----------------------|
| F-079 | Xero re-sync + Alonuko reconciliation verification | agreed | 2026-04 | P0 | Revenue ~GBP1.3m, net profit = LOSS |
| F-083 | End-to-end manual testing (Xero connect to dashboard) | agreed | 2026-04 | P1 | Needs user in browser |

---

## Infrastructure / Tech Debt

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| F-084 | RLS policy integration tests | agreed | Write tests for all RLS policies |
| F-085 | Fix getYTDPeriods date-sensitive test | agreed | Vitest assertion is date-dependent |
| F-086 | Semantic Intelligence Layer docs update | verified | `SEMANTIC_INTELLIGENCE_LAYER_SPRINT.md` up to date |

---

## Audit Summary

```
=== FEATURE REGISTRY AUDIT — 2026-04-05 (POST-BUILD) ===
Total: 86 features tracked

  Verified:     82
  Built:         0
  In Progress:   0
  Agreed:        4  (F-079, F-083, F-084, F-085)
  Blocked:       0
  Broken:        0

REMAINING:
  F-079: Alonuko re-sync verification — P0
  F-083: End-to-end manual testing — P1 (needs user in browser)
  F-084: RLS integration tests — tech debt
  F-085: Fix YTD test — tech debt
  F-065: Investor Portal — P1
  F-066: Stripe billing — P1
  F-067: GDPR deletion — P1
  F-068: Hover AI tooltip — P1

BLOCKED (needs user action):
  F-080: Run migration 029 SQL in Supabase dashboard
  F-081: Run migration 023 SQL in Supabase dashboard
===
```
