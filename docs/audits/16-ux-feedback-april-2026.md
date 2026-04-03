# UX Feedback Audit — April 2026

**Date:** 2026-04-03
**Source:** James Sesay direct feedback (9 items + 19 clarifying answers)
**Status:** Confirmed — Ready to Build
**Related Skills:** `data-visualization-design.md`, `fpa-ux-review.md`, `feature-benchmark-audit.md`

---

## Summary

James reviewed the live platform with Alonuko data and provided 9 feedback items covering drill-down, period context, widgets, AI search, visual design, graph builder, financial summary, and KPI/variance functionality. All items discussed and confirmed with specific decisions.

---

## Feedback Item 1: Revenue Growth Rate — Hover Insights + Daily Briefing

### Requirement
- Hovering any graph data point shows: **% change** + **AI-generated reason** + **drill-down link**
- **Centralized "Key Actions" page** — platform-wide daily briefing, sectioned by area

### Confirmed Decisions
- AI explanation generated **live on hover** (~200 tokens via Haiku), not pre-cached — ensures accuracy after assumption/data changes
- Key Actions page is a **daily briefing** covering entire platform (Revenue, Cash, Costs, Risk sections)
- Every insight links back to source data, graph, or transaction
- Infographics = **combination** of data visualisations (sparklines, mini charts) AND illustrative elements (icons, visual metaphors)

### Competitor Pattern
- DataRails: AI Finance Agents surface contextual insights
- Runway: Ambient intelligence — insights surface automatically
- Fathom: AI Commentary launched March 2026

### Implementation Notes
- Live hover → Claude API call with context (metric, period, org data, recent changes)
- Debounce hover (300ms) to avoid excessive API calls
- Cache response for same metric+period combination within session
- Key Actions page: aggregate all AI insights generated during last sync + any triggered alerts

### Priority: P1 (hover) / P2 (Key Actions page)

---

## Feedback Item 2: Drill-Down Missing Across All Pages

### Requirement
- Every financial number on every page should be clickable → drill-down to source
- Goes all the way to **Xero transaction level** (not just account totals)
- **"Challenge/Question" button** on each page — subtle flag icon in header
- Challenges roll up to one consolidated message to accountant or developer (user picks)
- Must be slick, not overwhelming

### Confirmed Decisions
- Universal `<DrillDown>` component wrapping all financial numbers
- 3-level drill: Account breakdown → Monthly per account → Individual Xero transactions
- Challenge Panel: one per page, slide-out, badge shows open count
- Review Queue: single page aggregating all challenges across platform
- Send as one message to chosen recipient type

### Competitor Pattern
- DataRails: 3-level progressive disclosure with slide-over panel
- Fathom: 3 levels deep
- Vena: Cell-level audit trail (adapted for non-spreadsheet UX)

### Implementation Notes
- `DrillableNumber` shared component: wraps any formatted number with click handler
- Slide-out `DrillDownPanel` component with breadcrumb navigation
- Challenge data stored in `number_challenges` table (org_id, page, metric_key, user_note, recipient_type, status, resolution)
- Review Queue page at `/dashboard/review-queue`

### Priority: P1 (drill-down) / P2 (challenge panel)

---

## Feedback Item 3: Period Context Missing

### Requirement
- Clear period selection across all pages
- Global selector in header affects entire page
- Comparison periods: vs prior period AND vs same period last year

### Confirmed Decisions
- **Global period selector** — one component in dashboard header, all sections respond
- Supports: Monthly / Quarterly / Annual views
- **Comparison mode**: Both "vs prior period" and "vs same period last year" simultaneously
- FY dates from Xero org config displayed persistently

### Competitor Pattern
- Fathom: Persistent period selector in header, everything responds
- DataRails: Dashboard-level filter applies to all widgets
- Jirav: Comparison periods built in

### Implementation Notes
- Enhance existing `period-selector.tsx` → move to global layout header
- Period context via React Context provider → all child components consume
- Comparison data fetched alongside primary data (2-3 parallel queries)
- Period label always visible: "March 2026 | FY: Apr 2025 – Mar 2026"

### Priority: P1

---

## Feedback Item 4: Dashboard Widgets — Only 5, Need 10-15+

### Requirement
- Expand from 5 to 10-15+ widgets
- Organize into meaningful categories
- Template system: starting points → customise → save → switch/delete/add
- Template selection UI must look visual/infographic (not a plain list)

### Confirmed Decisions
- Widget categories designed by Claude (Finance, Revenue, Cash, Profitability, Operational, Investor, UK-specific)
- Templates = **starting points** that can be customised after applying
- Users can save custom configurations, switch between saved views, delete views
- Selection UI: visual preview cards with miniature layout preview per template
- Categories as horizontal pill tabs

### Widget Taxonomy (Proposed)

**Finance Core:**
| # | Widget | Visualization |
|---|--------|--------------|
| 1 | Revenue Trend | Line chart |
| 2 | P&L Summary | Waterfall chart |
| 3 | Cash Position | Area chart |
| 4 | Expense Breakdown | Horizontal bar |
| 5 | Gross Margin Trend | Line + threshold band |
| 6 | Net Profit Trend | Line chart |
| 7 | Working Capital | Bullet graph |

**Cash & Receivables:**
| # | Widget | Visualization |
|---|--------|--------------|
| 8 | Accounts Receivable Ageing | Stacked bar |
| 9 | Accounts Payable Ageing | Stacked bar |
| 10 | Cash Burn Rate | Line + threshold |
| 11 | Runway (months) | Bullet graph |

**KPI & Performance:**
| # | Widget | Visualization |
|---|--------|--------------|
| 12 | KPI Gauges (bullet graphs) | Bullet graph grid |
| 13 | Revenue vs Forecast | Grouped bar |
| 14 | Top 5 Expense Categories | Horizontal bar |
| 15 | Revenue Growth Rate | Line + % labels |

**Operational:**
| # | Widget | Visualization |
|---|--------|--------------|
| 16 | Headcount Cost Trend | Stacked area |
| 17 | Revenue per Employee | Line chart |

**UK-Specific:**
| # | Widget | Visualization |
|---|--------|--------------|
| 18 | VAT Liability Tracker | Bullet graph |
| 19 | Corporation Tax Estimate | KPI card |

**Templates:**
- **CFO View:** P&L Summary, Gross Margin, Cash Position, AR/AP Ageing, Working Capital, KPI Gauges
- **Founder View:** Revenue Trend, Cash Burn, Runway, Top Expenses, Revenue Growth, Net Profit
- **Investor View:** Revenue vs Forecast, Gross Margin, Burn Rate, Runway, Revenue Growth, KPIs
- **Advisor View:** All KPIs, Variance Panel, P&L Summary, Cash Position, Working Capital

### Priority: P3

---

## Feedback Item 5: AI-Powered Search / Universal Command Bar

### Requirement
- Natural language widget/chart creation: "Show me monthly revenue by customer"
- Available **anywhere** on the platform, not just dashboard
- Universal command bar (CMD+K / Spotlight style) from any page

### Confirmed Decisions
- Platform-wide universal command bar
- Works from any page via keyboard shortcut (CMD+K)
- NL → data query → chart/table rendering → save as widget option
- Comes AFTER drill-down and period context (P4)

### Competitor Pattern
- Runway: Plain-English formulas (killer feature)
- Cube: AI Analyst
- DataRails: AI Planning Agent

### Implementation Notes
- Claude API interprets NL query → generates SQL-safe data request + chart config
- Platform fetches data, renders via governed chart slot
- Save result as permanent widget or one-off view
- Command palette component with search history and suggestions

### Priority: P4

---

## Feedback Item 6: KPI Alerts + Platform-Wide Visual Character

### Requirement
- Alerts pages need more visual character (infographics, icons, sparklines, color)
- Apply visual upgrade to ALL pages that are too text-heavy
- Make data visualization quality a permanent skill

### Confirmed Decisions
- Applies to **both** alert management page AND triggered alert displays
- Extends to ALL pages — this is a platform-wide visual standard
- Created `data-visualization-design.md` skill as permanent reference
- Each alert: icon + metric name + sparkline + threshold gauge + severity badge
- When alert triggers: mini explanation card with AI-generated reason

### Visualization Book Research Applied
- **Tufte:** Sparklines inline with every metric (word-sized, data-dense)
- **Few:** Bullet graphs replace any gauge; conditional color only for exceptions
- **Knaflic:** Grey base + one accent color for what needs attention
- **Ware:** Max 5-6 distinct hues; redundant coding (color + icon + label)
- **Wilke:** Proportional ink; monotonic color scales for heatmaps
- **McCandless:** Visual craft builds credibility; data + story + goal + form
- **Atlas/Cheshire:** Annotation quality; editorial-grade typography

### Priority: P3 (alerts) / Ongoing (visual standard)

---

## Feedback Item 7: Graph Builder Issues

### Requirement
- Pie chart didn't generate when asked
- Numbers show `60000` not `£60,000`
- No drill-down on hover for chart data points

### Confirmed Decisions
- Fix AI → chart type mapping pipeline
- Create single `formatCurrency()` utility respecting **org base currency from Xero config**
- Apply formatting globally across all charts, tables, cards
- Chart hover drill-down = same universal drill-down from Item 2
- No unnecessary decimals: `£60,000` not `£60,000.00`
- Negative formatting: `(£5,200)` or `−£5,200` with red + icon

### Number Format Standard
```
Whole amounts:     £60,000
With pence:        £60,000.50 (only when decimal part exists)
Percentages:       42.3% (one decimal max)
Negative:          (£5,200) with red color
Large numbers:     £2.4M (abbreviate above £1M on cards, full on tables)
```

### Priority: P0 (formatting) / P1 (drill-down) / P2 (pie chart fix)

---

## Feedback Item 8: Financial Summary → Executive Summary Redesign

### Requirement
- Replace Financial Summary with "Executive Summary"
- Must be presentable for founders who aren't accountants
- Use correct financial terminology with tooltip explanations on hover
- No toggle between plain/technical — one clean mode

### Confirmed Decisions
- **Replace** current Financial Summary page → rename to "Executive Summary"
- Primary audience: Founders (but should appeal to advisors/investors naturally)
- Correct terminology (e.g. "Gross Margin" not "Money Left After Costs") with hover tooltips giving plain-English explanation
- Single mode, no toggle (toggles are confusing)
- Always show comparison: vs last month + vs same month last year

### Design
1. AI narrative lead (3-4 sentences, founder-tone, from Claude API)
2. Visual P&L waterfall (revenue → costs → profit)
3. 4-5 KPI bullet graphs with traffic-light status
4. Comparison context embedded (not separate section)
5. Financial terminology + hover tooltips for definitions

### Competitor Pattern
- FinStory: Narrative-first financial storytelling
- Fathom: Clean executive summary with KPI traffic lights

### Priority: P2

---

## Feedback Item 9: KPIs/Variance Non-Functional + BS/CF Lack Detail

### Requirement
- KPI sections look good but nothing works (clicks do nothing)
- Variance sections display but no drill-through
- Balance Sheet and Cash Flow lack detail vs Income Statement
- Need drill-downs and cross-page linking throughout
- Cross-page links should be **in-page navigation** (scroll to section, not full page redirect)

### Confirmed Decisions
- Wire up KPI card click handlers → navigate to KPI detail page (trend chart + breakdown)
- Variance click → drill-down panel showing which accounts drove the change
- Balance Sheet: add same line-item detail as income statement (expandable sections, account-level, period comparison)
- Cash Flow: add operating/investing/financing breakdown with expandable items
- Cross-page linking via **in-page navigation** (smooth scroll to section within current page)
- Where cross-reference targets another page: slide-out panel or anchor scroll, keep user in context

### Implementation Notes
- `<InPageLink target="section-id">` component for cross-references
- Balance sheet and cash flow pages need data parity with income statement
- `ensureBalanceSheetData()` already fetches BS data; need to display it with same detail level

### Priority: P2 (KPI/Variance wiring) / P2 (BS/CF detail) / P2 (cross-page linking)

---

## Additional Confirmed Decisions (Points 14-19)

### 14. Currency from Org Config
- All formatting respects org's base currency from Xero config
- Alonuko = GBP (£), but system supports USD ($), EUR (€), etc.
- `formatCurrency(amount, orgCurrency)` utility function

### 15. Primary Audience = Founders
- Design for founders first
- But must naturally appeal to advisors and investors
- Don't dumb down — explain with tooltips

### 16. No Plain/Technical Toggle
- One clean presentation mode
- Proper financial terminology throughout
- Hover tooltips provide plain-English definitions

### 17. Executive Summary (Not Financial Summary)
- Page renamed from "Financial Summary" to "Executive Summary"
- Route: `/dashboard/executive-summary`

### 18. In-Page Navigation for Cross-Links
- Smooth scroll to relevant section
- Keeps user in context (no disorienting page jumps)
- Slide-out panels for cross-page data

### 19. Number Override / Challenge Mechanism
- Per-page "Challenge" button (flag icon in page header)
- Opens slide-out panel listing key figures on that page
- User selects figure → types question/correction → tags recipient
- Not on every number — per page, subtle, slick
- All challenges aggregate in Review Queue
- Creates audit trail (who challenged, when, resolution)

---

## Implementation Priority (Confirmed)

| Priority | Items | Effort |
|----------|-------|--------|
| **P0** | Number formatting (`formatCurrency` global utility, respect org currency) | 1 day |
| **P1** | Global period selector (header, all pages respond, comparison periods) | 2 days |
| **P1** | Universal drill-down component (3-level, to Xero transactions) | 3 days |
| **P2** | KPI/Variance wiring (make clicks work, connect to drill-down) | 2 days |
| **P2** | Balance Sheet + Cash Flow detail parity with Income Statement | 2 days |
| **P2** | Executive Summary redesign (replace Financial Summary) | 2 days |
| **P2** | Challenge Panel + Review Queue | 2 days |
| **P2** | Cross-page in-page navigation | 1 day |
| **P3** | Widget expansion (19 widgets + 4 templates + visual selection UI) | 3 days |
| **P3** | KPI Alerts visual upgrade (icons, sparklines, bullet graphs, AI reasons) | 2 days |
| **P3** | Graph builder fixes (pie chart, formatting, hover drill-down) | 1 day |
| **P3** | Platform-wide visual character upgrade (apply viz skill to all pages) | 3 days |
| **P4** | Universal command bar (CMD+K, NL → chart/query) | 4 days |
| **P4** | Key Actions daily briefing page | 3 days |

**Estimated total: ~31 days of focused build across P0-P4**

---

## Files Affected (Cross-Reference)

### New Files to Create
- `src/lib/formatting/currency.ts` — formatCurrency, formatPercent, formatNumber utilities
- `src/components/shared/drillable-number.tsx` — universal clickable number wrapper
- `src/components/shared/drill-down-panel.tsx` — 3-level slide-out drill-down
- `src/components/shared/challenge-panel.tsx` — per-page number challenge UI
- `src/components/shared/in-page-link.tsx` — smooth scroll cross-reference
- `src/components/shared/bullet-graph.tsx` — Few-style KPI-vs-target
- `src/components/layout/command-palette.tsx` — CMD+K universal search
- `src/app/(dashboard)/dashboard/review-queue/page.tsx` — Challenge Review Queue
- `src/app/(dashboard)/dashboard/key-actions/page.tsx` — Daily Briefing
- `src/app/(dashboard)/dashboard/executive-summary/page.tsx` — Redesigned summary

### Existing Files to Modify
- `src/components/dashboard/period-selector.tsx` — upgrade to global context provider
- `src/components/dashboard/kpi-cards.tsx` — add click handlers, bullet graphs
- `src/components/dashboard/variance-panel.tsx` — add drill-through
- `src/components/dashboard/narrative-summary.tsx` — upgrade for Executive Summary
- `src/app/(dashboard)/dashboard/widgets/widgets-client.tsx` — expand to 19 widgets + templates
- `src/app/(dashboard)/dashboard/alerts/page.tsx` — visual upgrade
- `src/app/(dashboard)/financials/balance-sheet/page.tsx` — detail parity
- `src/app/(dashboard)/financials/cash-flow/page.tsx` — detail parity
- `src/app/(dashboard)/graphs/graph-studio-client.tsx` — fix pie chart, apply formatting
- All chart/table components — apply formatCurrency globally

### Database Changes
- `number_challenges` table (org_id, page, metric_key, user_note, recipient_type, status, resolution, created_by, resolved_by, created_at, resolved_at)
- `dashboard_widget_configs` table (org_id, user_id, template_name, widget_config JSONB, is_active)
- `daily_briefing_cache` table (org_id, generated_at, sections JSONB, expires_at)
