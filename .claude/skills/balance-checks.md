# Skill: Balance Checks & Cross-Statement Validation

## Purpose
Ensure every financial number displayed on the platform is internally consistent.
Like a balance sheet where Assets = Liabilities + Equity, every section total must
equal the sum of its line items, every cross-statement reference must agree, and
every drill-down must explain 100% of its parent — not 99.5%.

## Non-Negotiable Rules

1. **100% Explained**: Every section total must equal the sum of its line items exactly (within £0.01 rounding). If it doesn't, show a reconciliation warning — never silently hide the difference.

2. **Balance Sheet Equation**: Assets = Liabilities + Equity. If this doesn't hold, block display and show error. No exceptions.

3. **P&L Section Totals**: Revenue section total must equal sum of all revenue account rows. COGS total must equal sum of all direct cost rows. Same for OpEx. Show green checkmark when balanced.

4. **Cross-Statement Consistency**: Net Profit on the P&L must equal the movement in retained earnings on the Balance Sheet for the same period. If they diverge, flag as critical.

5. **Drill-Down Completeness**: When a user drills into any number, the sub-items MUST sum to 100.0% of the parent. If they sum to 99.2%, that 0.8% needs to be identified and shown as "Other / Rounding".

## Balance Check Types

### Type 1: Intra-Statement (within one report)
- P&L: line items sum to section total
- P&L: GP = Revenue - COGS
- P&L: Net Profit = GP - OpEx - Finance Costs - Tax
- Balance Sheet: A = L + E
- Cash Flow: Opening + Net Change = Closing

### Type 2: Cross-Statement (between reports)
- P&L Net Profit = Balance Sheet Retained Earnings movement
- P&L Revenue ≈ Cash Flow Operating Receipts (with timing adjustments)
- Balance Sheet Cash = Cash Flow Closing Balance

### Type 3: Source Verification (platform vs accounting system)
- Platform P&L vs Xero P&L Report (per-line reconciliation)
- Platform Balance Sheet vs Xero Balance Sheet Report
- Platform Trial Balance = sum of all account movements

### Type 4: Business Logic Checks
- Gross margin within industry range (from sense-check.ts)
- Revenue with zero COGS → flag
- Profitable but negative equity → flag
- Loss-making but no finance costs when debt exists → flag
- Expenses > 2x revenue → flag as anomaly

## Implementation

### Where Checks Run
1. **Server-side** in `page.tsx` — compute check results alongside P&L data
2. **Deterministic** — all checks are pure functions, no AI
3. **Always visible** — show check status on every financial page (green ✓ or red ✗)
4. **Never suppress** — even if the user hasn't asked, show the status

### Key Files
- `src/lib/intelligence/sense-check.ts` — Runtime intelligence flags
- `src/lib/financial/post-sync-reconciliation.ts` — Post-sync deep checks
- `src/lib/financial/reconcile.ts` — Account-level Xero reconciliation
- `src/lib/financial/sense-check.ts` — Lightweight validation per page
- `src/components/dashboard/pnl-table.tsx` — Shows % and reconciled status per section

### Display Pattern
```
Revenue                    ✓    £137,828.00
  208  Consultation Income  0.2%   £208.33
  214  Shopify Sales        98.9%  £136,456.12
  218  Bridal Bespoke       0.8%   £1,107.55
  220  Shipping Income      <0.1%  £56.00
       4 accounts           100.0% Reconciled
```

The `✓` on the section header means all line items sum to 100%.
The footer row confirms the total percentage and "Reconciled" status.

## When to Apply
- Every P&L table render
- Every balance sheet render
- Every drill-down panel open
- Every financial export/report generation
- After every Xero sync
- Before every board pack generation
