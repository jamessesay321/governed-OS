# Feature Benchmark Audit: KPI Engine & Variance Analysis
## Advisory OS — Section 2 of 15
**Date:** 2026-04-01 | **Status:** Complete | **Auditor:** Claude Code

---

## Feature Inventory

| # | Feature | Type | Current State |
|---|---------|------|---------------|
| 1 | Pre-Built KPI Library | Calculation engine | Working |
| 2 | KPI Grid Display (Traffic-Light Cards) | Data display | Working |
| 3 | KPI Sparkline Trends | Visualization | Working |
| 4 | KPI Detail / Drill-Down View | Navigation | Working |
| 5 | Custom KPI Builder | User action | Partial |
| 6 | KPI Targets & Thresholds | Configuration | Partial |
| 7 | Benchmark Comparison (Industry) | Data display | Partial |
| 8 | Variance Report (Budget vs Actual) | Calculation | Working |
| 9 | AI Variance Explanation | AI output | Working |
| 10 | Material Variance Detection | Alert/logic | Working |
| 11 | Variance Drill-Down by Dimension | Navigation | Missing |
| 12 | KPI Alerts / Notifications | Workflow | Missing |
| 13 | Non-Financial KPI Support | Data input | Missing |
| 14 | KPI History / Snapshot Tracking | Data persistence | Working |

---

## Benchmark Tables

### 1. Pre-Built KPI Library

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Automatically calculates financial KPIs from Xero data: Revenue Growth, Gross Margin, Net Margin, Breakeven Margin, Cash Conversion Cycle, AR/AP Days, Working Capital Ratio, Burn Rate, Current Ratio, Debt-to-Equity, ROE, ROA, Revenue per Employee, EBITDA Margin, and more. Business-type-specific KPIs for SaaS (MRR/ARR/Churn), ecommerce, and services. |
| **What it's trying to achieve** | "Show me all the important ratios without me having to define or calculate them" |
| **Who needs it** | All — business owner for awareness, advisor for client health triage |
| **Best in class** | **Fathom HQ** — Ships 50+ pre-built KPIs out of the box. The mechanism: each KPI has a formula definition, a display format (currency/percentage/days/ratio), a default threshold band (green/amber/red), and an industry-specific benchmark. KPI Explorer view shows ALL KPIs in a sortable grid — sort by "variance from target" to instantly see which metrics are off-track. Sort by "importance" (user-assigned weight) to see what matters most. Clicking any KPI opens a detail view with 12-month trend, budget overlay, and AI commentary. |
| **How they achieved it** | Static KPI definition library with formula functions. Each definition includes: `formula(inputs) → value`, `format`, `higherIsBetter`, `defaultThresholds: {green, amber, red}`, `industryBenchmarks: {sector → percentile25/50/75}`. On data refresh, all KPIs recalculated and stored as snapshots. |
| **Runner up** | **DataRails** — Fewer pre-built but powerful custom formula engine. Users can create any calculation from any data field. |
| **Current Advisory OS state** | **Working** — `engine.ts` has `calculateKPIs()` with definitions in `definitions.ts`. Returns `CalculatedKPI[]` with value, formatted_value, trend_direction, trend_percentage, benchmark_value, benchmark_status. Business type filtering (universal/saas/ecommerce/services). KPIInputData has 60+ input fields. This is solid. |
| **AI opportunity** | Medium — AI can recommend which KPIs to highlight based on business context: "For a plumbing business with cash flow concerns, prioritise Debtor Days and Working Capital Ratio over EBITDA Margin." |
| **Non-finance user test** | **2/5** — The KPIs exist but labels like "Cash Conversion Cycle" and "Debt-to-Equity Ratio" mean nothing to most business owners. Needs plain-English translations: "Cash Conversion Cycle" → "How quickly you turn work into cash in the bank." |
| **Claude Finance alternative** | Claude can calculate any ratio from raw data and explain it conversationally. But Claude can't persist snapshots, track trends, or alert on threshold breaches. The library + tracking wins. |
| **Leverage existing tools?** | Fathom calculates these from Xero too — but Advisory OS adds governance layer (audit trail, who-set-which-target) + AI explanation layer. |
| **Token efficiency** | Zero tokens for calculation (deterministic). ~200 tokens per KPI for AI explanation. Cache on sync. |
| **Build recommendation** | **BUILD** — Already strong. Add: plain-English KPI descriptions, Fathom-style KPI Explorer sortable grid, expand library to 40+ KPIs. |
| **Priority** | **P0** — Core engine, demo-critical |
| **Defensibility** | **High** — KPI calculations are commodity, but KPIs contextualised by semantic taxonomy + business profile + audit trail = governance moat. |

---

### 2. KPI Grid Display (Traffic-Light Cards)

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Responsive grid of KPI cards with left border colour (green/amber/red), sparkline, trend indicator, and benchmark badge |
| **What it's trying to achieve** | "Show me all my metrics at a glance with instant good/bad signals" |
| **Who needs it** | All |
| **Best in class** | **Fathom HQ** — Traffic-light card system. Each card: metric name, current value, variance from target (absolute + %), traffic light (green/amber/red circle), 12-month sparkline, one-click to detail. The grid is sortable and filterable. The key mechanism: the traffic light requires zero financial knowledge to interpret. A plumber sees green = good, red = fix this. Fathom auto-calculates the traffic light from configurable thresholds with sensible defaults per metric. |
| **How they achieved it** | Card component with: `{label, value, target, threshold: {green: %, amber: %, red: %}, sparklineData: number[], benchmarkStatus}`. Threshold comparison: `if variance > greenBand → green; else if variance > amberBand → amber; else → red`. Defaults set per metric type with industry overlay. |
| **Runner up** | **Mosaic** — Clean metric cards with real-time updates. Less visual hierarchy but faster refresh (sub-second from live data). |
| **Current Advisory OS state** | **Working** — `kpi-grid.tsx` renders responsive grid (2-4 columns). Left border coloured by benchmark_status. Badge shows "Above/Average/Below". Sparkline in bottom-right. This is already close to Fathom quality. |
| **AI opportunity** | Low — the visual system is deterministic. AI adds value in the detail view, not the grid. |
| **Non-finance user test** | **4/5** — Traffic-light system is excellent. Would be 5/5 with plain-English metric names. |
| **Claude Finance alternative** | Claude can't replace an at-a-glance KPI grid. The grid is definitively better for scanning. |
| **Leverage existing tools?** | No |
| **Token efficiency** | Zero tokens |
| **Build recommendation** | **BUILD** — Already strong. Polish: add sortable/filterable capability (Fathom KPI Explorer), ensure all metrics have sensible default thresholds. |
| **Priority** | **P0** — Demo-critical |
| **Defensibility** | Medium — pattern is common, but quality of execution + semantic context differentiates. |

---

### 3. KPI Sparkline Trends

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Mini 6-12 month trend line on each KPI card |
| **What it's trying to achieve** | "Is this metric improving or deteriorating?" without clicking through |
| **Who needs it** | All |
| **Best in class** | **Fathom** — Sparkline colour matches traffic-light. 12 data points (monthly). Subtle target line overlay showing where metric should be. Hover disabled on sparkline (to keep it simple) — click to see full trend. |
| **How they achieved it** | SVG sparkline, 12 data points from KPI snapshots, colour from benchmark_status. |
| **Runner up** | **Mosaic** — Same pattern with a subtle fill gradient under the line. |
| **Current Advisory OS state** | **Working** — `kpi-sparkline.tsx` renders colour-coded sparklines from KPI history. `persistKPISnapshots()` stores historical data. Already competitive. |
| **AI opportunity** | None |
| **Non-finance user test** | **5/5** — Line going up = intuitive. |
| **Claude Finance alternative** | No — can't do at-a-glance trends. |
| **Leverage existing tools?** | No |
| **Token efficiency** | Zero tokens |
| **Build recommendation** | **BUILD** — Already working. Minor polish: add target line overlay if not present. |
| **Priority** | **P1** — Working |
| **Defensibility** | Low |

---

### 4. KPI Detail / Drill-Down View

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Clicking a KPI card opens a full detail view with historical trend chart, breakdown, and analysis |
| **What it's trying to achieve** | "Why is this metric at this level? What's driving it?" |
| **Who needs it** | All — the natural follow-up after scanning the grid |
| **Best in class** | **Fathom** — Full-page KPI detail: (1) Large trend chart with 12-36 months (2) Overlay options: budget, forecast, prior year, all three simultaneously (3) Traffic-light history bar showing green/amber/red for each period (4) AI commentary explaining the trend (5) Related KPIs panel showing correlated metrics (6) Target configuration directly from this view. The key mechanism: overlay toggles let users add/remove comparison lines without leaving the page. |
| **How they achieved it** | Recharts LineChart with multiple series (actual, budget, forecast, prior year). Each series togglable via legend clicks. Traffic-light history is a horizontal bar of coloured dots. Related KPIs computed by correlation analysis. |
| **Runner up** | **DataRails** — Slide-over panel (not full page) preserving dashboard context. Shows variance decomposition: "Revenue variance of £15k is composed of: Volume effect (£10k) + Price effect (£3k) + Mix effect (£2k)." More analytical, less visual. |
| **Current Advisory OS state** | **Working** — `kpi-detail.tsx` shows historical trend chart and benchmark comparison. Missing: budget/forecast overlay, traffic-light history bar, AI commentary, related KPIs. |
| **AI opportunity** | **High** — AI can explain the trend: "Your gross margin has declined from 48% to 42% over 6 months. The primary driver is subcontractor costs which have grown 23% while revenue grew only 8%. At this trajectory, you'll hit 38% by September." This is where AI adds massive value. |
| **Non-finance user test** | **3/5** — Charts are understandable but need AI narration to be actionable for non-finance users. |
| **Claude Finance alternative** | Claude provides better explanations conversationally but can't match the visual trend chart with interactive overlays. Best approach: chart + AI explanation panel. |
| **Leverage existing tools?** | No |
| **Token efficiency** | ~800 tokens per AI trend explanation × on-demand × cacheable for 24h |
| **Build recommendation** | **BUILD** — Enhance with Fathom-style overlays (budget/forecast/prior year toggles) + AI trend explanation panel. |
| **Priority** | **P0** — Demo-critical (the drill-down moment) |
| **Defensibility** | **High** — AI explanation contextualised by business profile + semantic categories. |

---

### 5. Custom KPI Builder

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Allows users to define their own KPIs using formulas and data fields |
| **What it's trying to achieve** | "I want to track a metric that's specific to my business" |
| **Who needs it** | Advisor primarily, power-user business owner |
| **Best in class** | **Fathom** — Formula-based custom KPI builder. Select accounts or existing KPIs as inputs, write formula (sum, divide, multiply, etc.), set format (currency/percentage/ratio), set thresholds for traffic-light. Preview shows last 12 months of calculated values. The mechanism: it's essentially a spreadsheet formula builder but constrained to financial inputs. |
| **How they achieved it** | Formula parser that accepts KPI/account references. Safe eval engine (not JavaScript eval). Template library of common custom KPIs per industry. |
| **Runner up** | **Mosaic Metric Builder** — Drag-and-drop metric creation from any integrated data source. More visual but less precise. |
| **Current Advisory OS state** | **Partial** — `custom/page.tsx` exists as a page. KPI definitions in `definitions.ts` are extensible. Missing: user-facing formula builder UI. |
| **AI opportunity** | **Very High** — Instead of a formula builder, use NL: "I want to track revenue per employee" → AI defines the formula, selects inputs, sets format. This skips the entire formula builder UX and is more accessible than any competitor. |
| **Non-finance user test** | **1/5** (formula builder) / **5/5** (NL approach) — A plumber will never write a formula. But "I want to know my revenue per van" → AI creates the KPI. |
| **Claude Finance alternative** | Claude can calculate any custom metric conversationally. But it can't persist, track, or alert on it. The value is in the ongoing tracking. |
| **Leverage existing tools?** | Google Sheets can calculate custom metrics but lacks alerting/tracking. |
| **Token efficiency** | ~500 tokens per NL KPI definition × once per creation |
| **Build recommendation** | **WRAP** — NL KPI definition via Claude API (skip the formula builder). Store as a persisted KPI definition. |
| **Priority** | **P2** — Nice-to-have, not demo-critical. Pre-built library covers 90% of needs. |
| **Defensibility** | **High** — NL KPI creation is a unique differentiator. No competitor offers this. |

---

### 6. KPI Targets & Thresholds

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Set target values and threshold bands (green/amber/red) for each KPI |
| **What it's trying to achieve** | "Tell me when a metric is off-track" |
| **Who needs it** | Advisor sets targets, business owner monitors traffic lights |
| **Best in class** | **Fathom** — Per-KPI target with three-band thresholds. Defaults auto-set by industry sector. User can override any threshold. Targets can be fixed value ("Gross Margin > 40%") or dynamic ("Revenue growth > last year +10%"). Visual: threshold bands shown as shaded regions on trend charts. |
| **How they achieved it** | `KPITarget` table: `{kpi_key, target_value, target_type: 'fixed'|'dynamic', green_threshold, amber_threshold, red_threshold, sector_default: boolean}`. Applied during KPI calculation. |
| **Runner up** | **Jirav** — Automated variance alerts when KPIs cross configurable thresholds. Sent via email. |
| **Current Advisory OS state** | **Partial** — `targets/page.tsx` exists. KPI engine has `benchmark_value` and `benchmark_status`. Missing: user-configurable thresholds, sector defaults, dynamic targets. |
| **AI opportunity** | Medium — AI can suggest sensible targets: "Based on your industry (plumbing, £2M turnover), a healthy gross margin target is 45-55%. I'd set amber at 40% and red at 35%." |
| **Non-finance user test** | **3/5** — Setting targets requires knowing what "good" looks like. AI-suggested defaults with one-click accept = 5/5. |
| **Claude Finance alternative** | Claude can advise on targets conversationally but can't enforce them automatically. |
| **Leverage existing tools?** | No |
| **Token efficiency** | ~300 tokens per target suggestion × once per setup |
| **Build recommendation** | **BUILD** — AI-suggested defaults with user override. Store thresholds. Drives the entire traffic-light system. |
| **Priority** | **P1** — Required for traffic lights to work properly. Can demo with hardcoded defaults. |
| **Defensibility** | Medium — Target configuration is common. AI-suggested industry-specific defaults are differentiating. |

---

### 7. Benchmark Comparison (Industry)

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Compare a business's KPIs against industry averages / percentiles |
| **What it's trying to achieve** | "How do I compare to other businesses like mine?" |
| **Who needs it** | Business owner for self-awareness, advisor for client positioning |
| **Best in class** | **Fathom** — Cross-client benchmarking. For advisors with multiple clients, Fathom compares Client A's KPIs against the advisor's portfolio average and industry benchmarks. Shows percentile ranking. The mechanism: aggregated, anonymised data across all Fathom users in the same SIC code, displayed as percentile bands on KPI trend charts. |
| **How they achieved it** | Aggregation engine runs nightly across all orgs in same sector. Percentiles (25th, 50th, 75th) stored per KPI per sector. Privacy maintained via k-anonymity (minimum 20 businesses per cohort). |
| **Runner up** | **Syft** — Industry benchmarks powered by Xero ecosystem data. Now embedded in Xero directly. |
| **Current Advisory OS state** | **Partial** — `benchmarks/page.tsx` exists. KPI engine returns `benchmark_value`. Missing: actual industry benchmark data source, percentile display. |
| **AI opportunity** | Medium — AI can contextualise: "Your debtor days (45) is worse than 70% of similar-sized service businesses. Industry median is 32 days." |
| **Non-finance user test** | **4/5** — "You're in the top 30% for profitability" is very accessible. Percentile bars are intuitive. |
| **Claude Finance alternative** | Claude has general industry knowledge but not real-time benchmark data. The platform needs a data source. |
| **Leverage existing tools?** | **Xero/Syft** — Xero Analytics (powered by Syft) has industry benchmarks. Could API-pull these instead of building our own data set. |
| **Token efficiency** | ~200 tokens for AI contextualisation per KPI |
| **Build recommendation** | **LEVERAGE** — Pull benchmark data from Xero Analytics / Syft API where available. Build simple display. Don't try to aggregate our own benchmark dataset until we have 500+ businesses. |
| **Priority** | **P2** — Impressive in demos but not core |
| **Defensibility** | Low until we have our own dataset. High once we have 500+ businesses (network effect). |

---

### 8. Variance Report (Budget vs Actual)

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Compares budget amounts to actual amounts for each category, calculates variances (absolute and percentage), flags material variances |
| **What it's trying to achieve** | "Where am I over or under budget?" |
| **Who needs it** | All — fundamental FP&A feature |
| **Best in class** | **DataRails** — Variance report with click-through to breakdown by any dimension. The mechanism: select any data point → choose comparison basis (prior year/budget/forecast) → choose breakdown dimension (department/account/entity/cost centre) → see waterfall of what drove the variance. Everything is one or two clicks. Variance threshold suppression: < 10% variance rows are dimmed, > 10% are highlighted with insights available on hover. |
| **How they achieved it** | Variance calculation engine: `actual - budget = variance`. Materiality filter: `abs(variance_pct) > threshold OR abs(variance_abs) > £threshold`. Dimension-based drill-down: joins variance data with dimension tables. |
| **Runner up** | **Cube** — Automated variance analysis that flags shifts and drafts commentary automatically. Less visual drill-down but AI-generated first draft of variance explanations. |
| **Current Advisory OS state** | **Working** — `variance/engine.ts` calculates variances with `is_material` flag (10% OR £5k). Returns lines with direction (favourable/adverse/on_target). Missing: dimension-based breakdown, DataRails-style click-through, threshold suppression in UI. |
| **AI opportunity** | **Very High** — AI can explain each material variance: "Marketing spend is £8k over budget because you brought forward the Q2 campaign to March." This is already implemented in `variance.ts`. |
| **Non-finance user test** | **3/5** — "Budget vs Actual" is understandable concept. The table format needs colour coding and plain-English AI explanations to be accessible. |
| **Claude Finance alternative** | Claude can do variance analysis from raw data and explain it conversationally. But the governed budget → actual → variance → explanation pipeline with audit trail is what Advisory OS adds. |
| **Leverage existing tools?** | Xero has basic budget vs actual but no AI explanation, no materiality filtering, no drill-down. |
| **Token efficiency** | ~1000 tokens per AI variance explanation × per material variance (typically 3-8) × monthly = ~5000-8000 tokens/month. Sonnet for quality. Cache for 24h. |
| **Build recommendation** | **BUILD** — Enhance with DataRails-style dimension drill-down. AI explanation already working. |
| **Priority** | **P0** — Demo-critical |
| **Defensibility** | **High** — Budget governance (who set it, when, approval workflow) + AI explanation + semantic categories = deep moat. |

---

### 9. AI Variance Explanation

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Claude API generates natural language explanation of what drove a specific variance |
| **What it's trying to achieve** | "Don't just tell me revenue is down £15k — tell me WHY" |
| **Who needs it** | All — this is the killer feature for non-finance users |
| **Best in class** | **Cube FP&Agents** — Automated variance analysis that identifies revenue/cost drivers and drafts commentary. The mechanism: (1) Calculate variance (2) Decompose into drivers (account-level contributions) (3) Rank by magnitude (4) Generate narrative explaining top 3-5 drivers with percentage contribution to total variance. Output is a first draft that finance teams review and edit. |
| **How they achieved it** | Driver decomposition: for each account, calculate `account_variance / total_variance` to get contribution %. Sort by contribution. Feed top drivers + their context to LLM for narrative. |
| **Runner up** | **Fathom AI Commentary** — Recently launched. "Shaped by goals, strategy, market conditions." Every number traceable. Less structured than Cube but more contextually aware. |
| **Current Advisory OS state** | **Working** — `variance.ts` `explainVariance()` returns: metric, values, change, drivers[] (factor, impact, direction, explanation), aiInsight. Uses company context prefix. This is already competitive. |
| **AI opportunity** | This IS the AI feature. Enhancement: include business context ("You mentioned in your interview that you were planning a marketing push — this explains the £8k overspend on marketing.") |
| **Non-finance user test** | **5/5** — Plain English explanation of what happened and why. Best feature for non-finance users. |
| **Claude Finance alternative** | Claude can explain variances from uploaded data equally well. The difference: Advisory OS does it automatically, with history, with audit trail, with governance. Claude Finance requires manual upload each time. |
| **Leverage existing tools?** | No — this is core AI value. |
| **Token efficiency** | ~1200 tokens per explanation (input: P&L data + drivers) × on-demand × cacheable 24h |
| **Build recommendation** | **BUILD** — Already strong. Enhance with interview context ("you said X, this aligns with Y"), budget context, and seasonal pattern awareness. |
| **Priority** | **P0** — Hero feature for demos |
| **Defensibility** | **Very High** — Explanation quality scales with company knowledge depth (interview, semantic mappings, historical patterns). This compounds over time. More data = better explanations. |

---

### 10. Material Variance Detection

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Automatically identifies which variances are significant enough to warrant attention |
| **What it's trying to achieve** | "Don't show me 50 variances — show me the 5 that matter" |
| **Who needs it** | All — reduces cognitive load |
| **Best in class** | **DataRails** — Dual threshold: percentage-based (>10%) AND absolute (>$X). Plus context-aware materiality: a 15% variance on a £500 line item is less material than a 5% variance on a £200k line item. DataRails weights by absolute impact. Visual: immaterial variances are dimmed/collapsed, material ones are highlighted with an "insights" icon. |
| **How they achieved it** | `is_material = abs(variance_pct) > pct_threshold OR abs(variance_abs) > abs_threshold`. Sort by `abs(variance_abs)` to rank by impact. UI: two-tier rendering (highlighted vs dimmed). |
| **Runner up** | **Puzzle** — AI flux analysis flags "significant changes" without requiring threshold configuration. ML-based anomaly detection determines what's significant. |
| **Current Advisory OS state** | **Working** — Variance engine has `is_material` (10% OR £5k). Returns `material_variances[]` as filtered subset. |
| **AI opportunity** | Medium — AI can adjust materiality dynamically: "For a £2M business, £5k is 0.25% — consider raising the absolute threshold to £10k." |
| **Non-finance user test** | **4/5** — Users don't see the detection mechanism, they just see the filtered result. Works invisibly. |
| **Claude Finance alternative** | Claude would naturally focus on material items when asked to analyse variances. But the systematic, consistent threshold application is what governance requires. |
| **Leverage existing tools?** | No |
| **Token efficiency** | Zero tokens (deterministic) |
| **Build recommendation** | **BUILD** — Already working. Enhance: configurable thresholds per org, weighted by absolute impact, smart defaults based on business size. |
| **Priority** | **P1** — Working, needs polish |
| **Defensibility** | Medium — threshold configuration + audit trail adds governance value. |

---

### 11. Variance Drill-Down by Dimension

| Dimension | Assessment |
|-----------|------------|
| **What it does** | From a variance, drill into what caused it by breaking down across dimensions (department, location, project, product line) |
| **What it's trying to achieve** | "Revenue is down £15k — is it one department or across the board?" |
| **Who needs it** | Advisor, sophisticated business owner |
| **Best in class** | **DataRails** — Click any variance → choose dimension to drill by (department/entity/cost centre/custom) → see waterfall showing each dimension's contribution. Then click a dimension → see account-level breakdown. Then click account → see transactions. Three levels, all in a slide-over panel. The mechanism: the drill-down is dynamic — you choose which dimension to break by AFTER clicking, not in advance. |
| **How they achieved it** | Dimension tables joined to transaction data. API accepts `variance_id + dimension_key` → returns breakdown. Flexible schema allows any tracking category as a drill dimension. |
| **Runner up** | **Runway** — Dimension-based segmentation built into the data model. Every metric is automatically drillable by any defined dimension. |
| **Current Advisory OS state** | **Missing** — Tracking categories are now pulled from Xero (`tracking-categories.ts`) and classified semantically (location, department, project, etc.) but no drill-down UI exists yet. The data infrastructure is there, the UI is not. |
| **AI opportunity** | High — AI can guide the drill: "The £15k revenue shortfall is concentrated in your London office. Manchester and Birmingham are on target." |
| **Non-finance user test** | **3/5** — The concept of dimensions is financial. But if framed as "Click to see which location / project / team is responsible" it becomes 4/5. |
| **Claude Finance alternative** | Claude can do this conversationally: "Break down revenue by department" → table. But the visual, click-through experience is faster for exploration. |
| **Leverage existing tools?** | No |
| **Token efficiency** | ~500 tokens for AI dimension guidance × on-demand |
| **Build recommendation** | **BUILD** — Critical feature. Data layer exists (tracking categories). Build the UI using DataRails slide-over pattern. |
| **Priority** | **P1** — Not strictly demo-critical but massively impressive when shown |
| **Defensibility** | **High** — Semantic tracking category classification + governed dimension drill-down + audit trail = strong moat. |

---

### 12. KPI Alerts / Notifications

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Automatically notify users when KPIs cross configured thresholds |
| **What it's trying to achieve** | "Tell me when something needs my attention without me having to check" |
| **Who needs it** | Advisor (portfolio monitoring), business owner (exception-based management) |
| **Best in class** | **Fathom** — KPI Alerts triggered when results exceed thresholds. Configurable per KPI: email notification, in-app alert, or both. Advisors can set alerts across all clients → get notified when ANY client's cash drops below £X. The mechanism: post-sync, compare each KPI to thresholds → if breached → create alert record → dispatch notification via configured channel. |
| **How they achieved it** | Alert rules table: `{kpi_key, org_id, threshold_type, threshold_value, channel, user_id}`. Post-sync job evaluates all rules. Alert dispatch via email (SendGrid) + in-app (notification table + badge). |
| **Runner up** | **Jirav** — Automated alerts for significant variances or deadlines. Less configurable but works out-of-box. |
| **Current Advisory OS state** | **Missing** — `alerts/page.tsx` exists as a page but no alert engine. KPI engine calculates benchmark_status but doesn't trigger notifications. |
| **AI opportunity** | Medium — AI can prioritise alerts: "You have 3 alerts this week. The most urgent is cash position — you'll run out of runway in 6 weeks at current burn rate." |
| **Non-finance user test** | **5/5** — "You'll get a notification when something needs your attention" is universally understood. |
| **Claude Finance alternative** | Claude can't proactively notify. This is a platform advantage over conversational AI. |
| **Leverage existing tools?** | Email via Resend/SendGrid. In-app via Supabase realtime. Slack webhook for advisors. |
| **Token efficiency** | ~200 tokens for AI-prioritised alert summary × weekly |
| **Build recommendation** | **BUILD** — Post-sync alert evaluation engine + email/in-app dispatch. Leverage existing email provider. |
| **Priority** | **P2** — Not demo-critical but high value for retention |
| **Defensibility** | **High** — Governed alerts with audit trail (who set what threshold, when alerts fired, what action was taken) = governance moat. |

---

### 13. Non-Financial KPI Support

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Track non-financial metrics: headcount, NPS, customer count, project count, leads |
| **What it's trying to achieve** | "My business isn't just about money — I want to track my team size, customer satisfaction, etc." |
| **Who needs it** | Business owner, advisor |
| **Best in class** | **Fathom** — Supports: Headcount, Number of Projects, New Orders, New Leads, New Customers, NPS Score, CSAT Score. Manual input or CSV upload. Displayed alongside financial KPIs with same traffic-light system. |
| **How they achieved it** | Non-financial KPIs stored in same table structure as financial ones but with manual_input flag. Input UI: simple monthly value entry form or CSV bulk upload. |
| **Runner up** | **Mosaic** — Pulls non-financial data from HRIS/CRM integrations automatically. |
| **Current Advisory OS state** | **Missing** — KPI engine is financial-only. No manual input mechanism for non-financial metrics. |
| **AI opportunity** | Low for MVP |
| **Non-finance user test** | **4/5** — Business owners often care more about headcount and customers than financial ratios. |
| **Claude Finance alternative** | Claude can analyse uploaded non-financial data but can't track it persistently. |
| **Leverage existing tools?** | **Yes** — Headcount from HRIS, customers from CRM, NPS from survey tools. Integration targets for Phase 2. |
| **Token efficiency** | Zero tokens |
| **Build recommendation** | **SKIP** for MVP — Add manual input for 3-5 key non-financial KPIs in Phase 2. |
| **Priority** | **P3** |
| **Defensibility** | Low |

---

### 14. KPI History / Snapshot Tracking

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Stores KPI values at each calculation point, enabling trend analysis over months/years |
| **What it's trying to achieve** | "Show me how this metric has changed over the last 12 months" |
| **Who needs it** | All |
| **Best in class** | **Fathom** — Full KPI history with snapshots at each data refresh. Trend chart shows all historical values. Budget and forecast overlays on same timeline. Exportable data. |
| **How they achieved it** | `kpi_snapshots` table: `{kpi_key, org_id, period, value, calculated_at}`. Immutable — new snapshot added on each sync, never updated. |
| **Runner up** | **Vena** — Cell-level version history showing every change with timestamp and user. |
| **Current Advisory OS state** | **Working** — `persistKPISnapshots()` stores snapshots. `getKPIHistory()` retrieves them. Used for sparklines. Solid implementation. |
| **AI opportunity** | Medium — AI can identify trend breaks: "Your gross margin was stable at 45% for 8 months, then dropped to 40% in the last 3 months." |
| **Non-finance user test** | **4/5** — Trend charts are intuitive. |
| **Claude Finance alternative** | Claude can analyse time series data but can't persist or accumulate historical snapshots. |
| **Leverage existing tools?** | No |
| **Token efficiency** | Zero tokens for storage. ~300 tokens for AI trend analysis. |
| **Build recommendation** | **BUILD** — Already working. Solid. |
| **Priority** | **P1** — Working |
| **Defensibility** | Medium — Immutable snapshot history is a governance primitive. |

---

## Summary Lists

### BUILD LIST

| Feature | Approach | Informed by | Priority |
|---------|----------|-------------|----------|
| KPI Explorer Grid | Sortable/filterable grid of all KPIs, sort by variance-from-target or importance | Fathom | P0 |
| KPI Detail Overlays | Budget/forecast/prior year toggle overlays on trend chart | Fathom | P0 |
| AI Variance Explanation Enhancement | Add interview context, seasonal patterns, budget context to explanations | Cube, Fathom | P0 |
| Variance Dimension Drill-Down | Click variance → choose dimension → see breakdown. Use tracking categories. | DataRails | P1 |
| AI-Suggested KPI Targets | LLM suggests thresholds based on industry + business size, one-click accept | Fathom defaults | P1 |
| KPI Alert Engine | Post-sync threshold evaluation + email/in-app notification dispatch | Fathom, Jirav | P2 |
| Plain-English KPI Labels | Every KPI gets a plain-English subtitle ("How quickly you turn work into cash") | Advisory OS original | P0 |

### WRAP LIST

| Feature | Shell needed | AI work | Token cost |
|---------|-------------|---------|------------|
| NL Custom KPI Builder | Input field + preview | Claude defines formula from description | ~500 tokens × Sonnet |
| AI Trend Explanation | Expandable panel on KPI detail | Explain trend breaks and drivers | ~800 tokens × Sonnet |
| AI Alert Prioritisation | Alert summary card | Rank alerts by urgency with context | ~200 tokens × Haiku |

### LEVERAGE LIST

| Feature | Alternative | Action |
|---------|------------|--------|
| Industry Benchmarks | Xero Analytics / Syft API | Pull benchmark data rather than building own dataset |
| Non-Financial Data | HRIS / CRM integrations | Phase 2 integration targets |

### SKIP LIST

| Feature | Reason | Revisit |
|---------|--------|---------|
| Non-Financial KPI Manual Input | Financial KPIs cover 90% of demo needs | Phase 2 |
| Custom Threshold Rules Engine | Simple per-KPI thresholds sufficient for MVP | Phase 2 |
| Multi-Entity KPI Comparison | Single entity focus for MVP | Phase 2 (Advisor Portal) |

### ARCHITECTURE NOTES

1. **KPI-to-Detail Shared Pattern** — Every KPI card should use: `<KPICard onClick={() => navigate('/kpi/[key]')} />` or slide-over panel. Consistent click-to-drill across all metrics.

2. **Threshold Cascade** — Default thresholds (hardcoded) → Industry defaults (from benchmarks) → AI-suggested (on onboarding) → User-configured. Each level overrides the previous. Store which level is active for audit trail.

3. **Variance + KPI Convergence** — The variance report and KPI detail view should share the same drill-down component. "Revenue variance" on variance page and "Revenue" on KPI page should drill to the same breakdown view.

4. **Token Optimisation** — Batch AI explanations: instead of one Claude call per variance line, send all material variances in one call and get back structured explanations for all. Reduces latency from 5× round-trips to 1×. ~2000 tokens total vs ~5000 tokens sequential.

5. **Semantic Taxonomy in Variance** — The 25-category semantic P&L makes variance breakdowns more meaningful than competitors using Xero's 4-class grouping. "Employee costs up £4k" is better than "Expenses up £4k" because it tells you WHERE to look.
