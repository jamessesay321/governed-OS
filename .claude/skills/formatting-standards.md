# Skill: Formatting Standards

## Purpose
Every number on every page must be formatted consistently. No raw decimals, no missing currency symbols, no mixed formats. A user should never see "252730.43" next to "£844,493".

## When to Apply
- BEFORE any page is marked "done"
- AFTER any UI change that renders numbers
- When reviewing any financial component

## Mandatory Formatting Rules

### Rule 1: Currency Values
- Import from: `@/lib/formatting/currency`
- Function: `formatCurrency(amount, currencyCode)`
- Display: £252,730 (0 decimals for whole), £252,730.50 (2 decimals for fractional)
- For P&L tables and summaries: ALWAYS use 0 decimals (round to nearest pound)
- For transaction-level detail: 2 decimals allowed
- NEVER: raw `.toLocaleString()`, `.toFixed(2)`, or custom formatters

### Rule 2: Compact Currency (Charts, Cards)
- Function: `formatCurrencyCompact(amount)`
- Display: £252K, £1.3M, £800
- Use on: chart axes, KPI cards, summary badges

### Rule 3: Percentages
- Function: `formatPercent(value, isDecimal)`
- Display: 42.3% (1 decimal max, no trailing zeros)
- NEVER: manual `${(value * 100).toFixed(1)}%`

### Rule 4: DrillableNumber Component
- Must use `formatCurrency` internally (not its own formatter)
- Set `wholeNumbers: true` for P&L/BS/CF tables
- Must include currency symbol (£)
- Must be drillable (clickable) on every financial value

### Rule 5: Chart Tooltips
- Recharts Tooltip `formatter`: `(value: unknown) => formatCurrency(Number(value ?? 0))`
- NEVER: `(value: number) => ...` (causes TypeScript errors)
- Chart Y-axis: `tickFormatter={chartAxisFormatter()}`

### Rule 6: Negative Numbers
- P&L losses: show in red, format as (£5,200) or -£5,200
- Variances: green for favourable, red for unfavourable
- NEVER: just a minus sign with no color indicator

## Files to Audit
Every `.tsx` file in:
- `src/app/(dashboard)/` (all pages)
- `src/components/dashboard/` (all widgets)
- `src/components/kpi/` (all KPI components)
- `src/components/financial/` (all financial components)

## Audit Checklist
For each file:
1. [ ] All currency values use `formatCurrency` or `formatCurrencyCompact`
2. [ ] No raw `.toFixed()` on monetary values
3. [ ] No local `formatCurrency` or `formatMoney` functions
4. [ ] All percentages use `formatPercent`
5. [ ] Recharts tooltips use `(value: unknown) =>` signature
6. [ ] DrillableNumber has `wholeNumbers: true` for summary tables
7. [ ] Negative values have red color indicator
8. [ ] Currency symbol (£) appears on ALL monetary values

## Known Violations Fixed
- DrillableNumber was using local `toLocaleString` without £ symbol (fixed: now uses unified formatCurrency)
- Income statement period cells showed decimals (fixed: wholeNumbers flag)
- Multiple Recharts tooltip formatters had `(value: number)` causing TS errors (fixed: `(value: unknown)`)
