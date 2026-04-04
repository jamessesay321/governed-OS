# Narrative Financial Reporting Standard

## What This Is

This is the **mandatory communication standard** for every page in Advisory OS that shows financial data. It is based on the FP&A practice of Narrative Financial Reporting — the principle that **numbers without narrative are noise**.

Every financial page must tell a story, not just display a table. A non-finance business owner (the primary user) must be able to understand what the numbers mean, whether they're good or bad, and what to do about it — without needing an accountant to explain.

## The Three Layers

Every financial number on every page must have three layers:

### Layer 1: The Figure
- Formatted correctly (£ symbol, thousand separators, appropriate decimals)
- Using `formatCurrency()` from `@/lib/formatting/currency` — NEVER raw numbers
- Consistent precision: whole pounds for amounts over £1,000, 2dp for small amounts
- Negative numbers in red, positive in green where directional meaning exists

### Layer 2: The Context
Every figure must show at minimum ONE of these contextual comparisons:
- **vs prior period** (last month, last quarter, same month last year)
- **vs budget** (if budget exists)
- **% of total** (what proportion of the parent category)
- **Trend direction** (↑↓→ arrows with % change)
- **Margin %** (for P&L items: gross margin, net margin, OpEx ratio)

Visual encoding must be redundant — use BOTH colour AND icon AND label:
- Green + ↑ + "Favourable" for positive movements in revenue/profit
- Red + ↓ + "Adverse" for negative movements in revenue/profit
- Amber + → + "Watch" for changes near materiality thresholds

### Layer 3: The Narrative
Every financial page must have an **AI narrative summary** at the top that:
- Summarises the key story in 2-3 sentences of plain English
- Highlights the biggest movement and explains likely cause
- Flags anything that needs attention (material variances, unusual patterns)
- Uses the `NarrativeSummary` component with a page-specific narrative endpoint

## Page-Specific Requirements

### Income Statement (P&L)
- [ ] AI narrative summary at top: "Revenue grew X% this month driven by... but OpEx grew faster at Y%..."
- [ ] Every section (Revenue, COGS, Gross Profit, OpEx, Overheads, Net Profit) needs a one-line explanation subtitle
- [ ] Gross margin % and Net margin % shown inline on their respective rows
- [ ] Period-over-period change column with direction indicators
- [ ] Summary cards: Total Revenue, Gross Margin %, Net Margin %, OpEx Ratio
- [ ] Each account row is drillable to transactions (DrillableNumber)

### Balance Sheet
- [ ] AI narrative summary: "Total assets stand at £X, down Y% from last month. The business has £Z in net assets..."
- [ ] Health indicators: Current Ratio, Quick Ratio, Debt-to-Equity displayed as traffic-light badges
- [ ] Expandable sections with % of total column
- [ ] Period comparison with change column
- [ ] Accounting equation check (Assets = Liabilities + Equity)

### Cash Flow Statement
- [ ] AI narrative summary: "Operating cash flow was £X this month, a Y% decrease driven by..."
- [ ] Cash runway indicator: "At current burn rate, you have N months of runway"
- [ ] Burn rate trend (is it increasing or decreasing?)
- [ ] Operating/Investing/Financing breakdown with % of total
- [ ] Cash flow equation check footer
- [ ] Free Cash Flow calculation (Operating CF - CapEx)

### Executive Summary
- [ ] AI narrative as the LEAD element (above all numbers)
- [ ] 5 key metrics with bullet graphs showing position within range
- [ ] P&L waterfall chart
- [ ] Period comparison table (current vs last month vs last year)
- [ ] Quick links to detailed pages

### KPI Dashboard
- [ ] AI narrative summary of KPI health
- [ ] Each KPI card shows: value, trend, vs target, traffic-light status
- [ ] Sparkline showing 6-month trend on each card
- [ ] KPIs grouped by category (Profitability, Liquidity, Efficiency, Growth)
- [ ] Click-to-drill on every KPI value

### Variance Analysis
- [ ] AI narrative explaining the top 3 variances
- [ ] Materiality flags (>10% OR >£5,000)
- [ ] Direction indicators (favourable/adverse)
- [ ] Drill-down from every variance line to account-level detail

### Revenue Dashboard
- [ ] AI narrative: "Revenue is trending X over the last N months..."
- [ ] Revenue by stream/category breakdown
- [ ] MoM and YoY growth rates
- [ ] Revenue concentration risk (top customer %)

### Profitability Dashboard
- [ ] Gross margin trend with inline bullet bar
- [ ] Operating margin trend
- [ ] Cost structure breakdown (COGS vs OpEx vs Overheads as % of revenue)
- [ ] Break-even analysis

### Financial Health
- [ ] Liquidity ratios with traffic-light indicators
- [ ] Solvency ratios
- [ ] Cash runway
- [ ] Working capital trend

## Data Integrity Rules

1. **Numbers must tie across pages**: Revenue on P&L = Revenue on Executive Summary = Revenue on KPI Dashboard. If they don't match, there's a data flow bug.
2. **Every number traces to Xero**: The `source: Xero` and `synced: X ago` badge must appear on every page showing Xero data.
3. **Period consistency**: All pages must respect the global period selector. A number shown for "March 2026" must be the SAME March 2026 number on every page.
4. **No orphan pages**: If a page says "No data available" but other pages show data for the same period, that's a bug — not an acceptable state.

## Component Checklist

Every financial page MUST include these components:

| Component | Purpose | Import |
|-----------|---------|--------|
| `NarrativeSummary` | AI narrative at top | `@/components/dashboard/narrative-summary` |
| `formatCurrency` | Consistent number formatting | `@/lib/formatting/currency` |
| `DrillableNumber` | Clickable numbers with drill-down | `@/components/data-primitives` |
| `ChallengeButton` | Flag numbers for review | `@/components/shared/challenge-panel` |
| `CrossRef` | Links to related pages | `@/components/shared/in-page-link` |
| `FinancialTooltip` | Hover definitions for terms | `@/components/ui/financial-tooltip` |
| `DataFreshness` | Xero sync status badge | `@/components/dashboard/data-freshness` |

## Anti-Patterns (NEVER do these)

- ❌ Raw `number.toFixed(2)` or `number.toLocaleString()` — always use `formatCurrency()`
- ❌ Numbers without context (no comparison, no %, no trend)
- ❌ Tables without a narrative summary above them
- ❌ Financial terms without tooltip definitions
- ❌ "No data" messages when data exists on other pages for the same period
- ❌ Inconsistent decimal precision across the same page
- ❌ Colour-only indicators (must be colour + icon + label for accessibility)
- ❌ Pages without CrossRef links to related financial pages
- ❌ Pages without a Challenge button for governance
