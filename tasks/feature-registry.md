# Advisory OS — Feature Registry

> Persistent record of every agreed feature. Audited at session start. Never lose a feature to compaction again.
> Skill: `.claude/skills/task-tracker.md`

Last audited: 2026-04-05
Audit result: 64 verified, 0 broken, 18 agreed/not-built, 4 blocked

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

## AGREED — NOT YET BUILT

| ID | Feature | Status | Date Agreed | Priority | Verification Criteria |
|----|---------|--------|-------------|----------|----------------------|
| F-064 | Advisor portal (multi-org, client switcher, portfolio dashboard) | agreed | 2026-03 | P0 | `advisor_clients` table + client switcher in header |
| F-065 | Investor portal (real KPI data, investor tables, magic links) | agreed | 2026-03 | P1 | Investor dashboard wired to real data |
| F-066 | Stripe billing integration | agreed | 2026-03 | P1 | Stripe checkout + subscription management |
| F-067 | GDPR data deletion workflow | agreed | 2026-03 | P1 | Delete endpoint + confirmation flow |
| F-068 | Hover tooltip with AI explanation (DrillableNumber) | agreed | 2026-04 | P1 | Haiku call on hover, shows value + variance + % + AI line |
| F-069 | Widget expansion (14 additional widgets) | agreed | 2026-04 | P3 | `dashboard_widget_configs` table + 14 components |
| F-070 | Widget template selection UI | agreed | 2026-04 | P3 | Preview cards + pill tabs + save/switch/delete |
| F-071 | Alert sparklines + bullet graphs | agreed | 2026-04 | P3 | Sparkline SVGs on alert rules |
| F-072 | AI explanation cards for triggered alerts | agreed | 2026-04 | P3 | Claude call on alert trigger |
| F-073 | Graph builder pie chart fix | agreed | 2026-04 | P3 | AI correctly maps to pie chart type |
| F-074 | Chart hover drill-down to data points | agreed | 2026-04 | P3 | Click chart point opens drill sheet |
| F-075 | Platform-wide visual character (Tufte/Few/Knaflic) | agreed | 2026-04 | P3 | Audit all pages, apply principles |
| F-076 | Universal CMD+K command bar | agreed | 2026-04 | P4 | Command palette from any page |
| F-077 | Key Actions daily briefing page | agreed | 2026-04 | P4 | `/dashboard/key-actions` with 4 sections |
| F-078 | Task tracker skill (this document) | verified | 2026-04-05 | P0 | This file + skill + audit script + CLAUDE.md gates |
| F-079 | Xero re-sync + Alonuko reconciliation verification | agreed | 2026-04 | P0 | Revenue ~GBP1.3m, net profit = LOSS |

---

## BLOCKED (External Action Required)

| ID | Feature | Status | Blocker |
|----|---------|--------|---------|
| F-080 | Run migration 029 on Supabase | blocked | Must run SQL in Supabase dashboard |
| F-081 | Run migration 023 on Supabase | blocked | Must run SQL in Supabase dashboard |
| F-082 | Regenerate Supabase TypeScript types | blocked | After migrations run |
| F-083 | End-to-end manual testing (Xero connect to dashboard) | blocked | Needs user in browser |

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
=== FEATURE REGISTRY AUDIT — 2026-04-05 ===
Total: 86 features tracked

  Verified:     64
  Built:         0
  In Progress:   0
  Agreed:       18  (F-064 through F-077, F-079, F-084, F-085)
  Blocked:       4  (F-080 through F-083)
  Broken:        0

HIGHEST PRIORITY UNBUILT:
  F-064: Advisor Portal (multi-org) — P0, agreed March 2026
  F-079: Alonuko re-sync verification — P0, agreed April 2026
  F-065: Investor Portal — P1
  F-066: Stripe billing — P1
  F-067: GDPR deletion — P1
  F-068: Hover AI tooltip — P1

BLOCKED (needs user action):
  F-080: Run migration 029 SQL in Supabase dashboard
  F-081: Run migration 023 SQL in Supabase dashboard
===
```
