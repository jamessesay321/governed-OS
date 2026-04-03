# Advisory OS — Task Tracker

## Sprints 1–9: All COMPLETE

All core sprints shipped. See CLAUDE.md sprint table for details.

## Platform Enhancements — COMPLETE

- [x] Token optimisation, governance checkpoint, persona config, DrillableNumber, two-path onboarding
- [x] Copy/tone cleanup, quick actions, visual warmth

## Feature Benchmark Audits — ALL 15 COMPLETE

All audit files written to `docs/audits/`:
- [x] 01–05: Dashboard, KPI/Variance, Financial Statements, Charts, Scenario Planning
- [x] 06–10: Forecasting/Budgeting, Board Pack, Search/Intelligence, Onboarding, Collaboration
- [x] 11–15: Knowledge Vault, Advisor Portal, Investor Portal, Settings/Config, Automations/Alerts

## Completed P0 Fixes (from audits)

### Audits 01–04 P0 fixes
- [x] KPI traffic-light indicators, P&L summary/detail toggle, plain-English headers
- [x] Inline margin %, shared drill-down panel, waterfall interactivity, plain-English KPI labels

### Audit 05 P0 fixes
- [x] Currency $ → £, modal dialog for duplicate, what-if mode toggle, error surfacing

### ARCH-3 Bug Fix
- [x] Per-period assumption resolution (union type approach, all 84 scenario tests pass)

### Audit 08 P0 fixes (Search & Intelligence)
- [x] Inject Company Skill into Ask Grove (replaced 110 lines of ad-hoc context)
- [x] Create CMD+K AI endpoint (`/api/intelligence/query`)
- [x] Variance AI import confirmed NOT broken (false alarm)

### Audit 09 P0 fixes (Onboarding)
- [x] Fix step order inversion in progress indicator (currentStep=2 on completion)
- [x] Replace hardcoded complete page data with real DB stats

### Audit 11 P0 fixes (Knowledge Vault)
- [x] Enforce vault visibility filtering (owner_only, advisor_only rules in listVaultItems)
- [x] Sanitise search input in vault queries

### Audit 14 P0 fix (Settings)
- [x] Fix deceptive Save Preferences button (now uses localStorage + honest "Saved to this browser" label)

### Audit 15 P0 fix (Automations & Alerts)
- [x] Wire createNotification() into event flows:
  - Xero sync success → system notification with record count
  - Xero sync failure → system notification with error message
  - Anomaly detection → intelligence notification for high-severity anomalies
  - Health check → intelligence notification for critical alerts

## Remaining P0 Items (Next Priority)

### Audit 06: Forecasting & Budgeting
- [ ] Build budget entry UI (budget_lines table + form + comparison view)
- [ ] Fix compare-mode disconnect in variance backend
- [ ] Wire drill-down page for forecast vs actuals

### Audit 07: Board Pack & Reporting
- [x] Inject business context into report narratives
- [x] Switch PDF to headless browser (puppeteer-core + @sparticuz/chromium)
- [x] Fix KPI N/A fields in board pack

### Audit 10: Collaboration & Sharing
- [x] Wire Resend to email API for invitations
- [x] Build invitation landing page
- [x] Wire notifications on key events (done in previous session)
- [x] Fix team management actions (remove, role change)

### Audit 11: Knowledge Vault
- [x] Build file upload pipeline (Supabase Storage)
- [ ] Build content renderer for vault JSONB items
- [x] Wire AI Outputs sub-page to filtered vault query

### Audit 12: Advisor Portal (CRITICAL ARCHITECTURE)
- [ ] Build multi-org data model (advisor_clients junction table)
- [ ] Build client switcher in header
- [ ] Build advisor portfolio dashboard
- [ ] Add role-gated middleware

### Audit 13: Investor Portal
- [ ] Wire investor dashboard to real KPI data
- [ ] Create investor-specific DB tables
- [ ] Build investor auth with magic links

### Audit 14: Settings & Configuration
- [x] Build settings persistence layer (user_preferences table + API)
- [ ] Integrate Stripe for billing
- [x] Build functional data exports
- [ ] Add GDPR data deletion workflow
- [x] Complete team management CRUD
- [ ] Build audit log viewer UI
- [ ] Persist module toggle state

### Audit 15: Automations & Alerts
- [x] Implement scheduled Xero sync (Vercel Cron)
- [x] Build KPI threshold alert configuration UI
- [x] Wire email sending via Resend
- [x] Build budget variance alert engine
- [x] Fix dead-link CTAs in recommendations

## P0 CRITICAL: Xero Data Accuracy (Alonuko Reconciliation)

- [x] Fix double-counting: normaliseTransactions now filters to invoices/bills only (bank transactions excluded)
- [x] Add clear-before-rebuild step in normalise to remove stale double-counted data
- [x] Create xero-reconciliation skill (.claude/skills/xero-reconciliation.md)
- [x] Document lesson in tasks/lessons.md and research-analyst/reconciliation/
- [ ] **RE-SYNC REQUIRED**: Trigger Xero re-sync for Alonuko to regenerate normalised_financials with correct data
- [ ] After re-sync: verify revenue matches management accounts (~£1.3m/year, NOT £2.58m)
- [ ] After re-sync: verify net profit shows a LOSS (not £245k profit)
- [ ] Investigate deferred income (£647k): check if deposit accounts classified as REVENUE in Xero CoA
- [ ] Investigate stock/WIP movements: may need inclusion in COGS for correct gross margin
- [ ] Investigate interest charges (£222k in 2025): verify classification as EXPENSE
- [ ] Add financial year reference to dashboard period selector (currently just "All 12 months")

## UX Feedback Build (April 2026) — See docs/audits/16-ux-feedback-april-2026.md

### P0: Number Formatting
- [ ] Create `src/lib/formatting/currency.ts` (formatCurrency, formatPercent, formatNumber)
- [ ] Respect org base currency from Xero config
- [ ] Audit and replace all raw number displays platform-wide

### P1: Global Period Selector + Comparison Periods
- [ ] Upgrade period-selector.tsx to global context provider in header
- [ ] All pages respond to global period selection (monthly/quarterly/annual)
- [ ] Add comparison periods: vs prior period + vs same period last year
- [ ] Display FY dates persistently

### P1: Universal Drill-Down (to Xero transaction level)
- [ ] Build `DrillableNumber` shared component
- [ ] Build `DrillDownPanel` 3-level slide-out (account → monthly → transactions)
- [ ] Wire to all financial numbers across dashboard, KPIs, charts, statements
- [ ] Add hover tooltip: value + variance + % of total + AI explanation (live, Haiku)

### P2: KPI/Variance Wiring
- [ ] Wire KPI card click handlers → KPI detail page
- [ ] Wire variance click → drill-down panel showing account drivers

### P2: Balance Sheet + Cash Flow Detail Parity
- [ ] BS: expandable sections, account-level data, period comparison columns
- [ ] CF: operating/investing/financing breakdown with expandable items

### P2: Executive Summary (replace Financial Summary)
- [ ] Rename page → "Executive Summary"
- [ ] AI narrative lead (3-4 sentences, founder-tone)
- [ ] Visual P&L waterfall + 4-5 KPI bullet graphs
- [ ] Correct terminology + hover tooltip definitions
- [ ] Comparison context (vs last month + vs same month last year)

### P2: Challenge Panel + Review Queue
- [ ] Create `number_challenges` table
- [ ] Build per-page Challenge button (flag icon in header)
- [ ] Build slide-out Challenge Panel
- [ ] Build Review Queue page at `/dashboard/review-queue`
- [ ] Send consolidated message to accountant/developer

### P2: Cross-Page In-Page Navigation
- [ ] Build `InPageLink` component (smooth scroll to section)
- [ ] Wire cross-references throughout financials pages

### P3: Widget Expansion (19 widgets + 4 templates)
- [ ] Build 14 additional widget components
- [ ] Create `dashboard_widget_configs` table
- [ ] Build visual template selection UI (preview cards, pill tabs)
- [ ] Template flow: select starting point → customise → save → switch/delete

### P3: KPI Alerts Visual Upgrade
- [ ] Add icons, sparklines, bullet graphs to alert rules
- [ ] Color-coded severity badges (info/warning/critical)
- [ ] AI-generated explanation cards for triggered alerts

### P3: Graph Builder Fixes
- [ ] Fix AI → pie chart type mapping
- [ ] Apply formatCurrency to all chart tooltips and labels
- [ ] Add hover drill-down to chart data points

### P3: Platform-Wide Visual Character (apply data-visualization-design skill)
- [ ] Audit all pages for text-heavy sections
- [ ] Apply Tufte/Few/Knaflic principles: sparklines, bullet graphs, one-accent-color
- [ ] Replace any gauges with bullet graphs
- [ ] Ensure redundant coding (color + icon + label) on all indicators

### P4: Universal Command Bar (CMD+K)
- [ ] Build command palette component
- [ ] NL → Claude API → data query → chart/table rendering
- [ ] Available from any page
- [ ] Save results as permanent widgets

### P4: Key Actions Daily Briefing
- [ ] Build daily briefing page at `/dashboard/key-actions`
- [ ] Sections: Revenue, Cash, Costs, Risk
- [ ] Every insight links back to source data/graph
- [ ] Cache briefing in `daily_briefing_cache` table

## Infrastructure & Technical Debt

- [ ] Run migration 023 on Supabase (account_mapping_history + tracking_category_mappings)
- [ ] Regenerate Supabase TypeScript types after latest migrations
- [ ] End-to-end manual testing (Xero connect → sync → dashboard)
- [ ] RLS policy integration tests
- [ ] Fix pre-existing test: getYTDPeriods date-sensitive assertion
