# Feature Benchmark Audit: Forecasting & Budgeting
## Advisory OS (Grove) — Section 06 of 15
**Date:** 2026-04-02 | **Status:** Complete | **Auditor:** Claude Code

---

## Feature Inventory

| # | Feature | Type | Location | Current State |
|---|---------|------|----------|---------------|
| 1 | Forecast generation (three-statement) | Calculation | `src/lib/forecast/engine.ts`, `src/app/api/forecast/generate/route.ts` | Working (legacy) |
| 2 | Forecast persistence and retrieval | Data | `forecasts` table, `src/app/api/forecast/latest/[orgId]/route.ts` | Working |
| 3 | Forecast assumption inputs (6 sliders) | UI | `src/app/(dashboard)/forecast/forecast-client.tsx` | Working |
| 4 | NL scenario on top of base forecast | AI | `src/lib/forecast/scenarios.ts`, `src/app/api/forecast/scenario/route.ts` | Working (legacy) |
| 5 | Scenario overlay chart (base vs scenario) | UI | `src/app/(dashboard)/forecast/forecast-client.tsx` | Working |
| 6 | Forecast P&L summary table (6 months) | UI | `src/app/(dashboard)/forecast/forecast-client.tsx` | Working |
| 7 | Forecast confidence score display | UI | `src/app/(dashboard)/forecast/forecast-client.tsx` | Working |
| 8 | Quick scenario prompt buttons (5 presets) | UI | `src/app/(dashboard)/forecast/forecast-client.tsx` | Working |
| 9 | Voice input for scenario query | UI | `src/app/(dashboard)/forecast/forecast-client.tsx` | Working |
| 10 | Forecast-vs-actuals comparison function | Calculation | `src/lib/forecast/engine.ts` → `compareForecastToActuals()` | Working (no UI) |
| 11 | Forecast snapshot persistence | Data | `src/lib/scenarios/snapshots.ts` → `forecast_snapshots` table | Working (pipeline only) |
| 12 | Budget lines data model | Data | `budget_lines` table, `src/lib/variance/engine.ts` | Working |
| 13 | Budget lines GET API | API | `src/app/api/budget/[orgId]/route.ts` | Working |
| 14 | Budget lines POST/upsert API | API | `src/app/api/budget/[orgId]/route.ts` | Working |
| 15 | Budget lines audit log on upsert | Governance | `src/app/api/budget/[orgId]/route.ts` | Working |
| 16 | Budget vs actual variance calculation | Calculation | `src/lib/variance/engine.ts` → `calculateVariances()` | Working |
| 17 | Materiality thresholds (10% / £5,000) | Calculation | `src/lib/variance/engine.ts` | Working |
| 18 | Favourable / adverse / on-target classification | Calculation | `src/lib/variance/engine.ts` | Working |
| 19 | Variance report (period totals + material list) | Data | `src/lib/variance/engine.ts` | Working |
| 20 | Variance page (period + compare-mode selectors) | UI | `src/app/(dashboard)/variance/page.tsx`, `variance-client.tsx` | Working |
| 21 | Variance summary cards (4 KPI cards) | UI | `src/app/(dashboard)/variance/variance-client.tsx` | Working |
| 22 | Variance table (Budget / Actual / Variance / %) | UI | `src/components/variance/variance-table.tsx` | Working |
| 23 | Material variance badge highlighting | UI | `src/components/variance/variance-table.tsx` | Working |
| 24 | Variance detail panel (bar chart + stats) | UI | `src/components/variance/variance-detail.tsx` | Working |
| 25 | AI variance explanation (Haiku, executive summary) | AI | `src/app/api/variance/[orgId]/route.ts` POST | Working |
| 26 | Deeper AI variance explanation (per line, with transactions) | AI | `src/lib/variance/ai-explanations.ts` | Working |
| 27 | AI explanation card (risk level + action items) | UI | `src/components/variance/ai-explanation.tsx` | Working |
| 28 | Compare mode selector (Budget / Prev Month / Prev Quarter / Prev Year) | UI | `src/app/(dashboard)/variance/variance-client.tsx` | Partial (UI only — backend only handles budget compare) |
| 29 | Period-over-period variance explainer (account-level drivers) | Calculation | `src/lib/analysis/variance.ts` → `explainVariance()` | Working (no page link) |
| 30 | Account-level variance driver decomposition | Calculation | `src/lib/analysis/variance.ts` | Working |
| 31 | Variance drill-down page | UI | `src/app/(dashboard)/variance/drill-down/page.tsx` | Stub only |
| 32 | Budget vs actual subpage | UI | `src/app/(dashboard)/variance/budget/page.tsx` | Stub only |
| 33 | VisualiseButton on variance page | UI | `src/app/(dashboard)/variance/variance-client.tsx` | Working |
| 34 | Rate limiting + token budget on variance AI calls | Security | `src/app/api/variance/[orgId]/route.ts` | Working |
| 35 | Governed output audit trail for variance AI | Governance | `src/app/api/variance/[orgId]/route.ts` | Working |
| 36 | Forecast page (3 tabs: Overview / Assumptions / Scenarios) | UI | `src/app/(dashboard)/forecast/forecast-client.tsx` | Working |
| 37 | Budget entry UI | UI | None found | Missing |
| 38 | Budget template creation | Data | None found | Missing |
| 39 | Budget template reuse / copy forward | Data | None found | Missing |
| 40 | Multi-period budget (FY budget with monthly spread) | Data | None found | Missing |
| 41 | Department / cost centre budgets | Data | None found | Missing |
| 42 | Rolling forecast (actuals replace past periods) | Calculation | None found | Missing |
| 43 | Forecast accuracy tracking (MAPE / bias) | Analytics | None found | Missing |
| 44 | Budget import (CSV / spreadsheet) | Data | None found | Missing |
| 45 | AI budget suggestion from actuals | AI | None found | Missing |
| 46 | Forecast chart (the component from audit 05) | UI | `src/components/scenarios/forecast-chart.tsx` (scenario module) | Working (in scenario module, not forecast page) |

---

## Benchmark Tables

### 1. Budget Creation and Management

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Allow users to create a financial budget (expected income and expenditure by category and period), edit it, and save it for comparison against actuals |
| **What it's trying to achieve** | "Here is what I planned to spend and earn this month — show me how I performed against that plan" |
| **Who needs it** | Business owner (primary — every SME should have a budget), advisor (sets budget on behalf of client), investor |
| **Best in class** | **Fathom HQ** — Fathom has a fully integrated budget management layer tied to its three-way forecast. Budgets are built using the same driver-based model as forecasts, which means budgets and forecasts share the same logic. Fathom includes "Forecast Snapshots" which lock a version of the budget at a point in time (e.g. "FY2025 budget approved on 1 April") for permanent comparison. Each budget line item can have a note/rationale attached. Budget appears in reports automatically alongside actuals and forecast. |
| **How they achieved it** | Fathom uses the forecast model as the budget: users set a "locked" snapshot of a forecast as the budget baseline. This eliminates a separate budget-entry workflow — the forecast IS the budget until locked. After locking, actuals flow in automatically from Xero and the variance is calculated nightly. |
| **Runner up** | **Vena** — Excel-native budget entry using pre-configured templates. Departments submit budgets through a workflow. Admin consolidates. Cell-level audit trail on every budget cell change. Template version control (can compare "Budget v1" vs "Budget v2"). |
| **Current Advisory OS state** | **Critically partial.** The `budget_lines` table exists and the API (`GET`/`POST` `/api/budget/[orgId]`) works. `upsertBudgetLines()` in `src/lib/variance/engine.ts` can write budget lines with category + period + budgeted_amount. The variance calculation engine can then compare these against actuals. However: there is NO budget entry UI anywhere in the application. The `/variance/budget/page.tsx` is a static stub reading "Upload a budget or connect your accounting software." Users cannot enter, edit, or manage a budget from the UI — the API exists in isolation. |
| **Gaps vs competitors** | (1) Zero budget entry UI — users cannot create or edit a budget through the application at all. (2) No budget template system — users must POST raw JSON to the API (developer-only). (3) No "copy last year's budget" or "use forecast as budget" shortcut. (4) No multi-period budget (the schema allows per-period lines, but no UI to enter 12 months at once). (5) No department-level budgeting — `budget_lines` only has `category` (P&L category, not department). (6) No budget import from CSV/Excel. (7) No approval workflow — advisor can set a budget without client sign-off. (8) No budget lock / version snapshots (separate from scenario lock). |
| **AI opportunity** | Very high — AI could draft an initial budget from 12 months of Xero actuals: "Based on your performance over the last year, here is a suggested budget for the next 12 months. Adjust any line." This eliminates the blank-page problem that prevents most SMEs from ever creating a budget. Token cost: ~3,000–5,000 tokens per org per budget generation. Cache system prompt. Use Sonnet. |
| **Non-finance user test** | **1/5** — A business owner cannot create a budget at all without technical access. The variance page shows "No budget data found" with no path to fix it. This is a complete dead end for self-service users. |
| **Claude Finance alternative** | High — a user could upload 12 months of Xero CSV to Claude and ask for a budget. But the result has no governance (no audit trail, no version locking, no integration with variance reporting). The Advisory OS value is the governed, persistent budget layer. |
| **Leverage existing tools?** | Budget entry in Xero native is limited — Xero does not have a formal budgeting module that Advisory OS can read. Fathom reads Xero budgets, but this requires Fathom subscription. A Google Sheets template with an import button is a workable bridge but does not provide governance. |
| **Token efficiency** | AI budget suggestion: ~4,000 tokens per org, called once per budget cycle (monthly or annually). Extremely low frequency. Cache system prompt. |
| **Build recommendation** | **BUILD** — Budget entry UI is a prerequisite for the entire variance analysis module having any real-world utility. Without it, variance analysis is a technically working but practically useless feature. |
| **Priority** | **P0** — The variance page shows "No budget data found" to every user. This is a visible gap that blocks variance analysis entirely for self-service users. |
| **Defensibility** | Medium on its own. High when combined with AI-drafted budget from actuals + governed lock + audit trail — that combination is not found in any competitor at the SME advisory level. |

---

### 2. Budget vs Actual Variance Analysis

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Compare budgeted amounts against Xero actuals for a selected period, classify variances as favourable/adverse/on-target, flag material variances (>10% or >£5,000), generate AI explanation |
| **What it's trying to achieve** | "Tell me where I over- or under-performed against my plan, and why" |
| **Who needs it** | Business owner (primary — monthly review), advisor (monthly client review), investor |
| **Best in class** | **DataRails** — Click any data point in the dashboard → variance breakdown panel opens immediately. Compare to: previous year, previous month, budget, any custom period. Breakdown by: department, account, entity, cost centre, any defined dimension. Variance threshold suppression: <10% suppressed to avoid noise. Click any variance → see all underlying transactions (Excel-style drill-down). "Add variance breakdown as new dashboard widget" with one click. The mechanism: DataRails keeps a live copy of all actuals + budgets in a columnar store, so variance breakdown is a UI-layer operation with zero server round-trips. |
| **How they achieved it** | Unified data model with budget and actual co-located. Variance is a derived column, not a separate calculation pass. Drill-through to transactions uses the same ERP data connector — no separate query. Threshold suppression is configurable at dashboard level, not hardcoded. |
| **Runner up** | **Fathom HQ** — Plan-vs-actual variance views with 50+ KPI dimensions. Comparatives selectable (budget, prior year, etc.). Drill-down to account level. The key differentiator: Fathom generates a "Conditional Commentary" — if variance exceeds threshold, an AI commentary block appears inline in the report, not in a separate panel. |
| **Current Advisory OS state** | **Working — functionally competitive on core mechanics, thin on UX depth.** `calculateVariances()` in `src/lib/variance/engine.ts` correctly: fetches budget lines and actuals, builds P&L via `buildPnL()`, maps to categories, calculates variance in pence, classifies direction by category semantics (revenue vs cost), applies 10% / £5,000 materiality thresholds. The `VarianceClient` UI provides period and compare-mode selectors (Budget / Prev Month / Prev Quarter / Prev Year), 4 summary KPI cards, `VarianceTable` with favourable/adverse/on-target badges, and `VarianceDetail` with a budget/actual/variance bar chart. AI explanation (Haiku, executive summary) is available via POST. Deeper `explainVariance()` in `src/lib/analysis/variance.ts` decomposes to account-level drivers with AI insight. Governance: rate limiting, token budget, `governedOutput` audit checkpoint, and `companyContextPrefix` for AI grounding. |
| **Gaps vs competitors** | (1) Compare mode selector in UI offers 4 options, but the backend `calculateVariances()` only handles `budget` compare — Prev Month / Prev Quarter / Prev Year modes exist in the dropdown but the variance route does not switch logic based on the `compare` query param. (2) Drill-down page (`/variance/drill-down`) is a static placeholder — the `explainVariance()` function in `src/lib/analysis/variance.ts` exists but is not wired to any page or route. (3) No transaction-level drill-through — DataRails shows the actual Xero transactions contributing to a variance. Grove shows account-level drivers but not individual transactions. (4) No inline variance commentary in reports — AI explanation requires a separate button click. (5) No variance trend chart (how has revenue variance trended over 12 months?). (6) No department-level variance (budget lines are P&L category only, not by department/cost centre). (7) Variance percentage calculation has a subtle bug: `(variancePence / Math.abs(budget.budgeted_amount)) * 100` is then divided by 100 again in `roundCurrency()` — resulting in percentages stored as fractions (0.15 instead of 15) but displayed by multiplying by 100 again in `VarianceTable` — this double-handling needs audit. (8) No CSV/Excel export of variance report. |
| **AI opportunity** | High — current AI explains WHY a variance occurred (retrospective). The next layer is predictive: "Based on this adverse variance in operating expenses, your year-end profit is now projected to be £X lower than budget. You need to reduce spend by £Y per month to recover." Token cost: ~2,000 tokens per explanation, called on-demand. Use Haiku for the executive summary, Sonnet for the detailed forward-looking assessment. |
| **Non-finance user test** | **3/5** — The variance table is readable with clear colour coding (green/red) and "Favourable"/"Adverse" badges. The 4 summary cards are instantly understandable. The detail bar chart is clear. Missing: a plain-English paragraph at the top explaining the overall picture ("You came in £3,200 under budget this month — mainly because marketing spend was lower than planned") before the user even looks at the table. The AI executive summary exists but requires a POST call that is not yet triggered automatically on page load. |
| **Claude Finance alternative** | Moderate — a user could ask Claude to compare a Xero export against a budget spreadsheet. But Claude Finance has no persistent governance, no materiality rules, no audit trail, and no ability to track variance trends over time. Advisory OS's governed layer is the differentiator. |
| **Leverage existing tools?** | Xero's native reports include a budget vs actual view, but it is read-only with no AI layer, no materiality flags, no advisor governance, and no history. Advisory OS's variance page should EXCEED Xero native. Currently it is approximately equal, but without the budget entry UI, it is worse (Xero lets you enter a budget natively). |
| **Token efficiency** | Executive summary: ~500–1,000 tokens per period per org (Haiku). Deep explanation per line: ~1,500–2,500 tokens (Sonnet). Rate limited at the route level. Token budget enforced. Caching: system prompt cached. Very efficient. |
| **Build recommendation** | **FIX** — Fix compare-mode backend logic, wire drill-down page to `explainVariance()`, add auto-trigger of AI executive summary on page load, investigate percentage calculation double-handling. |
| **Priority** | **P0** — The compare-mode disconnect (UI says "Prev Month" but backend ignores this) is a credibility bug. The drill-down page being a stub means the most useful variance feature (account-level decomposition) is invisible to users. |
| **Defensibility** | **High** — The combination of materiality thresholds + AI explanation grounded in actual transactions + governance audit trail exceeds what DataRails and Fathom provide at the SME level. The moat widens when Business Context Profile is injected into variance AI calls (currently missing — same gap as in scenario planning). |

---

### 3. Rolling Forecasts

| Dimension | Assessment |
|-----------|------------|
| **What it does** | A rolling forecast continuously updates the forecast horizon as time passes — when January closes, it drops off and February of next year is added, always maintaining (e.g.) a 12-month forward view grounded in the latest actuals |
| **What it's trying to achieve** | Replace the static annual budget with a living forecast that reflects reality as the year unfolds |
| **Who needs it** | Advisor and business owner — increasingly standard in modern FP&A practice |
| **Best in class** | **Jirav** — Rolling forecasts are a first-class feature. "Dynamic adaptation to shifting business environments." The forecast horizon auto-extends as periods close. The base for each new month is the most recently closed actuals, not the original budget assumptions. Jirav's Auto-Forecast uses ML to incorporate seasonality and trends into the rolling baseline. Users can compare rolling forecast to original annual budget to track "forecast vs original plan" drift. |
| **How they achieved it** | Rolling forecast is a database view, not a separate model: the forecast model always looks forward from the last closed actuals period. As Xero syncs new actuals, the forecast recalculates automatically from the new last-closed period. No manual intervention required. |
| **Runner up** | **Planful** — Explicit "Rolling Forecasts" feature in the product suite. Described as "dynamic adaptation to shifting environments." Supports 12-, 18-, and 24-month rolling horizons. Enterprise workflow for updating rolling forecast assumptions with approval gate. |
| **Current Advisory OS state** | **Missing as a concept.** The `generateForecast()` function always starts from "next month from now" (`startPeriod` = next calendar month, hardcoded in the generate route). It uses the last 6 months of actuals as base rates via `fetchBaseRates()`. This is effectively a "regenerate from scratch" model — not a rolling forecast. When a user regenerates the forecast in February, it does not incorporate January actuals as a new confirmed period — it simply uses January in the base rate average. The `compareForecastToActuals()` function exists in `engine.ts` and correctly computes forecast-vs-actuals variance, but it has no UI and is not called from any page. There is no "lock last period, extend horizon by one month" mechanism. |
| **Gaps vs competitors** | (1) No rolling forecast concept — each generation is a fresh start, not an incremental update. (2) No mechanism to "close" a period (mark it as actuals, lock the forecast for that period). (3) No forecast vs original plan comparison — once regenerated, the prior forecast is replaced. (4) `compareForecastToActuals()` has no UI — users cannot see how accurate last month's forecast was. (5) No automatic forecast regeneration trigger when Xero sync completes. (6) No 12-month / 18-month / 24-month rolling horizon config — always 1–36 months from now. |
| **AI opportunity** | High — when a period closes, AI could explain: "Your January forecast was £48,000 revenue. Actual was £51,200 — 6.7% higher. Driven by a large project invoice that was not in the forecast assumptions. Your forecast for February through April has been revised upward by 4% to reflect this new run rate." This is the FP&A automation that SME owners currently pay fractional CFOs for. Token cost: ~3,000 tokens per month-close event. |
| **Non-finance user test** | **N/A (feature does not exist)** — A business owner would need to understand to manually click "Generate Forecast" each month after Xero syncs. The concept of "your forecast updates automatically" is what non-finance users expect. |
| **Claude Finance alternative** | Low — Claude Finance cannot maintain a persistent rolling forecast. Each conversation starts fresh. Governance (audit trail, version history, accuracy tracking) requires Advisory OS infrastructure. |
| **Leverage existing tools?** | Xero's Syft-powered Cash Flow Forecast offers up to 180-day rolling cash forecasting, but only for cash (not P&L). Advisory OS should position as the P&L and BS rolling layer above Xero's cash-only view. |
| **Token efficiency** | Rolling forecast trigger on sync completion: ~2,000 tokens per regeneration. Low-frequency (monthly). Batch with the monthly summary generation. Use Sonnet. |
| **Build recommendation** | **BUILD** — Rolling forecast requires three additions: (1) a "close period" action that locks actuals for a period and extends the forecast by one month, (2) a comparison view showing forecast accuracy for each closed period, (3) an automatic regeneration trigger after Xero sync. This is P1 architectural work that materially changes the value proposition of the forecast module. |
| **Priority** | **P1** — The absence of rolling forecasts makes the forecast module feel like a one-time report rather than a live financial planning tool. |
| **Defensibility** | Medium — rolling forecasts are common. Advisory OS's moat is the governed layer: locked period actuals, immutable forecast snapshots per period, accuracy tracking over time. Jirav and Planful do rolling forecasts but without governance at this depth. |

---

### 4. Forecast Accuracy Tracking

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Measure how accurate past forecasts were — compare what was predicted to what actually happened, track forecast error over time, identify systematic biases in assumptions |
| **What it's trying to achieve** | "Is my forecast model trustworthy? Am I consistently over- or under-forecasting revenue?" |
| **Who needs it** | Advisor (validates model quality for institutional reporting), investor (trust in forecasts), business owner (calibrate expectations) |
| **Best in class** | **Mosaic (Bob Finance)** — Automated forecast vs. actuals breakdowns with trend. Shows "forecast vs actual" as a running metric. Highlights which line items are consistently over/under-forecast. Variance % tracked per metric per period. "Forecast accuracy score" surfaced on the board materials dashboard. The mechanism: Mosaic stores every forecast snapshot with a timestamp. When actuals arrive, the variance is computed and stored against the forecast snapshot row. |
| **How they achieved it** | The `forecast_snapshots` table stores `forecast_value`, `actual_value`, `variance`, `variance_pct` per period per metric. Accuracy reporting is a query over this table: MAPE (mean absolute percentage error) per metric per rolling window. |
| **Runner up** | **Jirav** — Plan-vs-actual variance views with rolling forecast visualisations. Accuracy is implicit in the variance view but not surfaced as an explicit score. |
| **Current Advisory OS state** | **Data layer exists, UI layer missing.** `src/lib/scenarios/snapshots.ts` → `persistForecastSnapshots()` stores `forecast_value`, `actual_value`, `variance`, `variance_pct` to the `forecast_snapshots` table. The data structure is correct and well-designed. `compareForecastToActuals()` in `src/lib/forecast/engine.ts` computes variances for revenue, COGS, and opex across all forecast periods. However: neither of these is connected to any user-facing page or chart. The accuracy data is written but never read. There is no MAPE calculation, no accuracy score, no "your forecast has been X% accurate over the last 6 months" display. |
| **Gaps vs competitors** | (1) No accuracy score / MAPE calculation despite having all the data needed. (2) No UI for forecast accuracy — `compareForecastToActuals()` is an orphaned function. (3) No bias detection (systematic over-forecasting of revenue, systematic under-forecasting of costs). (4) No accuracy trend chart (is the forecast getting more or less accurate over time?). (5) No per-assumption accuracy tracking (which assumption is most frequently wrong?). (6) `forecast_snapshots` table is populated by the scenario pipeline (`persistForecastSnapshots()`) but the legacy `engine.ts` route does NOT call this — forecasts generated via the `/api/forecast/generate` route are stored in `forecasts` table but their actuals comparison is never persisted to `forecast_snapshots`. |
| **AI opportunity** | High — when accuracy data accumulates, AI can make meta-observations: "Your revenue forecasts have consistently been 8–12% optimistic over the last 6 months. Would you like me to apply a conservative adjustment factor to your next forecast?" This is a powerful trust-building feature. Token cost: ~2,000 tokens per monthly accuracy review. |
| **Non-finance user test** | **N/A (feature does not exist as UI)** — An advisor would value accuracy tracking enormously for institutional credibility. A business owner would not use this directly but would benefit from the advisor's improved forecast quality. |
| **Claude Finance alternative** | Low — Claude Finance cannot maintain historical accuracy records across sessions. |
| **Leverage existing tools?** | No existing tool provides this for SME advisory at the governance depth Advisory OS is targeting. |
| **Token efficiency** | Monthly accuracy review: ~2,000 tokens per org. Very low frequency. |
| **Build recommendation** | **BUILD** — The data layer exists. A single new page at `/forecast/accuracy` reading from `forecast_snapshots` with a MAPE calculation and chart would complete this feature. Moderate effort, high advisor value. |
| **Priority** | **P1** — Forecast accuracy is what converts the forecast from a "nice to have" into an institutional-grade tool that advisors can stand behind. |
| **Defensibility** | **High** — Combining governed forecast snapshots (immutable, timestamped) with accuracy tracking and AI bias analysis is not found in any SME advisory tool. This is an advisory moat feature. |

---

### 5. Budget Templates and Reuse

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Pre-built budget structures that users can start from (e.g., "retail business budget", "professional services budget"), and the ability to copy a prior period's budget forward with adjustments |
| **What it's trying to achieve** | Eliminate the blank-page problem — most SMEs never create a budget because starting from scratch is overwhelming |
| **Who needs it** | Business owner (template removes the blank-page blocker), advisor (creates budgets for multiple clients using standard starting points) |
| **Best in class** | **Vena** — Pre-configured templates for balance sheet, income statement, departmental variance, and detailed views. Template version control with audit trail. One-click version comparison ("Budget v1 vs Budget v2"). Template inheritance — a child entity can inherit a parent template and override specific lines. Vena Copilot can draft a budget template from a verbal description. |
| **How they achieved it** | Templates are defined as structured spreadsheet schemas in Vena's OLAP engine. Template inheritance uses a hierarchy — child entities override parent cells without duplicating the entire structure. Version control uses the same cell-level audit trail as regular budgets. |
| **Runner up** | **Jirav** — Industry-specific templates: SaaS, professional services, nonprofits, manufacturing. Templates include pre-wired driver relationships (e.g., SaaS template auto-connects ARR to headcount to opex via driver formulas). |
| **Current Advisory OS state** | **Missing entirely.** No budget template system exists anywhere in the codebase. The `budget_lines` table has no `template_id` foreign key, no `is_template` flag, no `source` field. The `src/lib/blueprints/` folder contains `registry.ts` and `templates.ts` (for playbook blueprints), but these are unrelated to financial budgets. The `src/lib/reports/templates.ts` exists for report templates, also unrelated. No template-related routes exist under `/api/budget/`. |
| **Gaps vs competitors** | (1) No budget templates at all — new budget always starts blank. (2) No "copy last year forward" or "inflate last year by X%" shortcut. (3) No "use base forecast as budget" shortcut (this would be trivial to implement via the existing forecast engine). (4) No industry/sector-specific starting points. (5) No multi-client template reuse for advisors (create a "retail client budget template" and use it for all retail clients). |
| **AI opportunity** | Very high — AI could generate a budget template from: (a) the business's Xero actuals history, (b) the business type from the onboarding interview, (c) a verbal description from the user. "Generate a budget for my florist business" → Claude produces a 12-line budget with GBP amounts based on the user's Xero history and sector benchmarks. Token cost: ~5,000 tokens per generation. Use Sonnet. |
| **Non-finance user test** | **N/A (does not exist)** — The blank-page budget is the core blocker for non-finance user adoption. Templates directly address this. |
| **Claude Finance alternative** | Moderate — Claude could generate a budget template from a description. But it has no access to the user's Xero history and no ability to persist and version the result. |
| **Leverage existing tools?** | A Google Sheets template with import could serve as a bridge. But this requires the user to know the correct column format, which is too technical for non-finance users. |
| **Token efficiency** | Budget template generation: ~5,000 tokens per org per creation event (rare). Very low cost. |
| **Build recommendation** | **BUILD** — Implement: (1) "Generate AI budget from my actuals" on the budget page, (2) "Copy last period's budget forward" action, (3) "Use my latest forecast as budget" shortcut. These three actions cover 90% of real-world budget creation patterns without needing a full template library. |
| **Priority** | **P1** — Templates are blocked by the budget UI gap (P0-1 above). Once budget entry UI exists, templates become the first enhancement. |
| **Defensibility** | Medium — templates are commodity. Differentiation is in AI-generated templates that leverage Xero history and business context — this combination is not found in any competitor. |

---

### 6. Multi-Period Budgeting (Annual Budget with Monthly Spread)

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Create a full-year budget (12 months) in a single workflow, with the ability to spread annual totals across months (evenly, seasonally, or manually), and view the full-year picture |
| **What it's trying to achieve** | "Plan my entire financial year at once, not month by month" |
| **Who needs it** | Business owner (annual planning cycle), advisor (sets client's annual plan at the start of each financial year) |
| **Best in class** | **DataRails** — Full year budget entry with Excel-native row/column format (rows = line items, columns = months). Aggregation toggle: view as monthly, quarterly, or annual. Seasonality distribution: apply a seasonal profile to spread an annual total across months. Version control: save "Budget v1", "Budget v2". Compare multiple budget versions. The mechanism: DataRails uses Excel as the input layer — the annual budget is a 12-column spreadsheet row entry, exactly as finance teams already work. |
| **How they achieved it** | Excel passthrough — the annual budget is entered in Excel (native to finance teams) and DataRails syncs it into the platform. The aggregation and comparison are platform-layer operations. No new UX is needed because the users already know how to use Excel. |
| **Runner up** | **Planful** — Structured planning with 12-month input grid. Department submissions rolled up to corporate. Rolling horizon option. Approval workflow per submission. |
| **Current Advisory OS state** | **Missing as a UI concept.** The `budget_lines` table has one row per `(org_id, category, period)`, which is technically capable of storing 12 rows for 12 months. The `POST /api/budget/[orgId]` endpoint accepts an array of lines, so a single API call could create a 12-month budget. But there is no UI to enter 12 months at once, no annual totals with monthly spread, no seasonal distribution, and no annual summary view. Each month would need to be entered separately if any UI existed at all (which it does not). |
| **Gaps vs competitors** | (1) No annual budget input grid (12-column month view). (2) No seasonal spread distribution. (3) No annual totals with auto-monthly breakdown. (4) No multi-year budget horizon (2-3 year plan). (5) No budget calendar / budget cycle management (when does the annual budget process start and end?). |
| **AI opportunity** | Medium — AI could propose the seasonal distribution: "Based on your Xero history, your revenue is typically 35% higher in Q4. Would you like me to apply this seasonal pattern to your budget?" Token cost: ~2,000 tokens. Use Haiku. |
| **Non-finance user test** | **N/A (does not exist)** — A 12-month grid with AI-populated starting values would be the most practical budget UX for a business owner. |
| **Claude Finance alternative** | Low — persistent multi-period planning requires the platform layer. |
| **Leverage existing tools?** | A Google Sheets integration where advisors maintain the budget spreadsheet and Advisory OS imports it would be a practical Phase 1 bridge while the native UI is built. |
| **Token efficiency** | Seasonal distribution suggestion: ~2,000 tokens. Annual budget generation: ~5,000 tokens. Very low frequency. |
| **Build recommendation** | **BUILD** — A 12-column monthly budget grid is the MVP annual planning feature. Target Fathom's pattern: use the forecast as the budget baseline, allow manual override per cell, lock when approved. This reuses the existing forecast engine and avoids building a separate planning system. |
| **Priority** | **P1** — Annual multi-period budgeting is the primary use case for most advisors. Monthly-only budgeting is a significant capability gap. |
| **Defensibility** | Low on its own — table stakes feature. Moat is in the AI-assisted seasonal spread and the governance lock on the approved budget. |

---

### 7. Department / Entity Budgets

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Budget by department, cost centre, or subsidiary entity — allowing different budget owners, variance reporting sliced by department, and consolidated roll-up |
| **What it's trying to achieve** | "Marketing overspent by £3,000 — which department is responsible?" |
| **Who needs it** | Business owner with multiple departments or revenue streams, advisor managing entities with departments, investor reviewing portfolio companies |
| **Best in class** | **Jirav** — Department-level planning with department head submissions. Each department head receives their own input template. Submissions roll up to the consolidated P&L. Variance is reported both by department and consolidated. Auto-alerts when a department's submission is overdue. The mechanism: Jirav uses "dimensions" — every budget line is tagged with a department dimension, which enables slicing variance views by department without separate data entry. |
| **How they achieved it** | Dimension-based data model: budget lines have a `department` attribute in addition to `category` and `period`. Variance is computed by filtering on the dimension. This requires no separate budget per department — it is a view filter over the unified budget. |
| **Runner up** | **DataRails** — Breakdown by: department, account, entity, cost centre, any defined dimension. Variance drill-down selects the dimension on the fly. Department-level budget vs actual is a standard DataRails report template. |
| **Current Advisory OS state** | **Missing entirely.** The `budget_lines` table schema has no `department` or `cost_centre` column. The variance engine maps actuals to budget by `category` (P&L category like `revenue`, `operating_expenses`) — there is no dimension-based filtering. All variance is reported at the consolidated P&L level only. The chart of accounts in Xero contains tracking categories which map to departments, but Advisory OS does not currently use these. |
| **Gaps vs competitors** | (1) No department dimension on budget lines. (2) No cost centre tracking. (3) Xero tracking categories (which represent departments in Xero) are not imported or used. (4) No department-level variance report. (5) No department budget submission workflow. (6) No budget roll-up from department to consolidated. |
| **AI opportunity** | Medium — with Xero tracking categories imported, AI could automatically categorise transactions by department and compare against department budgets without user data entry. |
| **Non-finance user test** | **N/A (does not exist)** — Small businesses (1–20 employees) often do not have formal departments, so this is less critical than multi-period budgeting. More important for advisors with larger clients (50+ employees). |
| **Claude Finance alternative** | Low — departmental budgeting requires persistent dimension data that cannot be maintained in a stateless Claude conversation. |
| **Leverage existing tools?** | Xero tracking categories are the natural source for department dimensions. Importing tracking categories from Xero and applying them to budget lines would unlock department-level variance without building a separate department management module. |
| **Token efficiency** | No AI cost for the dimensional budget feature itself. AI cost only for commentary generation when department dimensions are available. |
| **Build recommendation** | **LEVERAGE + BUILD** — Phase 1: import Xero tracking categories as the department dimension. This unlocks department-level variance reporting from existing Xero data. Phase 2: add department column to `budget_lines` schema and enable department-level budget entry. |
| **Priority** | **P2** — Important for advisor credibility with larger clients, but not a Day 1 SME blocker. Single-entity consolidated budgeting is the P0/P1 priority. |
| **Defensibility** | Low — department budgeting is table stakes in FP&A. Advisory OS's moat is not in the feature itself but in connecting it to the governance and AI layers. |

---

### 8. Forecast Visualisation (Forecast Page Chart)

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Display the forecast output as interactive line charts for Revenue, Net Profit, and Cash Position. Show base forecast vs scenario overlay in dashed lines. Display P&L summary table for first 6 months. |
| **What it's trying to achieve** | "Show me where the business is going" — the visual proof that the forecast model is working and meaningful |
| **Who needs it** | All user types — the first thing anyone looks at when they open the forecast |
| **Best in class** | **Runway** — Side-by-side charts for multiple scenarios simultaneously on one canvas. Actuals and forecast are visually distinct (solid vs dashed, with a clear "Today" vertical marker). Hovering shows the exact value and the driver formula that produced it. Zooming and panning on the chart axis. Annotations can be placed at specific data points. Actuals are auto-populated from integrations so the "Today" line is always at the correct position. |
| **How they achieved it** | Runway's chart is built on a custom React canvas renderer (not Recharts/Victory), which allows arbitrary annotation placement, smooth zoom/pan, and formula trace-back on hover. The "Today" marker is computed from the Xero last-synced date. |
| **Runner up** | **Fathom HQ** — Charts are interactive with hover tooltips. Up to 36 months on one chart. Period selector changes chart granularity (monthly, quarterly, annual). Actuals shown as bars, forecast as lines — visually clear separation. Budget displayed as a step line. The mechanism: all three (actuals, budget, forecast) are rendered on the same Recharts-equivalent chart with distinct visual encodings. |
| **Current Advisory OS state** | **Working — functional but minimal.** Three separate mini-chart cards (Revenue Trend, Net Profit Trend, Cash Position) using `recharts` `LineChart`. Each chart is 192px tall. The scenario overlay works: dashed lines in the same colour as the base forecast. The P&L summary table shows 5 rows × 6 periods. A confidence score and generation timestamp are displayed in the header. Quick scenario prompt buttons are provided. Voice input is available. Limitations: the three charts are separate (no unified canvas), no "Today" vertical marker, no actuals vs forecast visual separation, no zoom/pan, no hover drill-through to assumption formula. The `ForecastChart` component in `src/components/scenarios/forecast-chart.tsx` (used in the scenario module) is more fully featured but is not used on the forecast page — the forecast page has its own inline chart code. |
| **Gaps vs competitors** | (1) Three separate small charts instead of one unified multi-metric chart. (2) No "Today" / "Actuals end here" vertical marker — user cannot visually distinguish historical from projected data on the chart. (3) No actuals line on the forecast chart — the chart shows projected revenue from next month, but the last 6 months of actuals are not shown as context. (4) P&L table shows only 6 months — the full 12–36 month forecast is not visible without scrolling, which is not possible in the current table. (5) No ability to toggle which metrics are shown on the chart. (6) No zoom or pan. (7) The `ForecastChart` component from the scenario module is not reused on the forecast page despite being more capable. |
| **AI opportunity** | Medium — chart annotation can be AI-generated: Claude identifies the most significant inflection point in the forecast and places a plain-English annotation ("Your cash position turns negative in month 8 — this is driven by the capex assumption in month 6"). Token cost: ~1,000 tokens. Use Haiku. |
| **Non-finance user test** | **3/5** — Three small charts and a table are comprehensible. The chart labels (period strings like "2026-03") are technical but acceptable. What's missing: the visual narrative of "this is history, this is the future" — without a Today marker and actuals context, the chart looks like an abstract projection disconnected from reality. |
| **Claude Finance alternative** | Low — interactive charts require the platform layer. |
| **Leverage existing tools?** | `recharts` is already in use. The more capable `ForecastChart` from the scenario module should be extracted into a shared component and reused on the forecast page — no new library needed. |
| **Token efficiency** | Chart annotation: ~1,000 tokens per chart per view. Use Haiku. Cache per forecast version (regenerate only when forecast changes). |
| **Build recommendation** | **FIX** — (1) Extract `ForecastChart` from scenario module into a shared component, (2) Show last 6 months of actuals + projected periods on one chart with a vertical "Today" divider, (3) Extend P&L table to show full forecast horizon with horizontal scroll. |
| **Priority** | **P1** — The forecast page is a key demo screen. The "Today" divider and actuals context are the single most important visual improvements. |
| **Defensibility** | Low — chart visualisation is not a moat. The moat is in what the chart represents (governed, Xero-grounded, auditable forecast). |

---

### 9. AI-Powered Budget / Forecast Suggestions

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Use Claude to generate budget line amounts, forecast assumptions, or explanations of the financial model automatically from Xero actuals data |
| **What it's trying to achieve** | Remove the expertise barrier to budgeting and forecasting — "I don't know what to put in my budget" |
| **Who needs it** | Business owner (primary — the blank-page problem), advisor (speed up client budget setup) |
| **Best in class** | **Jirav** — "Jirav Intelligent Forecasting (JIF)": single toggle generates forecasts automatically using historical data + seasonality + trends. No manual assumption entry required. The mechanism: statistical models (regression, moving average, seasonality decomposition) run on historical Xero/QBO data and produce a forecast automatically. User can then adjust. This is the opposite of Advisory OS's approach (assumptions first) — Jirav starts with a statistical forecast and lets you override. |
| **How they achieved it** | ML-based auto-forecast runs on ingested data. It uses seasonality decomposition (isolates seasonal pattern from trend) and exponential smoothing for trend extrapolation. Output is a forecast grid that is immediately viewable and editable. |
| **Runner up** | **DataRails Planning Agent** — "Fast ad-hoc forecasting via the AI agent." User can ask "forecast my Q3 revenue" and the agent returns a projected number grounded in actuals. The mechanism: LLM with access to the consolidated data model. Response is structured enough to feed back into the planning grid. |
| **Current Advisory OS state** | **Partial — NL scenario parsing exists, auto-forecast does not.** `parseScenarioFromNaturalLanguage()` in `src/lib/forecast/scenarios.ts` uses Claude to parse a what-if query into assumption overrides. The `generateForecast()` function in `src/lib/forecast/engine.ts` uses a simple linear regression on the last 6 months of actuals to set the default growth rate. This is a basic statistical baseline — not AI-powered in the Jirav sense. There is no "generate my budget from actuals" AI action anywhere in the application. The variance AI (Haiku for executive summary, Sonnet for detailed explanation) is working well but focused on explaining the past, not suggesting the future. |
| **Gaps vs competitors** | (1) No AI-powered budget generation from actuals. (2) No statistical seasonality decomposition — linear regression only. (3) No "one-click forecast" from historical data (Jirav JIF equivalent). (4) NL scenario parsing works but does not use onboarding context (same gap as scenario planning audit G1). (5) No AI-generated budget rationale ("I set marketing at £5,000/month because your last 6 months averaged £4,800 and you told me you want to grow").  |
| **AI opportunity** | Very high — "Generate my budget" is the highest-value single AI action in the budgeting module. Workflow: (1) Pull last 12 months of Xero actuals, (2) Claude analyses patterns and seasonality, (3) Claude returns a structured budget grid with line-by-line rationale, (4) User reviews and approves each line (governed confirmation pattern from scenario module). Token cost: ~8,000–12,000 tokens per budget generation (Sonnet). Called once per budget cycle. Estimated cost: £0.03–0.07 per budget. |
| **Non-finance user test** | **N/A (does not exist)** — "Generate my budget" as a single button would be the single most impactful feature for non-finance users. |
| **Claude Finance alternative** | Moderate — Claude Finance can draft a budget from a Xero CSV export, but lacks the governed persistence and confirmation workflow. |
| **Leverage existing tools?** | No — this requires Advisory OS's Xero data access and governed output layer. |
| **Token efficiency** | Budget generation: ~10,000 tokens per org per annual event (Sonnet). Annual frequency = negligible cost. |
| **Build recommendation** | **WRAP** — Claude API call with governed UI: (1) POST `/api/budget/[orgId]/generate` using Xero actuals as context, (2) Claude returns structured budget lines with rationale, (3) User reviews each line with confirm/reject (reuse ProposalCard pattern from scenario module), (4) Confirmed lines written to `budget_lines` table via existing upsert. |
| **Priority** | **P1** — This is the completion of the budget module. The API layer works. The AI pattern (propose → confirm) is proven in the scenario module. Applying it to budget generation unlocks the entire budget workflow for non-finance users. |
| **Defensibility** | **High** — The governed confirmation pattern (propose → user confirms → audit log) applied to AI budget generation is not found in any competitor. DataRails and Jirav auto-generate, but without governance gates. |

---

## Competitive Feature Matrix — Forecasting & Budgeting

| Feature | DataRails | Fathom | Syft | Jirav | Runway | Mosaic | Puzzle | Planful | Vena | Cube | Claude Finance | Existing Tools | Grove (current) |
|---------|-----------|--------|------|-------|--------|--------|--------|---------|------|------|---------------|----------------|-----------------|
| Budget entry UI | ● | ● | ○ | ● | ◐ | ◐ | ○ | ● | ● | ◐ | ◐ | ◐ (Xero) | ○ |
| Budget vs actual variance | ● | ● | ◐ | ● | ◐ | ◐ | ○ | ● | ● | ● | ◐ | ○ | ◐ |
| Variance drill-down to transactions | ● | ◐ | ○ | ◐ | ◐ | ◐ | ○ | ● | ◐ | ◐ | ○ | ○ | ○ |
| AI variance explanation | ● | ● | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ◐ | ● | ◐ | ○ | ● |
| Period-over-period variance | ● | ● | ◐ | ◐ | ◐ | ◐ | ◐ | ● | ● | ◐ | ◐ | ◐ (Xero) | ◐ |
| Materiality thresholds | ● | ◐ | ○ | ○ | ○ | ○ | ○ | ◐ | ◐ | ◐ | ○ | ○ | ● |
| Rolling forecast | ● | ● | ◐ | ● | ● | ◐ | ○ | ● | ● | ◐ | ○ | ○ | ○ |
| Forecast accuracy tracking | ◐ | ◐ | ○ | ◐ | ○ | ● | ○ | ◐ | ◐ | ○ | ○ | ○ | ○ (data only) |
| Three-statement forecast | ● | ● | ◐ | ● | ● | ◐ | ○ | ● | ● | ◐ | ◐ | ○ | ◐ |
| AI budget generation | ◐ | ○ | ○ | ● | ○ | ○ | ○ | ○ | ● | ◐ | ◐ | ○ | ○ |
| Budget templates | ● | ◐ | ○ | ● | ○ | ◐ | ○ | ● | ● | ◐ | ○ | ○ | ○ |
| Multi-period annual budget | ● | ● | ◐ | ● | ◐ | ◐ | ○ | ● | ● | ◐ | ○ | ○ | ○ |
| Department / entity budgets | ● | ● | ● | ● | ◐ | ◐ | ○ | ● | ◐ | ◐ | ○ | ○ | ○ |
| Seasonal distribution | ◐ | ● | ○ | ● | ◐ | ○ | ○ | ◐ | ◐ | ○ | ○ | ○ | ○ |
| Budget lock / approval | ◐ | ◐ | ○ | ◐ | ○ | ○ | ○ | ● | ● | ○ | ○ | ○ | ○ |
| Budget import (CSV/XLS) | ● | ◐ | ○ | ◐ | ○ | ○ | ○ | ● | ● | ◐ | ○ | ○ | ○ |
| AI forecast suggestions | ◐ | ○ | ○ | ● | ◐ | ○ | ○ | ◐ | ● | ◐ | ◐ | ○ | ◐ |
| "Today" divider on forecast chart | ◐ | ● | ○ | ● | ● | ◐ | ○ | ◐ | ◐ | ○ | ○ | ○ | ○ |
| Governed budget audit trail | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ◐ | ● | ◐ | ○ | ○ | ◐ |
| AI budget confirm gate | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| Forecast-to-budget shortcut | ◐ | ● | ○ | ◐ | ◐ | ○ | ○ | ◐ | ◐ | ○ | ○ | ○ | ○ |

● = Full | ◐ = Partial | ○ = Not present

---

## Gap Analysis

### Critical Gaps (block the core value proposition)

**B-G1. No budget entry UI — the variance module is entirely self-blocking**
`/variance/budget/page.tsx` is a static placeholder. `/variance/page.tsx` shows "No budget data found. Set up budget lines to see variance analysis." The API and calculation engine are complete and working, but there is no path for any user (technical or non-technical) to create a budget through the UI. Every user who navigates to Variance Analysis hits a dead end. This is not a minor gap — it makes the entire variance analysis section non-functional for 100% of users in production.

**B-G2. Compare mode selector is disconnected from backend logic**
The `VarianceClient` UI offers four compare modes (Budget, Previous Month, Previous Quarter, Same Month Last Year). The backend `calculateVariances()` function only accepts budget lines — it does not have logic for period-over-period comparison. The `compare` query parameter sent by the client is ignored. Users who switch to "Previous Month" see the same budget-vs-actual output as "Budget" mode, which is confusing and potentially misleading. The `explainVariance()` function in `src/lib/analysis/variance.ts` correctly handles period-over-period variance, but it is disconnected from the variance API route entirely.

**B-G3. Drill-down page is a static stub — the most powerful variance feature is invisible**
`/variance/drill-down/page.tsx` contains only a placeholder card. `explainVariance()` in `src/lib/analysis/variance.ts` already decomposes variance to the account level with AI-generated insight (including drivers, impact, direction, and AI insight paragraph). This is the equivalent of DataRails' click-through drill-down — it is fully implemented in the library layer but has no UI surface, no API route, and is not called from any page. This is approximately 80% built functionality that is 0% accessible.

**B-G4. No rolling forecast — the forecast model is a point-in-time report, not a living plan**
Every forecast generation starts from scratch ("next month from now") without incorporating recently closed actuals as confirmed periods. There is no concept of "closing" a month. The `compareForecastToActuals()` function exists but has no UI. The forecast page does not show whether the last month's forecast was accurate. The platform presents a projection as if the current month has not yet occurred, even when months have closed with actual data. This makes the forecast feel like a calculator output rather than a continuously updated financial plan.

**B-G5. Forecast accuracy data is generated but never surfaced**
`forecast_snapshots` table is populated by the scenario pipeline with `forecast_value`, `actual_value`, `variance`, `variance_pct`. `compareForecastToActuals()` in `engine.ts` computes variances for revenue, COGS, and opex. Neither is connected to a page, chart, or API response that a user can access. The accuracy infrastructure is fully built and deliberately designed — it just has no output surface. This is critical for advisor credibility ("how accurate are our forecasts?") and for building institutional trust with investors.

---

### Significant Gaps (reduce competitiveness vs key rivals)

**B-G6. Forecast chart shows no actuals — there is no "Today" divider**
The three mini-charts on the forecast page (`/forecast`) show projected periods only. Users cannot see historical context alongside the projection on the same chart. Fathom, Runway, Jirav, and DataRails all show actuals up to today as solid lines transitioning into projected lines past a "Today" or "Actuals End" vertical marker. Without this, the chart is contextless — a user cannot see whether the forecast is a continuation of an upward trend or a return from a recent dip.

**B-G7. Legacy forecast engine and scenario pipeline are two parallel systems with diverging capabilities**
Audit 05 identified this as "P1 architectural" and it remains unaddressed. `src/lib/forecast/engine.ts` has a more complete Balance Sheet model (receivables, payables, fixed assets, long-term debt, retained earnings). `src/lib/scenarios/calculations.ts` has better governance (assumption hash, model versions, immutable snapshots). The `/api/forecast/scenario` route still calls the legacy engine. The `/api/scenarios/[id]/run` route calls the newer pipeline. Users who generate a scenario from the forecast page get a different (and less governed) output than users who run from the scenarios page. This inconsistency will compound as new features are added to one engine but not the other.

**B-G8. AI variance explanation is not auto-triggered — requires manual action**
The AI executive summary (POST `/api/variance/[orgId]`) is not called when the variance page loads. Users must manually click something to trigger it (and the current UI doesn't make this trigger clear). Fathom's AI Commentary appears automatically. DataRails' Insights are configurable to show on load. The current UX requires a finance-literate user to know to look for the AI explanation, which defeats the purpose of having it for non-finance owners.

**B-G9. Business Context Profile not injected into variance AI calls**
The variance AI uses `getCompanyContextPrefix(orgId)` which provides some business context, but this is not the full onboarding business profile. The `explainVariance()` system prompt in `src/lib/analysis/variance.ts` includes `companyContext` but does not receive seasonality patterns, business type, owner goals, or key concerns from the interview. A variance explanation for a bridal business in January (always a quiet month) should say "January revenue is typically 35% below average for this sector — this adverse variance is consistent with seasonal expectations." Without the business profile, the AI gives generic advice.

**B-G10. No budget import path — technical users only**
The only way to create budget lines is via `POST /api/budget/[orgId]` with a JSON body, which requires API access. There is no CSV import, no Excel import, no copy-from-Xero, and no copy-forward-from-prior-period. Vena, DataRails, Planful, and Jirav all provide multiple import paths. For advisors managing dozens of clients, this is a significant friction point.

**B-G11. Variance percentage double-handling in the calculation**
In `src/lib/variance/engine.ts`, `variancePercentage` is calculated as `(variancePence / Math.abs(budget.budgeted_amount)) * 100` and then passed through `roundCurrency()` which divides by 100. In `VarianceTable`, the displayed value is `(line.variance_percentage * 100).toFixed(1)%`. If `roundCurrency` divides by 100, then `variance_percentage` is stored as a decimal (e.g., 0.15 for 15%), and the display correctly multiplies by 100. But if `roundCurrency` does NOT divide by 100, then the stored value is 15 and the display shows 1500%. This needs a code audit to confirm the actual behaviour and add a comment to document the convention.

---

### Minor Gaps (quality of life)

**B-G12. Forecast P&L table shows only 6 months of a potentially 36-month forecast**
`forecast-client.tsx` slices `.slice(0, 6)` on all P&L arrays. Users with a 12- or 36-month forecast cannot see the full output without a separate page or export. A horizontal scroll or pagination on the table would expose the full forecast with minimal effort.

**B-G13. Forecast "Generate" button requires admin role — viewers cannot see an existing forecast**
`handleGenerate()` is gated behind `isAdmin` check. But `fetchLatest()` runs for all roles and shows the cached forecast. The UX gap: a `viewer` role user who opens the forecast page with no prior forecast sees "No forecast generated yet" with no generate button — just a dead end. The empty state should differentiate between "no forecast exists" and "you don't have permission to generate one" and provide a call-to-action to contact the admin.

**B-G14. NL scenario query box in the forecast page uses dollar sign in placeholder**
`forecast-client.tsx` placeholder text: `'e.g. "What if I hire 2 developers at $60K each?"'` — uses `$60K` not `£60K`. This is inconsistent with the UK-first design principle in `CLAUDE.md`. Multiple quick scenario buttons also reference `$5K/month each` and `$50K` amounts.

**B-G15. Forecast module has no link to the scenario module**
The Forecast page has a "Scenarios" tab for NL scenario queries, but it uses the legacy `src/lib/forecast/scenarios.ts` engine rather than routing users to the fully-featured scenario module at `/scenarios`. Users who create scenarios via the forecast page will not see them in the `/scenarios` list. There are now three paths for scenario creation (Forecast tab, `/scenarios` CRUD, `/scenarios/[id]/interpret`) that write to different tables (`forecast_scenarios` vs `scenarios` + `assumption_sets`). This is a navigation and data-model coherence problem.

**B-G16. The `/variance/budget` sub-page stub is reachable but useless**
`/variance/budget/page.tsx` is a rendered page with navigation (back link to `/variance`) but only contains a placeholder card. If a user navigates to it directly (e.g. from a bookmark or old link), they see no useful content and no clear path forward. Either implement it or redirect to `/variance`.

**B-G17. No export from variance report**
Users cannot export the variance report as CSV, PDF, or Excel. DataRails, Fathom, Planful, and Vena all provide export from variance views. For advisors, exporting the variance report for client meetings or board packs is a standard workflow.

---

## Prioritised Recommendations

### P0 — Must Ship (blocks core value proposition)

**P0-1: Build budget entry UI**
- New page: `/budget` or integrate into `/variance` as a "Setup" tab
- Components needed: `BudgetEntryForm` (category selector + amount input per period), `BudgetGrid` (12-column month view for annual budget), `BudgetSummaryCard`
- Wire to existing `POST /api/budget/[orgId]` endpoint
- Add "AI-suggest budget from my actuals" button that calls a new `POST /api/budget/[orgId]/generate` route
- The `generate` route: fetch last 12 months of actuals via `fetchBaseRates()` pattern, call Sonnet with business context, return structured budget lines using ProposalCard pattern from scenario module for user confirmation
- No other budget feature can be used until this exists

**P0-2: Fix compare-mode disconnect in variance backend**
- File: `src/app/api/variance/[orgId]/route.ts` — add `compare` query param handling
- `compare=prev_month`: shift `period` back by one month, compute variance against that period using `buildPnL()` for both months (this is already implemented in `explainVariance()` in `src/lib/analysis/variance.ts` — reuse that pattern)
- `compare=prev_quarter`: compute average of 3 prior months
- `compare=prev_year`: use same month in the prior year
- `compare=budget` (default): current behaviour (correct)
- Wire `/variance/drill-down/page.tsx` to call `explainVariance()` — most of the work is already done in the library

**P0-3: Wire drill-down page to `explainVariance()` and the deep AI explanation**
- File: `src/app/(dashboard)/variance/drill-down/page.tsx` — replace stub with a real page
- Accept `metric` and `period` query params
- Call `explainVariance()` from `src/lib/analysis/variance.ts`
- Render `AIExplanationCard` with `VarianceExplanation` output (drivers table + AI insight paragraph)
- The `VarianceTable` already has `onSelectLine` prop — wire this to navigate to `/variance/drill-down?metric=X&period=Y`
- This converts the "click row for detail" action into the genuine DataRails-equivalent drill-down that is already 80% implemented

---

### P1 — Should Ship (competitive parity with Fathom / Jirav)

**P1-1: Add "Today" divider and actuals context to forecast chart**
- File: `src/app/(dashboard)/forecast/forecast-client.tsx`
- Fetch last 6 months of actuals via Xero sync data
- Prepend actuals to chart data with `isActual: true` flag
- Add a `ReferenceLine` at today's date (Recharts provides this)
- Style actuals as solid lines, projections as dashed lines
- Reuse `ForecastChart` component from `src/components/scenarios/forecast-chart.tsx` instead of inline chart code

**P1-2: Build rolling forecast "close period" mechanism**
- New API: `POST /api/forecast/close-period` — marks a period as closed (actuals are final), extends forecast horizon by one month, stores accuracy data to `forecast_snapshots`
- Trigger: auto-run after Xero sync when a new month's actuals are present
- UI: "Close January" button on forecast page when actuals are available for a period
- Update `generateForecast()` to accept `closedPeriods` array — treat those periods as actuals and start projection from the last closed period

**P1-3: Build forecast accuracy page**
- New page: `/forecast/accuracy`
- Reads from `forecast_snapshots` table
- Displays: MAPE per metric (revenue, gross profit, net profit), accuracy trend chart (last 12 months), worst-forecast months, AI commentary on systematic biases
- Adds a new `GET /api/forecast/accuracy/[orgId]` route that computes MAPE from `forecast_snapshots`

**P1-4: Auto-trigger AI executive summary on variance page load**
- File: `src/app/(dashboard)/variance/variance-client.tsx`
- After `fetchVariance()` succeeds and `report` is set, automatically call `POST /api/variance/${orgId}` with the top 5 material variances
- Store the result in a `aiSummary` state variable
- Render a `CalloutCard` at the top of the variance page with the AI summary (narrative first, table second — per CLAUDE.md design principle)
- Collapsed by default on mobile, expanded on desktop

**P1-5: Inject Business Context Profile into variance AI calls**
- File: `src/app/api/variance/[orgId]/route.ts` — supplement `companyContextPrefix` with full business profile from `business_theses` / interview data
- File: `src/lib/analysis/variance.ts` → `explainVariance()` — same injection pattern as recommended in scenario planning audit P0-1
- Specifically adds: seasonality expectations ("January is typically quiet for this business type"), business model context ("this is a service business — COGS should track revenue"), owner goals ("the owner is focused on reducing fixed costs")

**P1-6: Consolidate legacy forecast engine into the scenario pipeline**
- As flagged in Audit 05 (P1 architectural), `src/lib/forecast/engine.ts` and `src/lib/forecast/scenarios.ts` should be deprecated
- Migrate Balance Sheet model from `engine.ts` into `src/lib/scenarios/calculations.ts`
- Redirect `src/app/api/forecast/generate` and `src/app/api/forecast/scenario` to use the governed pipeline
- Migrate forecast page to read from `model_snapshots` instead of `forecasts` table
- This resolves B-G7 and ensures one canonical forecast engine with governance

---

### P2 — Post-Launch (advisor polish and depth)

**P2-1: Budget templates — "generate from actuals" and "copy forward"**
- After P0-1 (budget entry UI) is live, add three shortcuts: (1) "Generate budget from last 12 months of Xero data" (AI-drafted, user confirms line by line), (2) "Copy last period's budget forward with X% uplift", (3) "Use my latest forecast as budget" (calls `getLatestForecast()` and maps periods to budget lines)
- These three shortcuts cover 90% of real-world budget creation patterns

**P2-2: Multi-period annual budget grid**
- After P0-1, add a 12-column annual budget view
- Rows = P&L categories, Columns = months (Jan–Dec)
- Seasonal spread: "Apply seasonal pattern from last year's actuals" auto-fills monthly amounts from annual total using last year's monthly distribution
- Annual totals row at bottom

**P2-3: Variance report export (CSV + PDF)**
- Add `Download CSV` and `Download PDF` buttons to variance page
- CSV: uses browser `download` API with `VarianceReport` data serialised as CSV
- PDF: uses the existing `src/lib/reports/pdf.ts` infrastructure (already in the codebase)

**P2-4: Department / Xero tracking category dimensions**
- Import Xero tracking categories as department dimension during sync
- Add `department` column to `budget_lines` schema (nullable, backward compatible)
- Add department selector to variance page for filtering
- Long-term: add department column to `normalised_financials` from Xero tracking categories

**P2-5: Variance trend chart (12 months)**
- New chart on variance page: "Revenue Variance Trend" showing variance % for the selected category over the last 12 months
- Highlights months above materiality threshold in amber
- Uses existing `normalised_financials` data — no new data fetch needed

---

## Architectural Concerns

**AC-1: Two parallel forecast engines create inconsistent governance**
The `forecasts` table (legacy engine output) and `model_snapshots` table (scenario pipeline output) are populated by different code paths and have different schemas. A forecast generated via `/api/forecast/generate` is not governed (no assumption hash, no model version, no `forecast_snapshots` row). A scenario run via `/api/scenarios/[id]/run` is fully governed. Users accessing `/forecast` vs `/scenarios` get different governance guarantees without knowing it. Resolution: complete the pipeline consolidation flagged in Audit 05.

**AC-2: `budget_lines` table uses `as any` type casts throughout**
In both `src/lib/variance/engine.ts` and the budget route, Supabase queries for `budget_lines` use `from('budget_lines' as any)` and cast results with `as unknown as BudgetLine[]`. This indicates the table is not yet in the Supabase TypeScript type definitions (`Database` type). Consequence: no type safety on budget operations, no IDE autocompletion, potential runtime mismatches. Resolution: add `budget_lines` to the Supabase type definitions.

**AC-3: `variance_percentage` storage convention is undocumented and possibly buggy**
As noted in B-G11, the `variance_percentage` field in `VarianceLine` is computed as `(variancePence / Math.abs(budget.budgeted_amount)) * 100` and then fed to `roundCurrency()`. If `roundCurrency` treats the value as a pence amount and divides by 100 (which it should not, since it's a percentage), the stored value will be 0.15 for 15%. The display code multiplies by 100 to get the displayed percentage. This works if and only if the convention is consistently applied. A unit test for this calculation is essential. The convention should be explicitly documented with a `// percentage stored as decimal (e.g. 0.15 for 15%)` comment.

**AC-4: The `forecast_snapshots` table is populated by the scenario pipeline but not by the legacy forecast engine**
`persistForecastSnapshots()` in `src/lib/scenarios/snapshots.ts` is called from the scenario pipeline. The `generateForecast()` function in `src/lib/forecast/engine.ts` does NOT call this — it only inserts to the `forecasts` table. Consequence: forecast accuracy tracking only works for scenarios run through the new pipeline, not for base forecasts generated via the forecast page. Rolling forecast and accuracy features cannot be built on top of the legacy engine.

**AC-5: No database schema for budget templates, seasonal profiles, or multi-period budget metadata**
The current `budget_lines` schema (`org_id`, `category`, `period`, `budgeted_amount`) is the minimal viable structure for single-period per-category budgets. It has no columns for: `template_id`, `department`, `version`, `status` (draft/approved/locked), `seasonal_profile_id`, `source` (manual/ai-generated/imported). Adding these retrospectively is straightforward with nullable columns, but planning the full schema before the budget entry UI is built will avoid migrations mid-development.

---

## Summary Lists

### BUILD
- **Budget entry UI** — the foundational gap blocking the entire variance module; build a category/period grid with AI-draft shortcut using the ProposalCard confirm pattern already proven in the scenario module
- **Rolling forecast close-period mechanism** — mark periods as closed, extend horizon, store accuracy; transforms the forecast from a one-shot report into a living financial plan
- **Forecast accuracy page** — read from `forecast_snapshots` (already populated), compute MAPE, display accuracy trend; moderate effort, high advisor credibility value
- **Variance drill-down page** — wire `/variance/drill-down` to `explainVariance()` in `src/lib/analysis/variance.ts`; 80% built, just needs a UI surface and an API route
- **"Today" divider on forecast chart** — prepend actuals to chart, add Recharts `ReferenceLine`, reuse `ForecastChart` component; the single most impactful visual improvement on the forecast page

### FIX
- **Compare mode backend disconnect** — implement Prev Month / Prev Quarter / Prev Year logic in the variance API route; the UI dropdown misleads users
- **`budget_lines` TypeScript type registration** — remove `as any` casts, add table to Supabase type definitions
- **`variance_percentage` convention audit** — add unit test, add documentation comment, confirm display code is consistent
- **Dollar signs in forecast placeholder text and quick scenarios** — replace `$` with `£` throughout `forecast-client.tsx`
- **`/variance/budget` stub** — either implement or redirect to `/variance` to avoid dead-end navigation
- **Forecast empty state for non-admin viewers** — differentiate "no forecast exists" from "you can't generate one" with appropriate messaging

### LEVERAGE
- **`ForecastChart` component from scenario module** — already built and more capable; extract to `src/components/forecast/forecast-chart.tsx` shared location and use on both forecast page and scenario detail page instead of maintaining two separate chart implementations
- **`ProposalCard` / confirm pattern for budget AI suggestions** — the governed proposal-confirm workflow is already production-ready in the scenario module; apply identically to AI-drafted budget lines
- **`explainVariance()` in `src/lib/analysis/variance.ts`** — fully implemented with account-level driver decomposition and AI insight; just needs an API route and a page to surface it
- **`compareForecastToActuals()` in `src/lib/forecast/engine.ts`** — forecast accuracy comparison is implemented; needs a UI page and a connection to `forecast_snapshots`
- **`src/lib/reports/pdf.ts`** — existing PDF infrastructure can export the variance report with minimal additional code

### SKIP
- **Department / entity budgets (Phase 1)** — complex dimensional schema change with low SME demand; defer until Xero tracking categories are imported (prerequisite) and the core budget UI is stable
- **Budget approval workflow (multi-party)** — Vena/Planful pattern; relevant for larger clients but overkill for SME advisory MVP; add post-Series A when enterprise clients require it
- **Full Excel-native budget import** — DataRails/Vena Excel passthrough; the target Advisory OS user is not an Excel-native finance professional; a simple CSV import (P2) is sufficient for MVP
- **Statistical seasonality decomposition (ML-based, Jirav JIF style)** — the linear regression baseline in `fetchBaseRates()` is adequate for SME forecasting; a full ML seasonality engine is disproportionate investment relative to user need; the AI-powered seasonal spread suggestion (P2-2) using last year's Xero actuals achieves 80% of the value at 5% of the cost
- **Multi-entity budget consolidation** — Planful / DataRails enterprise feature; park for Phase 2 (advisor portal multi-client consolidation)
