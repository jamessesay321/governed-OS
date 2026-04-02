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

## Infrastructure & Technical Debt

- [ ] Run migration 023 on Supabase (account_mapping_history + tracking_category_mappings)
- [ ] Regenerate Supabase TypeScript types after latest migrations
- [ ] End-to-end manual testing (Xero connect → sync → dashboard)
- [ ] RLS policy integration tests
- [ ] Fix pre-existing test: getYTDPeriods date-sensitive assertion
