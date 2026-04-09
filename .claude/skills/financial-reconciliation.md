# Skill: Financial Reconciliation

## Purpose
Ensure platform financial outputs match known reference data. Never show a number without validating it against the source system and business reality.

## When to Apply
- BEFORE any financial page is marked as "done"
- AFTER any Xero sync or data pipeline change
- AFTER any change to `normalised_financials`, `chart_of_accounts`, `aggregate.ts`, or any financial calculation
- At session start when financial pages are the focus

## Reconciliation Checks

### 1. P&L Completeness Check
Every P&L output must include ALL of these line items:
- Revenue (REVENUE + OTHERINCOME classes)
- Cost of Sales (DIRECTCOSTS)
- Gross Profit (Revenue - COGS)
- Operating Expenses (EXPENSE)
- Overheads (OVERHEADS)
- Finance Costs (interest from debt_facilities OR bank transaction interest accounts)
- Net Profit Before Tax (Operating Profit - Finance Costs)
- Corporation Tax (estimated or actual)
- Net Profit After Tax

**If Finance Costs is zero but debt_facilities has active facilities, FAIL.**
**If Corporation Tax is zero but the business is profitable, FLAG.**

### 2. Balance Sheet Equation
- Assets = Liabilities + Equity (must balance within £1)
- If out of balance, do NOT display — show error with explanation

### 3. Revenue Sanity Check
- Compare platform revenue against known reference (management accounts, Xero P&L report)
- For Alonuko: annual revenue should be ~£1.3-1.5M (FY2025)
- If platform shows >£2M, likely double-counting (Lesson 10)
- If platform shows <£1M, likely missing OTHERINCOME (Lesson 17)

### 4. Profit/Loss Direction
- Check debt_facilities: if total annual interest > operating profit, business is loss-making
- NEVER show "Net Profit" as positive when finance costs would make it negative
- This is the single most dangerous data error — it misleads the business owner

### 5. Period Coverage
- Every period with data should have balanced P&L
- Periods with zero revenue but positive expenses → flag as "incomplete data"
- Periods with expenses > 3x revenue → flag (unless seasonal business context says otherwise)

### 6. Cross-Reference with Xero
- At sync time, fetch Xero's own P&L summary (`/Reports/ProfitAndLoss`)
- Compare line-by-line: Revenue, COGS, GP, OpEx, Net Profit
- Flag any variance > 5% as "reconciliation issue"
- Store reconciliation results in audit log

## Implementation Pattern
```typescript
// In every financial page's server component:
const reconciliation = await reconcileWithReference(orgId, period);
if (reconciliation.hasErrors) {
  // Pass errors to client for display
  // DO NOT suppress — always show reconciliation status
}
```

## Files That Must Apply This Skill
- `src/app/(dashboard)/financials/income-statement/page.tsx`
- `src/app/(dashboard)/financials/balance-sheet/page.tsx`
- `src/app/(dashboard)/financials/cash-flow/page.tsx`
- `src/app/(dashboard)/financials/page.tsx` (summary)
- `src/app/(dashboard)/dashboard/dashboard-client.tsx`
- `src/app/(dashboard)/executive-summary/page.tsx`
- `src/app/(dashboard)/kpi/page.tsx`
- `src/app/(dashboard)/variance/page.tsx`
- `src/app/(dashboard)/breakeven/page.tsx`

## Known Issues (Alonuko)
- Interest expense missing from normalised_financials (bank transactions excluded)
- Fix applied: derive from debt_facilities table and inject as Finance Costs section
- Revenue potentially overstated due to deposit recognition (FRS 102 Section 23)
- OTHERINCOME was previously missing (fixed in F-094)
