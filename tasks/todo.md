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
- [x] Build budget entry UI (budget_lines table + form + comparison view)
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
- [x] Build content renderer for vault JSONB items
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
- [x] Build audit log viewer UI
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

### P0: Number Formatting ✅ COMPLETE
- [x] Create `src/lib/formatting/currency.ts` (formatCurrency, formatPence, formatBalance, formatCurrencyCompact, formatPercent, formatNumber, chartAxisFormatter, chartTooltipFormatter)
- [x] Respect org base currency from Xero config (via getCurrencyConfig)
- [x] Audit and replace all raw number displays platform-wide (26 files, 22 local functions replaced, 2 USD→GBP fixes, 3 decimal fixes)

### P1: Global Period Selector + Comparison Periods
- [x] Upgrade period-selector.tsx to global context provider in header
- [x] All pages respond to global period selection (monthly/quarterly/annual)
- [x] Add comparison periods: vs prior period + vs same period last year
- [x] Display FY dates persistently

### P1: Universal Drill-Down Wiring
- [x] Fix drill-down-sheet account case (auto-fetch transactions)
- [x] Add accountId to balance sheet server data
- [x] Wire KPI card clicks → drill-down sheet
- [x] Wire balance sheet account rows → drill-down sheet
- [ ] Build `DrillableNumber` shared component
- [ ] Wire to all remaining financial numbers (charts, cash flow)
- [ ] Add hover tooltip: value + variance + % of total + AI explanation (live, Haiku)

### P2: KPI/Variance Wiring
- [x] Wire KPI card clicks → drill-down sheet (done in P1 commit)
- [x] Enhanced KPIContent renderer with contributing P&L sections map
- [x] Wire variance line clicks → drill-down sheet with variance context
- [x] Wire KPI page to global period (removed local period selector)
- [x] Wire profitability + financial health pages to global period

### P2: Balance Sheet + Cash Flow Detail Parity
- [x] BS: expandable sections, account-level data, period comparison columns, % of total, accounting equation check
- [x] CF: operating/investing/financing breakdown with expandable items, drill-down, % of ops column

### P2: Executive Summary (replace Financial Summary)
- [x] Build Executive Summary page at `/dashboard/executive-summary`
- [x] AI narrative lead (NarrativeSummary component)
- [x] Visual P&L waterfall (horizontal bar chart)
- [x] 5 KPI bullet graphs (Revenue, Gross Margin, Net Profit, Expenses, Cash Position)
- [x] Comparison context table (vs last month + vs same month last year)
- [x] Quick links to Income Statement, Balance Sheet, Variance
- [x] Drill-down wired on Revenue, Net Profit, Expenses metrics
- [x] Added to sidebar navigation
- [x] Correct terminology + hover tooltip definitions (FinancialTooltip on Revenue, Gross Margin, Net Profit, OpEx, Cash Position)

### P2: Challenge Panel + Review Queue
- [x] Create `number_challenges` table (migration 028)
- [x] Build per-page Challenge button (flag icon in header)
- [x] Build slide-out Challenge Panel (ChallengeProvider + ChallengePanel)
- [x] Build Review Queue page at `/dashboard/review-queue`
- [ ] Send consolidated message to accountant/developer (email digest via Resend)

### P2: Cross-Page In-Page Navigation
- [x] Build `InPageLink` + `SectionAnchor` + `CrossRef` components
- [x] Wire cross-references throughout financials pages (InPageLink usage)

### P3: Widget Expansion (19 widgets + 4 templates)
- [ ] Build 14 additional widget components
- [ ] Create `dashboard_widget_configs` table
- [ ] Build visual template selection UI (preview cards, pill tabs)
- [ ] Template flow: select starting point → customise → save → switch/delete

### P3: KPI Alerts Visual Upgrade
- [x] Add severity icons (Info/AlertTriangle/AlertCircle) to alert rules
- [x] Color-coded severity badges with icons (info/warning/critical)
- [ ] Add sparklines and bullet graphs to alert rules
- [ ] AI-generated explanation cards for triggered alerts

### P3: Graph Builder Fixes
- [ ] Fix AI → pie chart type mapping
- [x] Apply formatCurrency to all chart tooltips and Y-axis labels (bar, line, area, pie, waterfall)
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
