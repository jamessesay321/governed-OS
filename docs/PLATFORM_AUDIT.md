# Grove Platform Audit — 30 March 2026

## Summary

| Status | Pages | Percentage |
|--------|-------|-----------|
| REAL (wired to DB/API) | 11 | 23% |
| PARTIAL (mix of real + mock) | 4 | 9% |
| FAKE (hardcoded/visual-only) | 29 | 62% |
| Missing | 2 | 4% |
| Not audited | 1 | 2% |

---

## Page-by-Page Status

### REAL Pages (Working with Database)

| Page | Data Sources | Notes |
|------|-------------|-------|
| `/home` | organisations, xero_connections, sync_log | Getting Started now auto-detects from DB |
| `/dashboard` | normalised_financials, chart_of_accounts, xero_connections, sync_log, organisations, dashboard_preferences | Full financial aggregation pipeline |
| `/financials` (Summary) | normalised_financials, chart_of_accounts, raw_transactions, sync_log, xero_connections | Period summaries from real data |
| `/kpi` | normalised_financials, sync_log | KPI engine calculates from real data |
| `/variance` | normalised_financials | Period-over-period comparison |
| `/forecast` | Passes orgId to client | Client fetches from API |
| `/intelligence` | intelligence_impacts table | Handles missing table gracefully |
| `/xero` | xero_connections, sync_log | Full sync management |
| `/playbook` | getLatestAssessment() | Loads assessment if exists |
| `/settings` | profiles, org_invitations | Team list, invite form |
| `/integrations` | xero_connections, quickbooks_connections, sync_log | Connection status + last sync |

### FAKE Pages (Hardcoded Mock Data — MUST FIX)

| Page | What's Fake | Priority |
|------|------------|----------|
| `/financials/income-statement` | Entire P&L is hardcoded £2M mock data | HIGH |
| `/financials/balance-sheet` | Entire balance sheet is hardcoded mock | HIGH |
| `/financials/cash-flow` | Entire cash flow is hardcoded mock | HIGH |
| `/financials/budget` | Budget vs actual is hardcoded mock | HIGH |
| `/dashboard/profitability` | Margin trends, expense breakdown all mock | HIGH |
| `/dashboard/revenue` | Revenue by product, MRR all mock | HIGH |
| `/intelligence/anomalies` | 3 hardcoded sample anomalies | MEDIUM |
| `/intelligence/trends` | 4 hardcoded sample trends | MEDIUM |
| `/health` | Hardcoded health score categories | MEDIUM |
| `/playbook/assessment` | "Run Assessment" button is visual-only | MEDIUM |
| `/playbook/history` | Shows "No assessments" with no DB query | MEDIUM |
| `/settings/team` | "Invite Member" button is visual-only | MEDIUM |
| `/settings/modules` | Toggle switches not persisted | LOW |
| `/settings/exports` | "Download" shows fake feedback | LOW |
| `/settings/preferences` | Language/timezone not persisted | LOW |
| `/home/activity` | Shows "No activity yet" placeholder | LOW |
| `/home/getting-started` | Completion tracking local state only | LOW (now partially fixed in /home) |
| `/variance/budget` | Empty state placeholder | LOW |
| `/variance/drill-down` | Empty state placeholder | LOW |

### Buttons That Don't Work

| Button | Page | What Should Happen |
|--------|------|--------------------|
| Run Assessment | /playbook/assessment | Call API to run playbook assessment |
| Invite Member | /settings/team | POST to invitation API |
| Save (preferences) | /settings/preferences | POST to save language/timezone |
| Download (exports) | /settings/exports | Generate and download CSV/PDF |
| Module toggles | /settings/modules | POST to activate/deactivate module |
| Notify me (Sage/FreshBooks) | /integrations | POST to register interest |

### Currency Issues

| Location | Issue | Status |
|----------|-------|--------|
| financials-client.tsx | Hardcoded AUD locale/currency | FIXED (now uses CurrencyContext) |
| kpi/format.ts | Hardcoded GBP | FIXED (now accepts parameter) |
| kpi/engine.ts | May still hardcode GBP | NEEDS CHECK |
| income-statement | Hardcoded £ symbol in fmtK() | NEEDS FIX (page is fake anyway) |
| balance-sheet | Hardcoded £ in fmt() | NEEDS FIX (page is fake anyway) |
| cash-flow | Hardcoded £ in format | NEEDS FIX (page is fake anyway) |
| budget | Hardcoded £ in fmt | NEEDS FIX (page is fake anyway) |

### API Routes Status

| Status | Count |
|--------|-------|
| WORKS | 65 (72%) |
| PARTIAL | 21 (23%) |
| BROKEN | 4 (5%) |

#### Broken Routes
- `/api/email/send` — Only console.logs, no email delivery
- `/api/agents/audit/[orgId]` — Missing Zod validation, unsanitised params
- `/api/agents/runs/[orgId]` — Missing Zod validation

### Missing Pages (sidebar links to nothing)
- `/consultants/requests`
- `/custom-builds/projects`

---

## Priority Fix Order

### Phase 1: Financial Sub-Pages (Highest Impact)
Wire Income Statement, Balance Sheet, Cash Flow, Budget to real normalised_financials data.
These are the most visible pages for the core use case.

### Phase 2: Dashboard Drill-Downs
Wire Profitability and Revenue detail pages to real data.

### Phase 3: Settings Persistence
Make preferences, module toggles, and exports actually save to database.

### Phase 4: Intelligence & Playbook
Wire anomalies, trends, and assessment to real API calls.

### Phase 5: Cleanup
Fix missing pages, broken API routes, remove hardcoded currency.
