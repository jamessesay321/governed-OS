# Feature Benchmark Audit: Dashboard & Widgets
## Advisory OS — Section 1 of 15
**Date:** 2026-04-01 | **Status:** Complete | **Auditor:** Claude Code

---

## Feature Inventory

| # | Feature | Type | Current State |
|---|---------|------|---------------|
| 1 | Revenue KPI Card | Data display | Working |
| 2 | Gross Margin KPI Card | Data display | Working |
| 3 | Expenses KPI Card | Data display | Working |
| 4 | Net Profit KPI Card | Data display | Working |
| 5 | AI Narrative Summary | AI output | Working |
| 6 | Financial Health Score Widget | Data display | Working |
| 7 | Data Health Widget | Data display | Working |
| 8 | Connected Accounts Widget | Integration status | Working |
| 9 | Waterfall Chart | Visualization | Working |
| 10 | Period Selector / Filter | User action | Working |
| 11 | Dashboard Layout / Grid | Navigation | Working |
| 12 | Drill-Down from KPI to Detail | Navigation | Partial |
| 13 | Widget Customisation / Reorder | User action | Partial |
| 14 | Trend Sparklines on Cards | Visualization | Working |
| 15 | Variance Colour Coding | Data display | Working |
| 16 | Data Freshness Indicator | Governance | Working |
| 17 | Proposal Widget | Workflow | Working |
| 18 | Roadmap Widget | Data display | Working |
| 19 | Marketing Widgets | Data display | Working |
| 20 | Operations/Projects Widgets | Data display | Working |

---

## Benchmark Tables

### 1. Revenue KPI Card

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Displays total revenue for the selected period with trend indicator (up/down/flat) and previous period comparison |
| **What it's trying to achieve** | Instant "how much did we earn" answer in < 1 second |
| **Who needs it** | All — business owner, advisor, investor |
| **Best in class** | **Fathom HQ** — KPI card shows: current value, target value, variance from target as %, traffic-light colour (green/amber/red based on configurable thresholds), 12-month sparkline, one-sentence AI commentary. Clicking drills into full trend view with budget/forecast/prior year overlays. The traffic light means a plumber knows instantly if revenue is good or bad without reading numbers. |
| **How they achieved it** | Pre-computed KPI engine runs on sync. Thresholds stored per-metric. Sparkline is a lightweight SVG. Traffic light determined by: >5% over target = green, within 5% = amber, >5% under = red. Materiality bands are configurable per metric. |
| **Runner up** | **DataRails** — Similar card but click-through reveals a variance drill-down panel with breakdown by department/account/entity. More analytical depth but less instant clarity for non-finance users. |
| **Current Advisory OS state** | **Working** — `kpi-cards.tsx` renders Revenue with TrendIcon (TrendingUp/Down/Minus), colour-coded by direction, SourceBadge showing "actual", previous period comparison. Missing: traffic-light thresholds, AI commentary on card, sparkline history. |
| **AI opportunity** | Medium — AI can generate the one-sentence commentary ("Revenue up 12% — strongest month since October, driven by project completions"). Pre-cache on sync, ~200 tokens, Haiku-viable. |
| **Non-finance user test** | **3/5** — Shows the number and direction but doesn't tell the user if it's *good* or *bad*. A plumber sees "£142,000 ↑ 8%" but doesn't know if 8% is impressive or disappointing without context. Traffic-light system would make this 5/5. |
| **Claude Finance alternative** | Claude with Xero data can compute revenue and provide richer commentary, but can't do it in < 1 second at a glance. The card format wins for dashboard-level scanning. Claude wins for follow-up questions. |
| **Leverage existing tools?** | Xero shows revenue on its own dashboard but with no trend/comparison. Not sufficient. |
| **Token efficiency** | ~200 tokens for AI commentary × once per sync × fully cacheable = negligible cost. Use Haiku. |
| **Build recommendation** | **BUILD** — Enhance existing card with Fathom-style traffic-light thresholds and AI micro-commentary |
| **Priority** | **P0** — Demo-critical. This is the first thing anyone sees. |
| **Defensibility** | Medium — the card itself isn't defensible, but threshold configuration + audit trail of who set targets adds governance moat. |

---

### 2. Gross Margin KPI Card

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Displays gross margin percentage with trend indicator |
| **What it's trying to achieve** | "Am I making enough on each pound of revenue before overheads?" |
| **Who needs it** | All — but especially business owner and advisor |
| **Best in class** | **Fathom HQ** — Same traffic-light pattern as revenue. The key mechanism: Fathom pre-sets a default threshold for gross margin based on industry benchmarks. A retail business gets different amber/red bands than a professional services firm. This means the card is useful from day 1 without manual configuration. |
| **How they achieved it** | Industry benchmark database (10+ sectors). On connect, Fathom classifies the business and applies sector-appropriate defaults. User can override. |
| **Runner up** | **Mosaic** — Real-time margin tracking with automated alerts when margin drops below a configured floor. More operational-focused. |
| **Current Advisory OS state** | **Working** — Gross Margin card exists in `kpi-cards.tsx`. Missing: industry benchmarks for context, threshold-based colouring. |
| **AI opportunity** | High — AI can explain *why* margin changed: "Gross margin dropped 3pp because subcontractor costs doubled in March" using semantic P&L categories. ~300 tokens, Haiku-viable. |
| **Non-finance user test** | **2/5** — "Gross Margin 42.3% ↑ 1.2%" means nothing to a plumber. Needs: "Your profit on jobs is healthy — you're keeping 42p of every pound before paying rent and wages." |
| **Claude Finance alternative** | Claude explains margin far better conversationally but can't provide at-a-glance dashboard scanning. |
| **Leverage existing tools?** | No — Xero doesn't calculate gross margin natively. |
| **Token efficiency** | ~300 tokens × once per sync × cacheable = negligible |
| **Build recommendation** | **BUILD** — Enhance with plain-English subtitle, traffic-light, industry benchmark context |
| **Priority** | **P0** — Demo-critical |
| **Defensibility** | Medium-High — Semantic P&L taxonomy makes our margin calculation more accurate than competitors using Xero's 4 account classes. The 25-category taxonomy is a defensible layer. |

---

### 3. Expenses KPI Card

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Shows total operating expenses with trend |
| **What it's trying to achieve** | "Am I spending more or less than before?" |
| **Who needs it** | All |
| **Best in class** | **DataRails** — Expense card is clickable → reveals breakdown by category with variance from budget. Each category row is itself clickable → drill to individual transactions. The mechanism is progressive disclosure: summary → categories → transactions, all without leaving the dashboard (slide-over panel). |
| **How they achieved it** | Widget-based architecture where each widget has a defined drill-down chain. Drill-down panel slides from right, preserving dashboard context in background. |
| **Runner up** | **Fathom** — Traffic-light + expense-to-revenue ratio prominently displayed alongside absolute number. |
| **Current Advisory OS state** | **Working** — Card shows total with trend. Missing: drill-down to category breakdown, expense-to-revenue ratio, budget comparison. |
| **AI opportunity** | High — AI can flag the biggest expense change: "Expenses up £8k — mostly from the new software subscriptions (£5.2k) you started in February." Requires semantic categories. ~250 tokens. |
| **Non-finance user test** | **3/5** — Everyone understands "you spent £X" but without breakdown or context it's just a number. |
| **Claude Finance alternative** | Claude provides better expense analysis conversationally but can't replace the at-a-glance card. |
| **Leverage existing tools?** | No |
| **Token efficiency** | ~250 tokens × once per sync × cacheable |
| **Build recommendation** | **BUILD** — Add DataRails-style click-to-drill breakdown using semantic P&L categories |
| **Priority** | **P0** |
| **Defensibility** | Medium — drill-down using 25-category semantic taxonomy is better than Xero's 4-class grouping. |

---

### 4. Net Profit KPI Card

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Shows net profit with trend |
| **What it's trying to achieve** | "How much did I actually make?" — the bottom line |
| **Who needs it** | All |
| **Best in class** | **Fathom** — Net profit card includes: absolute value, margin %, trend sparkline, traffic light against target, and a conditional commentary that changes based on whether it's positive/negative: "Net profit margin of 8.3% is below your 12% target — driven by increased staff costs." |
| **How they achieved it** | Conditional commentary rules: if metric < target by > materiality threshold, show negative commentary template populated with top driver. |
| **Runner up** | **Runway** — Profit displayed with scenario comparison: "Actual: £24k vs Plan: £31k (−£7k)" so the user always sees the gap. |
| **Current Advisory OS state** | **Working** — Shows net profit + trend. Missing: margin %, target comparison, conditional commentary. |
| **AI opportunity** | High — This is the card most improved by AI commentary. Non-finance users need "You made £24k this month, which is £7k less than you planned. The main reason was..." |
| **Non-finance user test** | **4/5** — Everyone understands profit. But without target context, they don't know if it's good. |
| **Claude Finance alternative** | Claude wins for depth of explanation. The card wins for speed. Best approach: card + expandable AI reasoning. |
| **Leverage existing tools?** | No |
| **Token efficiency** | ~300 tokens × once per sync × cacheable |
| **Build recommendation** | **BUILD** — Enhance with target comparison + AI micro-commentary |
| **Priority** | **P0** |
| **Defensibility** | Medium — AI commentary quality scales with company skill context (governance moat). |

---

### 5. AI Narrative Summary

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Claude API generates a 2-4 sentence narrative summary of the current period's financial performance, displayed at the top of the dashboard |
| **What it's trying to achieve** | "Tell me what happened in plain English before I look at any numbers" |
| **Who needs it** | All — this is the #1 feature for non-finance users |
| **Best in class** | **Fathom HQ** — AI Commentary uses a "shaped by goals, strategy, market conditions" approach. Every insight references specific numbers and is traceable. The commentary adapts to the user's role (advisor sees different emphasis than owner). PhD ML team red-teams for hallucination reduction. |
| **How they achieved it** | Multi-prompt pipeline: (1) extract key metrics (2) identify significant changes (3) generate role-appropriate narrative (4) validate numbers against source. Each output includes data lineage. |
| **Runner up** | **DataRails Storyboards** — 2-click AI storytelling that transforms data into narrative presentations. Goes beyond dashboard summary into full slide-deck narratives with supporting charts auto-selected. |
| **Current Advisory OS state** | **Working** — `/api/narrative/[orgId]` calls Claude with P&L data + company skill context. Returns narrative + reasoning + confidence. Uses semantic P&L when mappings exist. Temperature 0.3 for consistency. This is already competitive with Fathom. |
| **AI opportunity** | This IS the AI feature. The opportunity is in quality improvement: use semantic categories for richer context, reference specific accounts by name, include budget variance when available. |
| **Non-finance user test** | **5/5** — Plain English summary is the most accessible feature on the platform. |
| **Claude Finance alternative** | Claude Finance can produce equivalent narratives but requires manual data upload each time. Advisory OS auto-generates on sync — this is the governance automation advantage. |
| **Leverage existing tools?** | No — this is core platform value. |
| **Token efficiency** | ~1500 tokens (input) + ~500 tokens (output) = ~2000 tokens per narrative × once per sync × fully cacheable for 24h = ~£0.003/narrative. Use Sonnet for quality. |
| **Build recommendation** | **BUILD** — Already strong. Enhance with budget variance inclusion, role-based emphasis, traceable number references. |
| **Priority** | **P0** — This is the hero feature. |
| **Defensibility** | **High** — Company skill context (from onboarding interview + semantic mapping + tracking categories) means Advisory OS narratives are better than any competitor because we know more about the business. This compounds over time. |

---

### 6. Financial Health Score Widget

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Displays an overall financial health score (0-100) with category breakdown and alerts |
| **What it's trying to achieve** | Single number that answers "is my business financially healthy?" |
| **Who needs it** | Business owner primarily, advisor for portfolio triage |
| **Best in class** | **Fathom** — Uses a multi-dimensional scoring system across profitability, efficiency, liquidity, and leverage. Each dimension gets a traffic-light. The aggregate is a composite score with clear drill-path: score → dimension → KPI → trend → transactions. |
| **How they achieved it** | Weighted scoring model: profitability (40%), liquidity (25%), efficiency (20%), leverage (15%). Each sub-score is a function of 3-5 KPIs normalized against industry benchmarks. |
| **Runner up** | **Mosaic** — "Business state" summary auto-generated for board materials. Less visual but more context-rich. |
| **Current Advisory OS state** | **Working** — `health-check.ts` produces an overallScore (0-100), metrics array with status/trend, alerts with recommendations, and AI summary. Already strong. |
| **AI opportunity** | High — AI can make the score meaningful: "Your health score dropped from 74 to 68 this month because your debtor days increased. If the outstanding £23k invoice from Acme Ltd pays, you'll be back to 75." |
| **Non-finance user test** | **4/5** — Everyone understands a score out of 100. Would be 5/5 with traffic-light and plain-English "what to do about it" recommendation. |
| **Claude Finance alternative** | Claude can compute a health score but the automated weekly tracking + trend over time is what makes the dashboard widget valuable. |
| **Leverage existing tools?** | No |
| **Token efficiency** | ~2000 tokens × weekly recalculation × cacheable = minimal |
| **Build recommendation** | **BUILD** — Enhance with trend over time, traffic-light per dimension, actionable recommendations |
| **Priority** | **P1** — Strong feature but not the first thing shown on dashboard |
| **Defensibility** | **High** — Health score incorporating semantic categories, tracking dimensions, and business context from interview = deeply personalised. Competitors can't replicate without the same data depth. |

---

### 7. Data Health Widget

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Shows data quality metrics: last sync time, missing accounts, unconfirmed mappings, stale data warnings |
| **What it's trying to achieve** | "Can I trust the numbers on this dashboard?" |
| **Who needs it** | Advisor primarily, power-user business owner |
| **Best in class** | **DataRails** — Validation dashboard is a dedicated view showing data reconciliation status, missing periods, and sync failures. Each issue has a suggested fix. The mechanism: every data pull runs a validation pipeline (schema check → completeness check → reconciliation → anomaly flag). Issues are surfaced as a badge count on the dashboard. |
| **How they achieved it** | Post-sync validation pipeline with configurable rules. Results stored in a validation_results table. Badge count = unresolved issues. |
| **Runner up** | **Vena** — Cell-level audit trail showing exactly when every number last changed and from which source. |
| **Current Advisory OS state** | **Working** — `data-health-widget.tsx` exists. `context-freshness` in company skill tracks lastSyncAt, stale reasons. Data health checks run during sync. |
| **AI opportunity** | Low — This is a deterministic feature. AI adds no value to "your data is 3 hours old." |
| **Non-finance user test** | **3/5** — Technical users appreciate it. Most business owners don't think about data freshness. Should be ambient (small indicator) not a full widget. |
| **Claude Finance alternative** | No — Claude has no concept of data freshness. |
| **Leverage existing tools?** | No |
| **Token efficiency** | Zero tokens — fully deterministic |
| **Build recommendation** | **BUILD** — Keep as ambient indicator (badge/icon), not a prominent widget. Move to settings for details. |
| **Priority** | **P2** — Important for governance, not for demo |
| **Defensibility** | **High** — This IS the governance moat. No competitor except DataRails/Vena takes data quality this seriously. |

---

### 8. Connected Accounts Widget

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Shows which integrations are connected (Xero), their sync status, and connection health |
| **What it's trying to achieve** | "Is my data flowing?" |
| **Who needs it** | Admin/setup users |
| **Best in class** | **Cube** — Clean integration status page showing connected sources, last sync, row counts, and a "health" indicator per connection. Not on the main dashboard — lives in settings. |
| **How they achieved it** | Dedicated integrations page with polling-based status checks. |
| **Runner up** | **Fathom** — Integration status shown during onboarding, then tucked away. Only surfaces on error. |
| **Current Advisory OS state** | **Working** — `connected-accounts-widget.tsx` shows integration status on dashboard. |
| **AI opportunity** | None |
| **Non-finance user test** | **2/5** — Confusing for non-technical users. Should only surface when there's a problem. |
| **Claude Finance alternative** | No |
| **Leverage existing tools?** | No |
| **Token efficiency** | Zero tokens |
| **Build recommendation** | **LEVERAGE** — Move to settings/admin. On dashboard, show only when disconnected (error state). |
| **Priority** | **P3** — Not demo material |
| **Defensibility** | Low — commoditised pattern |

---

### 9. Waterfall Chart

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Revenue-to-profit waterfall visualization showing how revenue flows through cost categories to net profit |
| **What it's trying to achieve** | "Where does my money go?" — the visual P&L |
| **Who needs it** | All — incredibly effective for non-finance users |
| **Best in class** | **DataRails** — Waterfall chart is interactive: hover reveals absolute value + % of revenue. Click any bar → drill to underlying accounts. Bars are colour-coded: green for revenue/positive, red for costs/negative, blue for subtotals (gross profit, net profit). The key mechanism: it renders the same data as the P&L but in a visual format that tells a story. |
| **How they achieved it** | Recharts-style waterfall with custom bar renderer. Click handler opens the same drill-down panel used by all other widgets. Consistent drill-down pattern across all visualizations. |
| **Runner up** | **Fathom** — Waterfall included in report builder as a drag-and-drop component. Less interactive on dashboard but beautifully rendered for PDF/board pack export. |
| **Current Advisory OS state** | **Working** — `waterfall-chart.tsx` exists. Basic rendering. Missing: interactivity, drill-down, semantic category labelling. |
| **AI opportunity** | Medium — AI can annotate: "Your biggest cost increase this month was employee costs (+£4.2k) due to the new hire starting in March." Overlay annotations on the chart. |
| **Non-finance user test** | **5/5** — A waterfall is the single most intuitive way to show "money in → money out → what's left." Even a plumber with no financial knowledge gets it immediately. |
| **Claude Finance alternative** | Claude can generate waterfall charts as artifacts, but they're static images. Advisory OS's interactive drill-down waterfall is clearly better for ongoing use. |
| **Leverage existing tools?** | No |
| **Token efficiency** | Zero tokens for the chart itself. ~200 tokens if adding AI annotations. |
| **Build recommendation** | **BUILD** — Enhance with drill-down interactivity, semantic category labels, AI annotations. This is a hero visualization. |
| **Priority** | **P0** — Demo-critical. Best visual on the platform. |
| **Defensibility** | Medium — The chart itself isn't defensible. The drill-down to governed, audited transactions is. |

---

### 10. Period Selector / Filter

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Allows user to change the time period displayed across all dashboard widgets |
| **What it's trying to achieve** | "Show me last month / this quarter / custom range" |
| **Who needs it** | All |
| **Best in class** | **DataRails** — Aggregation toggle switches between monthly/quarterly/annual on the fly. All widgets update simultaneously. Pre-set shortcuts: This Month, Last Month, This Quarter, YTD, Last 12 Months. Custom range picker for ad-hoc. The key: it's a single control that governs the entire dashboard. |
| **How they achieved it** | Global dashboard context provider. Period change triggers re-render of all widgets via shared state. Period stored in URL params for shareability. |
| **Runner up** | **Runway** — Same pattern but adds "vs." comparison: "March 2026 vs. Budget" or "Q1 2026 vs. Q1 2025" — two dropdowns that set the comparison mode globally. |
| **Current Advisory OS state** | **Working** — Period selection exists. Missing: comparison mode ("vs. budget", "vs. prior year"), URL-based persistence. |
| **AI opportunity** | Low — Deterministic feature. |
| **Non-finance user test** | **4/5** — Date pickers are universally understood. Would be 5/5 with smart defaults ("showing your latest complete month"). |
| **Claude Finance alternative** | Claude handles temporal queries naturally ("how did March compare to February?") but a dashboard period selector is faster for visual scanning. |
| **Leverage existing tools?** | No |
| **Token efficiency** | Zero tokens |
| **Build recommendation** | **BUILD** — Add comparison mode (vs. budget, vs. prior year, vs. prior period) as a second dropdown |
| **Priority** | **P1** — Important but current implementation works for demo |
| **Defensibility** | Low — commoditised pattern |

---

### 11. Dashboard Layout / Grid

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Responsive grid layout organizing widgets across the dashboard page |
| **What it's trying to achieve** | Information hierarchy — most important metrics first, logical grouping |
| **Who needs it** | All |
| **Best in class** | **Mosaic** — Canvas-based layout where users drag widgets to any position, resize freely, and save custom layouts per role. Pre-built layouts for CEO, CFO, and board views. Auto-generates layout from selected KPIs during onboarding. |
| **How they achieved it** | Grid layout library (react-grid-layout or similar) with layout persistence in user preferences. Role-based default layouts. |
| **Runner up** | **DataRails** — Widget "warehouse" concept: pre-built widgets in a sidebar, drag onto dashboard. Dashboard is shareable as a link with the layout intact. |
| **Current Advisory OS state** | **Working** — Server component renders KPI cards + widgets in a fixed layout. Missing: drag-and-drop, custom layouts, role-based defaults. |
| **AI opportunity** | Medium — AI can suggest optimal layout based on business type: "For a services business, I'd recommend cash flow and debtor days prominently placed." |
| **Non-finance user test** | **3/5** — Fixed layout is fine for most users. Customisation adds complexity. |
| **Claude Finance alternative** | No — this is purely a UI concern. |
| **Leverage existing tools?** | No |
| **Token efficiency** | ~200 tokens for layout suggestion × once at onboarding × permanent cache |
| **Build recommendation** | **SKIP** for MVP — Fixed layout with good defaults is sufficient. Add customisation in Phase 2. |
| **Priority** | **P3** — Nice-to-have, not demo-critical |
| **Defensibility** | Low — every SaaS has dashboard layouts |

---

### 12. Drill-Down from KPI to Detail

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Clicking a KPI card navigates to a detailed view with trend history, breakdown, and transactions |
| **What it's trying to achieve** | "Why is this number what it is?" — the critical follow-up |
| **Who needs it** | All — this is the bridge between "scanning" and "understanding" |
| **Best in class** | **DataRails** — Three-level progressive drill: (1) Click KPI → slide-over panel with variance breakdown by dimension (2) Click dimension → account-level detail (3) Click account → individual transactions from source system. All without leaving the dashboard context. The key mechanism: the drill-down panel preserves the dashboard behind it (dimmed), so the user never loses context. |
| **How they achieved it** | Slide-over panel component with stacked navigation. Each level maintains a breadcrumb. Back button returns to previous level. Data fetched lazily on drill. |
| **Runner up** | **Fathom** — Click KPI card → full-page trend view with overlays (budget, forecast, prior year). Less progressive but deeper analysis on arrival. |
| **Current Advisory OS state** | **Partial** — Some navigation to detail pages exists (revenue, profitability, financial-health subpages). Missing: slide-over panel pattern, transaction-level drill-down to Xero source. |
| **AI opportunity** | High — At each drill level, AI can explain: Level 1: "Revenue is up because..." Level 2: "Project income is the main driver..." Level 3: "These 3 invoices from Acme Ltd account for 60% of the increase." |
| **Non-finance user test** | **4/5** — Click-to-explore is intuitive. The slide-over panel is better than page navigation because users don't lose dashboard context. |
| **Claude Finance alternative** | Claude excels at drill-down questions conversationally ("why is revenue up?" → "which clients?" → "show me those invoices"). But it requires asking. The click-to-drill UI is faster for visual explorers. |
| **Leverage existing tools?** | No |
| **Token efficiency** | ~500 tokens per AI explanation at each level × on-demand (not pre-cached) × ~3 levels = ~1500 tokens per full drill. Sonnet for quality. |
| **Build recommendation** | **BUILD** — This is the single most important UX pattern to implement. DataRails slide-over panel with AI explanation at each level. |
| **Priority** | **P0** — Demo-critical. "Click any number" is the Advisory OS promise. |
| **Defensibility** | **High** — Drill-down to governed, audited Xero transactions with AI explanation + audit trail = pure governance moat. |

---

### 13. Widget Customisation / Reorder

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Allow users to show/hide, reorder, and configure which widgets appear on their dashboard |
| **What it's trying to achieve** | "I want my dashboard to show what matters to ME" |
| **Who needs it** | Power users, advisors managing multiple clients |
| **Best in class** | **Mosaic** — Full drag-and-drop canvas. But most users never customise — Mosaic found that pre-built role-based layouts cover 80% of needs. |
| **How they achieved it** | react-grid-layout with layout persistence. Widget catalog with preview thumbnails. |
| **Runner up** | **DataRails** — Widget warehouse (sidebar of available widgets) + drag to dashboard. |
| **Current Advisory OS state** | **Partial** — `widgets/` page exists with a widget management interface. Not fully wired for drag-and-drop. |
| **AI opportunity** | Medium — AI auto-configures dashboard based on onboarding interview: "You said cash flow is your biggest concern, so I've put cash metrics front and centre." |
| **Non-finance user test** | **2/5** — Most non-technical users never customise anything. Good defaults > customisation options. |
| **Claude Finance alternative** | Claude adapts to what you ask — conversational "customisation" is actually better than drag-and-drop for most users. |
| **Leverage existing tools?** | No |
| **Token efficiency** | ~200 tokens for initial layout suggestion × once |
| **Build recommendation** | **SKIP** for MVP — Focus on great defaults from onboarding. Add customisation Phase 2. |
| **Priority** | **P3** |
| **Defensibility** | Low |

---

### 14. Trend Sparklines on Cards

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Tiny line chart on each KPI card showing 6-12 month trend |
| **What it's trying to achieve** | "Is this metric trending up or down over time?" without clicking through |
| **Who needs it** | All |
| **Best in class** | **Fathom** — 12-month sparkline on every KPI card with colour matching the traffic-light status. Green sparkline = healthy trend, red = deteriorating. The sparkline itself is colour-coded, not just the card. |
| **How they achieved it** | Lightweight SVG sparkline rendered from KPI snapshot history. Colour derived from latest benchmark_status. No interaction — purely visual indicator. |
| **Runner up** | **Mosaic** — Similar sparklines but with a subtle target line overlay showing where the metric should be. |
| **Current Advisory OS state** | **Working** — `kpi-sparkline.tsx` renders mini trend charts colour-coded by benchmark status. KPI history stored via `persistKPISnapshots()`. This is already competitive. |
| **AI opportunity** | Low — Visual pattern recognition is better served by the chart itself. |
| **Non-finance user test** | **5/5** — Everyone understands "line going up = good, line going down = bad" (when colour-coded correctly). |
| **Claude Finance alternative** | Claude can't show trend at a glance. The sparkline is definitively better for scanning. |
| **Leverage existing tools?** | No |
| **Token efficiency** | Zero tokens |
| **Build recommendation** | **BUILD** — Already working. Minor enhancement: add target line overlay. |
| **Priority** | **P1** — Working, just needs polish |
| **Defensibility** | Low — commoditised pattern |

---

### 15. Variance Colour Coding

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Automatically colours variance indicators green (favourable) or red (unfavourable) based on metric type |
| **What it's trying to achieve** | Instant visual signal — good or bad? |
| **Who needs it** | All |
| **Best in class** | **DataRails** — Variance colouring is context-aware: revenue up = green, expenses up = red. Automatically determined by metric type (higher_is_better flag). Materiality threshold: < 10% variance suppressed (no colour), > 10% shows colour. This prevents false alarms on trivial movements. |
| **How they achieved it** | Each KPI has a `higher_is_better` boolean. Variance direction + this flag determines colour. Materiality threshold configurable globally. |
| **Runner up** | **Fathom** — Three-tier: green/amber/red with configurable bands (default: >5% = amber, >15% = red). |
| **Current Advisory OS state** | **Working** — KPI engine has `higher_is_better` flag and `benchmark_status` (green/amber/red). Variance engine has `is_material` (10% OR £5k threshold). Colour coding applied in `kpi-grid.tsx`. |
| **AI opportunity** | None — deterministic |
| **Non-finance user test** | **5/5** — Red = bad, green = good. Universal. |
| **Claude Finance alternative** | Claude can say "this is good" or "this is concerning" but can't match the instant visual scan of colour coding. |
| **Leverage existing tools?** | No |
| **Token efficiency** | Zero tokens |
| **Build recommendation** | **BUILD** — Already working well. Consider adding Fathom's three-tier (amber band) if not already present across all cards. |
| **Priority** | **P1** — Working |
| **Defensibility** | Low — standard pattern |

---

### 16. Data Freshness Indicator

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Shows "Synced 2 hours ago" or "Data is 3 days stale" badge on the dashboard |
| **What it's trying to achieve** | Trust calibration — "how current are these numbers?" |
| **Who needs it** | Advisor primarily |
| **Best in class** | **Vena** — Timestamp on every cell showing when it was last updated and from which source. Overkill for our use case but the principle is right. |
| **How they achieved it** | Cell-level metadata stored alongside values. Rendered as tooltip on hover. |
| **Runner up** | **DataRails** — Global "last refreshed" timestamp with a refresh button. Simple and effective. |
| **Current Advisory OS state** | **Working** — Context freshness tracking in company skill (lastSyncAt, staleReasons). Displayed in narratives. |
| **AI opportunity** | None |
| **Non-finance user test** | **3/5** — Most business owners don't think about data freshness. Advisors care deeply. |
| **Claude Finance alternative** | No |
| **Leverage existing tools?** | No |
| **Token efficiency** | Zero tokens |
| **Build recommendation** | **BUILD** — Keep as subtle header badge. Already implemented. |
| **Priority** | **P2** |
| **Defensibility** | **High** — Governance primitive. |

---

### 17-20. Proposal / Roadmap / Marketing / Operations Widgets

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Specialized widgets for proposals, roadmap tracking, marketing metrics, and operations |
| **What it's trying to achieve** | Non-financial operational context alongside financial data |
| **Who needs it** | Varies — business owner for operations, advisor for portfolio |
| **Best in class** | **Mosaic** — Combines HRIS, CRM, and financial data on one dashboard. Operational widgets live alongside financial ones. |
| **How they achieved it** | Multi-source integration layer normalising data from 750+ sources. |
| **Current Advisory OS state** | **Working** — Components exist but are lightly implemented. |
| **AI opportunity** | Low for MVP |
| **Non-finance user test** | **3/5** — Depends heavily on the specific widget |
| **Claude Finance alternative** | No — these aren't finance features |
| **Leverage existing tools?** | **Yes** — Proposals → Notion/Hubspot. Roadmap → Linear/Notion. Marketing → Google Analytics. Operations → Asana/Monday. Don't rebuild these. |
| **Token efficiency** | Zero tokens |
| **Build recommendation** | **SKIP** — These are integration targets, not build targets. Focus on financial dashboard. |
| **Priority** | **P3** |
| **Defensibility** | Low — commodity integrations |

---

## Summary Lists

### BUILD LIST (Custom implementation, informed by best-in-class)

| Feature | Approach | Informed by | Priority |
|---------|----------|-------------|----------|
| KPI Card Enhancement | Add traffic-light thresholds, AI micro-commentary, plain-English subtitles | Fathom | P0 |
| Drill-Down Panel | DataRails-style slide-over with 3-level progressive disclosure (KPI → category → transactions) | DataRails | P0 |
| Waterfall Chart Enhancement | Add click-to-drill, semantic category labels, AI annotations | DataRails | P0 |
| AI Narrative Enhancement | Add budget variance, role emphasis, traceable number references | Fathom, DataRails | P0 |
| Period Comparison Mode | "vs. budget / vs. prior year / vs. prior period" global toggle | Runway | P1 |
| Health Score Trend | Historical health score tracking with per-dimension traffic lights | Fathom | P1 |

### WRAP LIST (Claude API does the work, we build the governed UI shell)

| Feature | Shell needed | AI work | Token cost |
|---------|-------------|---------|------------|
| KPI Micro-Commentary | 1-sentence display on card | Generate per-KPI insight | ~200 tokens/KPI × Haiku |
| Drill-Down AI Explanation | Expandable reasoning at each drill level | Explain variance driver | ~500 tokens/level × Sonnet |
| Dashboard Narrative | Hero text block at top | Full period narrative | ~2000 tokens × Sonnet |

### LEVERAGE LIST (Use existing tools)

| Feature | Alternative | Action |
|---------|------------|--------|
| Connected Accounts Widget | Move to Settings page | Reduce dashboard clutter |
| Proposal Tracking | Notion / HubSpot integration | Phase 2 integration |
| Roadmap Widget | Linear / Notion embed | Phase 2 integration |
| Marketing/Operations Widgets | Respective SaaS tools | Phase 2 integration |

### SKIP LIST (Not for MVP)

| Feature | Reason | Revisit |
|---------|--------|---------|
| Widget Drag-and-Drop | Good defaults > customisation. 80% of users never customise. | Phase 2 |
| Custom Dashboard Layouts | Same as above | Phase 2 |
| Role-Based Dashboard Variants | Single layout works for demo | Phase 2 |

### ARCHITECTURE NOTES

1. **Shared DrillableNumber Component** — Every clickable number on the dashboard should use the same component: `<DrillableNumber value={amount} onDrill={() => openPanel(level, context)} />`. This ensures consistent drill-down UX across all widgets.

2. **Dashboard Context Provider** — Period selection, comparison mode, and filter state should live in a single React context provider that all widgets consume. Changes propagate to all widgets simultaneously.

3. **AI Commentary Caching Strategy** — KPI micro-commentaries should be generated on Xero sync (not on page load). Store in `kpi_commentary` table. Invalidate on next sync. Use Haiku for card-level, Sonnet for drill-down level.

4. **Token Budget** — Dashboard load: ~2000 tokens for narrative (cached). Drill-down: ~500 tokens per level (on-demand). Estimated monthly cost for active user: ~£0.50/month at current Anthropic pricing.

5. **Semantic Taxonomy Advantage** — The 25-category semantic P&L gives Advisory OS a structural advantage over competitors using Xero's 4 account classes. Every drill-down, every breakdown, every AI commentary benefits from richer categorisation. This is a compounding moat.
