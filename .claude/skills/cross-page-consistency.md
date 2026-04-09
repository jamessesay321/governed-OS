# Skill: Cross-Page Consistency

## Purpose
The SAME metric must show the SAME number on EVERY page. Revenue on the dashboard, Income Statement, KPI page, Executive Summary, and Variance page must all match. A user who sees £844K on one page and £1.3M on another loses all trust instantly.

## When to Apply
- AFTER any change to data fetching, aggregation, or formatting logic
- BEFORE marking any financial page as "done"
- When building a new page that shows a metric already displayed elsewhere
- At session start — spot-check at least 3 pages for consistency

## Consistency Rules

### Rule 1: Single Source of Truth
Every financial metric must be computed from the SAME underlying query:
- Revenue: `normalised_financials WHERE account.class IN ('REVENUE', 'OTHERINCOME')`
- COGS: `normalised_financials WHERE account.class = 'DIRECTCOSTS'`
- OpEx: `normalised_financials WHERE account.class IN ('EXPENSE', 'OVERHEADS')`
- Finance Costs: `debt_facilities.annual_interest_amount / 12`
- Net Profit: Revenue - COGS - OpEx - Finance Costs

**No page may compute these differently.**

### Rule 2: Period Alignment
All pages must use the same period definition:
- Monthly: `period = 'YYYY-MM-01'` (first day of month)
- The global period selector determines which periods are shown
- Pages with local period controls must INIT from global and stay in sync

### Rule 3: Currency Formatting
ALL monetary values platform-wide must use:
- `formatCurrency()` from `@/lib/formatting/currency` for display
- `formatCurrencyCompact()` for chart axes and compact displays
- `formatPercent()` for percentages
- NO local formatting functions
- NO raw `toLocaleString()` or `toFixed()` for money

### Rule 4: Sign Convention
- Revenue: always POSITIVE
- Costs/Expenses: always POSITIVE in display (taken as absolute from Xero's negative debit convention)
- Net Profit: POSITIVE if profitable, NEGATIVE if loss-making
- Variances: POSITIVE if favourable, NEGATIVE if unfavourable

## Pages That Must Show Consistent Numbers

| Metric | Pages That Display It |
|--------|----------------------|
| Revenue | Dashboard, Income Statement, Executive Summary, KPIs, Variance, Breakeven, Revenue page |
| Gross Profit | Income Statement, Executive Summary, KPIs, Variance |
| Net Profit | Dashboard, Income Statement, Executive Summary, KPIs, Variance, Breakeven |
| Cash Position | Dashboard, Balance Sheet, Cash Flow, KPIs, Executive Summary |
| Gross Margin % | Income Statement, KPIs, Executive Summary, Profitability |
| Net Margin % | Income Statement, KPIs, Executive Summary, Profitability |
| Total Expenses | Income Statement, Costs page, Variance |

## Verification Process
After any data-touching change:
1. Open Income Statement — note Revenue, COGS, GP, OpEx, Net Profit
2. Open Dashboard — compare Revenue, Net Profit
3. Open KPIs — compare Revenue, Gross Margin, Net Margin
4. Open Executive Summary — compare all metrics
5. Open Variance — compare period figures

If ANY mismatch: STOP and fix before committing.

## Common Causes of Inconsistency
1. **Different account class filters** — one page includes OTHERINCOME, another doesn't
2. **Different sign handling** — one page uses Math.abs(), another doesn't
3. **Different period filtering** — one page includes all months, another filters by FY
4. **Stale data** — one page reads from cache, another from live query
5. **Finance costs included on one page but not another**
