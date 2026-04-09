# Skill: Account Completeness Audit

## Purpose
Every financial page must show a COMPLETE picture. If expected accounts or sections are missing, flag it BEFORE a user sees the page. A P&L without interest expense is as dangerous as a P&L with wrong numbers.

## When to Apply
- BEFORE marking any financial feature as "done"
- AFTER changes to normalisation, aggregation, or chart_of_accounts
- When building any new page that displays financial data
- At session start — run the checklist mentally against current state

## Expected Account Structure (UK SME — FRS 102)

### P&L — Required Sections
| Section | Xero Classes | Must Have If... |
|---------|-------------|-----------------|
| Revenue | REVENUE, OTHERINCOME | Always |
| Cost of Sales | DIRECTCOSTS | Business sells products/services |
| Gross Profit | Calculated | Always (Revenue - COGS) |
| Operating Expenses | EXPENSE | Always |
| Overheads | OVERHEADS | Business has fixed costs |
| Finance Costs | Derived from debt | Business has loans/MCAs/credit |
| Profit Before Tax | Calculated | Always |
| Corporation Tax | Calculated or actual | Business is profitable |
| Net Profit After Tax | Calculated | Always |

### Balance Sheet — Required Sections
| Section | Xero Classes | Must Have If... |
|---------|-------------|-----------------|
| Current Assets | ASSET (current) | Always |
| Non-Current Assets | ASSET (non-current) | Business owns equipment/property |
| Current Liabilities | LIABILITY (current) | Always |
| Non-Current Liabilities | LIABILITY (non-current) | Business has long-term debt |
| Equity | EQUITY | Always |

### Missing Account Detection Rules
1. **No DIRECTCOSTS accounts** → Flag: "Cost of Sales section is empty. Verify that Xero chart of accounts has DIRECTCOSTS class accounts mapped."
2. **No OVERHEADS accounts** → Flag: "Overheads section is empty. Most businesses have rent, utilities, or insurance."
3. **No interest/finance costs but debt_facilities has active records** → CRITICAL FLAG: "Business has £X in active debt but no finance costs in P&L."
4. **Revenue = 0 for a period with expenses** → Flag: "No revenue recorded. Check if Xero sync is complete."
5. **Only 1-2 expense accounts** → Flag: "Very few expense accounts. Verify Xero chart of accounts is fully mapped."

## Audit Script Pattern
```
For each period with data:
  1. Check: All 5 P&L sections have at least 1 account
  2. Check: Revenue > 0 (unless business is pre-revenue)
  3. Check: COGS > 0 (unless pure service business)
  4. Check: Finance Costs > 0 if debt_facilities.count > 0
  5. Check: At least 5 unique accounts across EXPENSE + OVERHEADS
  6. Check: Gross margin is between 0% and 95% (flag outliers)
  7. Check: Net profit direction matches debt service reality
```

## Alonuko-Specific Checks
- Must have DIRECTCOSTS (materials, fabric, labour)
- Must have OVERHEADS (studio rent, utilities)
- Must have Finance Costs (13+ active debt facilities)
- Expected account code ranges: 200-299 (revenue), 300-399 (COGS), 400-499 (expenses), 500-599 (overheads)
- Trunk show expenses: codes 570-574

## Files That Must Apply This Skill
Every file listed in financial-reconciliation.md, plus:
- `src/lib/financial/aggregate.ts` — buildPnL must validate section completeness
- `src/lib/financial/sense-check.ts` — add account completeness checks
- `src/lib/xero/normalise.ts` — verify all account classes are covered
