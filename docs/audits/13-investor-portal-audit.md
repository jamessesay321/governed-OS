# Feature Benchmark Audit #13 -- Investor Portal

**Platform:** Advisory OS (Governed OS)
**Audit Date:** 2026-04-02
**Benchmarked Against:** Fathom, Visible.vc, Carta, Runway, Jirav, Mosaic, and industry best practices
**Auditor:** Claude Opus 4.6

---

## 1. Feature Inventory

| # | Feature | Type | Location | Current State |
|---|---------|------|----------|---------------|
| 1 | Investor Dashboard (hub page) | Page | `src/app/(dashboard)/investors/page.tsx` | Demo/hardcoded -- static KPIs (ARR, MRR, Burn, Runway), valuation card, round progress bar, cap table summary, document vault summary, recent updates |
| 2 | Investor Updates | Page | `src/app/(dashboard)/investors/updates/page.tsx` | Demo/hardcoded -- list of updates with status (draft/sent/opened), open rate tracking, 4 templates (Monthly, Quarterly, Board Pack, Fundraising), create-update modal |
| 3 | Document Vault | Page | `src/app/(dashboard)/investors/documents/page.tsx` | Demo/hardcoded -- 10 mock documents across 5 categories, version tracking, share/expiry flags, access log, search/filter, drag-drop upload UI |
| 4 | Investor Portal (data room manager) | Page | `src/app/(dashboard)/investor-portal/page.tsx` | Demo/hardcoded -- room list with status (active/draft/archived), investor count, readiness score, stats cards |
| 5 | Room Builder (4-step wizard) | Page | `src/app/(dashboard)/investor-portal/builder/page.tsx` | Demo/hardcoded -- name/template selection, data item picker (12 items), per-item permissions (view/interactive/downloadable/hidden), review/publish step, AI recommendation |
| 6 | Engagement Analytics | Page | `src/app/(dashboard)/investor-portal/analytics/page.tsx` | Demo/hardcoded -- per-investor engagement tracking (time, pages, scenarios, questions), AI insights, engagement scores, interest levels |
| 7 | AI Readiness Check | Page | `src/app/(dashboard)/investor-portal/readiness/page.tsx` | Demo/hardcoded -- 4-category readiness scoring (Data Completeness, Narrative Consistency, Financial Hygiene, Competitive Positioning), predicted investor questions |
| 8 | Investment Readiness Module | Component | `src/components/modules/investment-readiness/investment-readiness.tsx` | Semi-functional -- fetches from API with demo fallback, scored assessment (0-100), 4 pillars chart, gap analysis, investor-ready metrics |
| 9 | Investor Persona Config | Config | `src/lib/governance/personas.ts` | Implemented -- investor persona with dedicated KPIs, readonly feature access, investor_ready communication style |
| 10 | Investor Dashboard Template | Config | `src/lib/dashboard/templates.ts` | Implemented -- investor-default template with role-based widget selection |
| 11 | Investor Update Report Template | Config | `src/lib/reports/templates.ts` | Implemented -- 6-section template (highlights, metrics, revenue chart, burn/runway, milestones, ask) |
| 12 | Board Pack Report Template | Config | `src/lib/reports/templates.ts` | Implemented -- full board pack template with AI narrative generation |
| 13 | Investor Relations Agent | Config | `src/lib/agents/registry.ts` | Registered -- agent definition with capabilities listed but no execution logic |
| 14 | Cap Table Summary | UI Section | `src/app/(dashboard)/investors/page.tsx` | Demo/hardcoded -- stacked bar, 5 holder categories, shares/price stats |
| 15 | Fundraising Progress Tracker | UI Section | `src/app/(dashboard)/investors/page.tsx` | Demo/hardcoded -- round target vs committed, progress bar |
| 16 | Sidebar Navigation | Config | `src/components/layout/sidebar.tsx` | Implemented -- Investor Portal group with Dashboard, Updates, Document Vault links |
| 17 | DB Schema: report_type enum | Schema | `supabase/migrations/004_remaining_tables.sql` | Implemented -- includes 'investor_update' and 'board_pack' types |

---

## 2. Benchmark Tables (Per Feature Area)

### 2.1 Investor Dashboard

| Capability | Advisory OS | Fathom | Visible.vc | Carta | Runway | Jirav | Mosaic |
|-----------|------------|--------|-----------|-------|--------|-------|--------|
| Key financial KPIs | Hardcoded demo | Live from Xero/QBO | Live from integrations | Live from accounting | Live models | Live from ERP | Live from ERP |
| Company valuation display | Static card | N/A | Valuation tracker | Cap table-driven | N/A | N/A | N/A |
| Round progress tracking | Static bar | N/A | Full pipeline | Complete deal flow | N/A | N/A | N/A |
| Custom KPI selection | Persona-configured | Customisable | Fully custom | N/A | Custom metrics | Custom | Custom |
| Multi-company portfolio view | Not built | Multi-entity | Portfolio dashboard | Full portfolio | Multi-entity | Multi-entity | Multi-entity |
| Real-time data sync | No (all mock data) | Yes | Yes | Yes | Yes | Yes | Yes |

### 2.2 Company Metrics Tracking

| Capability | Advisory OS | Fathom | Visible.vc | Carta | Runway | Jirav | Mosaic |
|-----------|------------|--------|-----------|-------|--------|-------|--------|
| ARR/MRR tracking | Hardcoded | Calculated from data | Core feature | N/A | Driver-based | Calculated | Real-time |
| Burn rate/runway | Hardcoded | Calculated | Core feature | N/A | Driver-based | Calculated | Real-time |
| Custom metric definitions | Not built | Yes | Yes, with formulas | Limited | Powerful | Yes | Yes |
| Historical trends | Not built | 5yr history | Configurable | Limited | Full timeline | Rolling | Full |
| Benchmark comparisons | Not built | Sector benchmarks | Industry data | Market data | N/A | Benchmark library | Cohort benchmarks |

### 2.3 Fund/Portfolio Analytics

| Capability | Advisory OS | Fathom | Visible.vc | Carta | Runway | Jirav | Mosaic |
|-----------|------------|--------|-----------|-------|--------|-------|--------|
| Portfolio-level dashboard | Config exists, not built | Multi-org reports | Core product | Core product | N/A | Multi-entity | Multi-entity |
| Cross-company comparison | Not built | Consolidated reporting | Side-by-side | Portfolio analytics | N/A | Consolidation | Consolidation |
| Fund performance (IRR/MOIC) | Not built | N/A | IRR tracking | Full GP analytics | N/A | N/A | N/A |
| Deal pipeline | Not built | N/A | CRM integration | Full deal flow | N/A | N/A | N/A |

### 2.4 Board Pack Delivery

| Capability | Advisory OS | Fathom | Visible.vc | Carta | Runway | Jirav | Mosaic |
|-----------|------------|--------|-----------|-------|--------|-------|--------|
| Board pack template | Defined in report templates | PDF export | Automated reports | Board portal | N/A | Board pack builder | Board reporting |
| PDF generation | Sprint 8 complete | PDF/Word | PDF/branded | Branded portal | PDF | PDF/Excel | PDF |
| Custom branding/themes | 7 themes (Sprint 8) | White-label | Custom branding | Full branding | Limited | White-label | Limited |
| Automated scheduling | Not built | Email scheduling | Auto-send | Recurring | N/A | Scheduled delivery | Scheduled |
| Live data embedding | Not built | Live charts in PDF | Live links | Portal view | Live models | Snapshot | Live |

### 2.5 Data Room

| Capability | Advisory OS | Fathom | Visible.vc | Carta | Runway | Jirav | Mosaic |
|-----------|------------|--------|-----------|-------|--------|-------|--------|
| Secure data room creation | Demo wizard (4-step) | N/A | N/A | Full VDR product | N/A | N/A | N/A |
| Per-document permissions | Demo (view/interactive/download/hidden) | N/A | N/A | Granular ACL | N/A | N/A | N/A |
| Template packages (light/detailed/custom) | Demo UI | N/A | N/A | Custom folders | N/A | N/A | N/A |
| Engagement tracking | Demo analytics page | N/A | Open tracking | Full analytics | N/A | N/A | N/A |
| Watermarking/NDA | Not built | N/A | N/A | Yes | N/A | N/A | N/A |
| Link expiration | Demo UI in docs | N/A | N/A | Yes | N/A | N/A | N/A |

### 2.6 Investor Updates/Communications

| Capability | Advisory OS | Fathom | Visible.vc | Carta | Runway | Jirav | Mosaic |
|-----------|------------|--------|-----------|-------|--------|-------|--------|
| Update templates | 4 templates (Monthly, Quarterly, Board, Fundraising) | Email reports | Full template library | Limited | N/A | Report templates | Limited |
| AI-drafted updates | Referenced in UI, not functional | N/A | N/A | N/A | N/A | N/A | N/A |
| Open/read tracking | Demo data (open rates) | N/A | Full tracking | Limited | N/A | N/A | N/A |
| Email delivery | Not built (button only) | Built-in | Built-in | Built-in | N/A | Email | Built-in |
| Recipient management | Not built | N/A | Contact management | Stakeholder registry | N/A | N/A | N/A |

### 2.7 Cap Table

| Capability | Advisory OS | Fathom | Visible.vc | Carta | Runway | Jirav | Mosaic |
|-----------|------------|--------|-----------|-------|--------|-------|--------|
| Cap table display | Static bar + legend (5 holders) | N/A | Basic | Complete product | N/A | N/A | N/A |
| Equity modelling | Not built | N/A | N/A | Full modelling | N/A | N/A | N/A |
| Dilution scenarios | Not built | N/A | N/A | Yes | N/A | N/A | N/A |
| ESOP management | Static percentage only | N/A | N/A | Full ESOP | N/A | N/A | N/A |
| 409A / EMI valuations | Not built | N/A | N/A | Core product | N/A | N/A | N/A |

### 2.8 Due Diligence Docs

| Capability | Advisory OS | Fathom | Visible.vc | Carta | Runway | Jirav | Mosaic |
|-----------|------------|--------|-----------|-------|--------|-------|--------|
| DD checklist | Not built | N/A | N/A | DD management | N/A | N/A | N/A |
| DD document categories | Demo (Tech DD, IP Audit) | N/A | N/A | Full DD workflow | N/A | N/A | N/A |
| Q&A workflow | Not built | N/A | N/A | Built-in Q&A | N/A | N/A | N/A |
| Status tracking | Not built | N/A | N/A | Full lifecycle | N/A | N/A | N/A |

### 2.9 Real-Time Financial Access

| Capability | Advisory OS | Fathom | Visible.vc | Carta | Runway | Jirav | Mosaic |
|-----------|------------|--------|-----------|-------|--------|-------|--------|
| Live P&L/BS/CF access | Not connected (demo data) | Live from Xero | Via integrations | Limited | Live models | Live from ERP | Real-time |
| Investor-scoped views | Persona config exists, not wired | N/A | Role-based | Role-based | N/A | Role-based | Role-based |
| Drill-down to transactions | Not built for investor view | Full drill-down | N/A | N/A | N/A | Limited | N/A |
| Data freshness indicators | Not present on investor pages | Sync timestamp | N/A | N/A | N/A | N/A | N/A |

### 2.10 KPI Alerting

| Capability | Advisory OS | Fathom | Visible.vc | Carta | Runway | Jirav | Mosaic |
|-----------|------------|--------|-----------|-------|--------|-------|--------|
| Threshold-based alerts | Not built for investors | Email alerts | Custom alerts | N/A | Alert rules | Scheduled alerts | Custom alerts |
| Investor-specific notifications | Not built | N/A | Investor alerts | N/A | N/A | N/A | N/A |
| Alert delivery (email/slack) | Not built | Email | Multi-channel | N/A | Slack/email | Email | Slack/email |

---

## 3. Competitive Feature Matrix

| Feature | Advisory OS | Fathom | Visible.vc | Carta | Runway | Jirav | Mosaic |
|---------|:----------:|:------:|:---------:|:-----:|:------:|:-----:|:------:|
| Live investor dashboard | DEMO | YES | YES | YES | NO | YES | YES |
| Multi-company portfolio | CONFIG | YES | YES | YES | YES | YES | YES |
| Data room / VDR | DEMO | NO | NO | YES | NO | NO | NO |
| Engagement analytics | DEMO | NO | PARTIAL | YES | NO | NO | NO |
| AI readiness scoring | DEMO | NO | NO | NO | NO | NO | NO |
| Board pack generation | BUILT | YES | PARTIAL | YES | NO | YES | PARTIAL |
| Investor update emails | DEMO | YES | YES | PARTIAL | NO | YES | PARTIAL |
| Cap table management | DEMO | NO | BASIC | YES | NO | NO | NO |
| Due diligence workflow | NO | NO | NO | YES | NO | NO | NO |
| Fund analytics (IRR/MOIC) | NO | NO | YES | YES | NO | NO | NO |
| Benchmark comparisons | NO | YES | YES | YES | NO | YES | YES |
| KPI alerting | NO | YES | YES | NO | YES | YES | YES |
| AI narrative generation | BUILT | NO | NO | NO | NO | NO | NO |
| Interactive scenarios for investors | DEMO | NO | NO | NO | YES | NO | NO |

**Legend:** YES = production-ready, BUILT = functional with real data pathway, DEMO = UI exists with hardcoded data, CONFIG = configuration exists but no UI, PARTIAL = limited implementation, NO = not present.

---

## 4. Gap Analysis

| ID | Gap | Severity | Description |
|----|-----|----------|-------------|
| GAP-1 | All investor pages use hardcoded demo data | CRITICAL | None of the 7 investor-facing pages connect to real Supabase/Xero data. The entire section is a static prototype. No API routes, no data fetching (except investment-readiness component which has a fetch with fallback to demo). |
| GAP-2 | No database tables for investor-specific entities | CRITICAL | No tables exist for: investors (contacts), data rooms, investor engagements, cap table entries, document shares, or investor update delivery. The only schema support is the `report_type` enum including 'investor_update'. |
| GAP-3 | No multi-company portfolio view | HIGH | The investor persona config references `portfolio-overview` as default dashboard but this template does not exist. Visible.vc and Carta both treat portfolio view as the core investor experience. |
| GAP-4 | No email delivery for investor updates | HIGH | The updates page has templates and tracking UI but no actual email sending infrastructure. Visible.vc and Fathom both have built-in email delivery. |
| GAP-5 | No cap table data model or calculations | HIGH | Cap table is a static bar with 5 hardcoded entries. Carta is the gold standard here. Advisory OS needs at minimum a functional cap table with equity round modelling to be credible to investors. |
| GAP-6 | No investor authentication/access control | HIGH | No mechanism for investors to log in and view their portal. No invite flow, no magic links, no read-only viewer roles. Carta and Visible.vc both have dedicated investor login experiences. |
| GAP-7 | No engagement tracking backend | MEDIUM | Analytics page shows rich engagement data (time spent, pages viewed, scenarios interacted) but no event collection, no analytics pipeline, no storage. |
| GAP-8 | No document upload/storage backend | MEDIUM | Document vault has upload UI but no actual file upload to Supabase Storage or S3. No versioning, no access control enforcement. |
| GAP-9 | No benchmark data for investor metrics | MEDIUM | Readiness check references competitive positioning but no industry benchmark dataset exists. Fathom, Visible.vc, and Mosaic all provide SaaS/industry benchmarks. |
| GAP-10 | No fund-level analytics (IRR, MOIC, TVPI) | MEDIUM | For LP/GP use cases, Advisory OS has zero fund performance metrics. Carta and Visible.vc both calculate fund-level returns. |
| GAP-11 | No scheduled/automated update delivery | LOW | Updates must be manually created and (notionally) sent. No recurring schedule, no auto-population from live data. |
| GAP-12 | No watermarking or NDA enforcement on shared docs | LOW | Data room lacks watermarking, NDA acceptance gates, or download tracking -- features Carta provides for VDR. |
| GAP-13 | Investor Relations Agent has no execution logic | LOW | Agent is registered in the agent registry with capabilities listed but no prompt chains, no tool bindings, no API routes to support its declared features. |
| GAP-14 | No Q&A / due diligence workflow | LOW | No structured Q&A between investor and company. Carta provides this as part of their DD product. |

---

## 5. Prioritised Recommendations

### P0 -- Must Build (blocking credibility as investor-facing product)

| # | Recommendation | Addresses Gap | Effort Est. |
|---|---------------|---------------|-------------|
| P0-1 | **Wire investor dashboard to real data.** Connect the KPI cards (ARR, MRR, Burn, Runway) to the existing Xero data pipeline and KPI engine. The calculation logic already exists in `src/lib/financial/`. | GAP-1 | 1 sprint |
| P0-2 | **Create investor-specific database tables.** At minimum: `investors` (contact records), `investor_updates` (sent communications), `data_rooms` (room configs), `data_room_items` (item inclusions/permissions), `cap_table_entries`. All with `org_id` and RLS. | GAP-2 | 1 sprint |
| P0-3 | **Build investor access/authentication.** Implement invite-by-email flow with magic link login for investors. Create a read-only viewer role with scoped access to shared data rooms and updates. | GAP-6 | 1-2 sprints |
| P0-4 | **Connect investor update delivery to email.** Per the Build vs Buy analysis, use a transactional email service (Resend/SendGrid). Wire the update templates to real financial data and send via email with open tracking. | GAP-4 | 1 sprint |

### P1 -- Should Build (competitive parity)

| # | Recommendation | Addresses Gap | Effort Est. |
|---|---------------|---------------|-------------|
| P1-1 | **Build functional cap table.** Create cap table data model with shareholders, share classes, rounds, and ESOP pools. Provide basic equity modelling (dilution preview on new round). Skip 409A/EMI valuations -- those are Carta's moat. | GAP-5 | 2 sprints |
| P1-2 | **Implement document storage backend.** Wire uploads to Supabase Storage with versioning, per-doc sharing controls, and access logging. Support the expiry dates already in the UI. | GAP-8 | 1 sprint |
| P1-3 | **Build engagement tracking pipeline.** Collect page views, time-on-page, scenario interactions, and document access events. Store in an events table and surface through the existing analytics UI. | GAP-7 | 1 sprint |
| P1-4 | **Build multi-company portfolio view.** Create the `portfolio-overview` dashboard template the investor persona already references. Show aggregated KPIs across multiple orgs with drill-down to individual companies. | GAP-3 | 2 sprints |
| P1-5 | **Activate the Investor Relations Agent.** Wire the registered agent to prompt chains for update drafting, cap table summary, and readiness assessment. The agent infrastructure exists in the agent registry. | GAP-13 | 1 sprint |

### P2 -- Nice to Have (differentiation)

| # | Recommendation | Addresses Gap | Effort Est. |
|---|---------------|---------------|-------------|
| P2-1 | **Add SaaS benchmark dataset.** Embed median benchmarks for common SaaS KPIs (by stage/ARR range) so the readiness check and investor metrics can show contextual comparisons. | GAP-9 | 0.5 sprint |
| P2-2 | **Build scheduled/recurring update delivery.** Allow founders to set a cadence (monthly/quarterly) and auto-populate updates from live data with AI draft generation. | GAP-11 | 1 sprint |
| P2-3 | **Add fund-level analytics.** For GP/LP users: calculate IRR, MOIC, TVPI, DPI across portfolio companies. This is a differentiator against FP&A tools but a table-stakes feature for Visible.vc competition. | GAP-10 | 2 sprints |
| P2-4 | **Add NDA/watermarking to data rooms.** Require NDA acceptance before document access; apply dynamic watermarks with viewer identity to PDFs. | GAP-12 | 1 sprint |
| P2-5 | **Build DD Q&A workflow.** Structured question/answer threads between investor and company with status tracking and audit trail. | GAP-14 | 1 sprint |

---

## 6. Architectural Concerns

| ID | Concern | Severity | Detail |
|----|---------|----------|--------|
| ARCH-1 | No investor auth boundary | HIGH | The current Supabase auth model has no concept of "external investor viewer." All users are full platform users. A lightweight viewer role with magic-link auth is needed. This is architecturally significant because it touches RLS policies on every investor-visible table. |
| ARCH-2 | No event collection infrastructure | MEDIUM | Engagement analytics requires a write-heavy event pipeline (page views, click events, time tracking). The current architecture has no client-side event collector, no batching strategy, no event table. Consider Supabase Realtime or a lightweight analytics service (per Build vs Buy). |
| ARCH-3 | Data room permission model not enforced | MEDIUM | The builder UI allows setting per-item permissions (view/interactive/downloadable/hidden) but there is no server-side enforcement layer. Permissions exist only as local React state. Need a permission resolution layer that sits between investor auth and data room content serving. |
| ARCH-4 | Cap table needs a proper financial model | MEDIUM | A cap table is not just a display -- it requires share class waterfall calculations, pro-rata rights, liquidation preferences, and dilution math. These are deterministic financial calculations that should live in `src/lib/financial/` with comprehensive tests, per the project's architecture rules. |
| ARCH-5 | Two parallel investor sections with unclear routing | LOW | There are two separate route groups: `/investors/` (dashboard, updates, documents) and `/investor-portal/` (rooms, builder, analytics, readiness). The sidebar only links to `/investors/`. The investor-portal section is orphaned from main navigation. These should be unified under a single routing structure. |
| ARCH-6 | No Supabase Storage integration | MEDIUM | Document vault references file uploads, versions, and sizes but there is no Supabase Storage bucket configuration, no upload API route, and no file serving middleware. This is foundational for both the document vault and data room features. |

---

## 7. Summary Lists

### BUILD (features that do not exist and need to be created)

1. Investor authentication with magic-link and read-only viewer role
2. Database tables for investors, data rooms, cap table, engagements, document shares
3. Multi-company portfolio dashboard view
4. Email delivery infrastructure for investor updates
5. Event collection pipeline for engagement analytics
6. File upload/storage backend (Supabase Storage)
7. Cap table data model with equity round calculations
8. SaaS benchmark dataset for readiness scoring
9. Fund-level analytics (IRR, MOIC, TVPI)
10. DD Q&A workflow

### FIX (features that exist but are broken or incomplete)

1. All 7 investor pages need to be wired from demo/hardcoded data to real Xero/Supabase data
2. Investor-portal section is orphaned from sidebar navigation -- needs to be integrated
3. Investor Relations Agent is registered but has no execution logic
4. Data room permissions exist in UI but have no server-side enforcement
5. Document vault upload UI has no backend
6. Portfolio-overview dashboard template is referenced by persona config but does not exist
7. AI readiness check has a simulated scan (setTimeout) instead of real AI analysis

### LEVERAGE (existing capabilities that can be extended for investor use)

1. **Board Pack PDF generation (Sprint 8)** -- already supports 7 themes and white-labelling; extend for investor-specific delivery
2. **Investor Update report template** -- well-structured 6-section template ready to wire to live data
3. **KPI Engine** -- existing calculations for ARR, MRR, burn, runway can directly power investor dashboard
4. **Persona system** -- investor persona with dedicated KPIs, communication style, and feature access already configured
5. **Claude API intelligence engine** -- AI narrative generation can power update drafting, readiness assessment, and engagement insights
6. **Scenario Engine (Sprint 5)** -- interactive scenarios already support investor-facing read-only mode per persona config
7. **Audit logging** -- existing immutable audit trail infrastructure can serve as document access logging for data rooms

### SKIP (features where the ROI does not justify the build)

1. **Full cap table management (Carta-level)** -- 409A/EMI valuations, complex waterfall calculations, equity plan administration. This is Carta's entire product. Build basic display + dilution preview only.
2. **Full VDR product (Carta-level)** -- NDA enforcement, Q&A workflows, dynamic watermarking at scale. Build a lightweight branded data room, not an enterprise VDR.
3. **Deal flow CRM** -- Visible.vc's investor pipeline is a CRM product. Advisory OS should focus on the portfolio company side, not investor deal management.
4. **LP reporting / fund administration** -- Fund-level accounting, capital calls, distributions. This is GP/LP software (Carta Fund Admin, Juniper Square). Out of scope.
5. **Investor CRM with relationship scoring** -- Building investor contact management competes with Affinity, Visible CRM. Link to existing CRMs via integration instead.

---

**Overall Assessment:** The Investor Portal has a well-designed UI prototype covering data rooms, engagement analytics, readiness scoring, document vaults, and investor communications. The UX patterns are thoughtful -- the room builder wizard, per-item permission model, and AI readiness check are genuinely differentiated concepts that competitors lack. However, the entire section is a static shell. Zero pages connect to real data, there are no database tables, no authentication for external investors, and no backend APIs. The path forward is clear: the P0 items (real data wiring, database schema, investor auth, email delivery) must ship before any of these pages can be shown to prospects. The good news is that the underlying infrastructure (KPI engine, report templates, board pack generation, persona system) is solid and ready to be extended into the investor context.