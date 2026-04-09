# Skill: Drill-Down Coverage

## Purpose
Every financial number on every page must be clickable and drill to source data. No dead-end numbers. If a user can see a number, they must be able to trace it back to the Xero transactions that created it.

## When to Apply
- BEFORE marking any financial page as "done"
- AFTER wiring drill-down to a new page
- When building any component that displays financial data

## Coverage Requirements

### Every Financial Number Must:
1. Be wrapped in `DrillableNumber` component (or have an explicit click handler)
2. Pass correct `accountId` (UUID from chart_of_accounts.id, NOT account code string)
3. Have `drillable: true` set
4. Open the drill-down sheet with correct context on click
5. Show transactions grouped by source (invoice/bill)
6. Show account code, account name, transaction count

### Drill Context Types
| Type | When Used | Required Data |
|------|-----------|---------------|
| `account` | Individual account row | accountId (UUID), accountName, accountCode, amount, period |
| `pnl_section` | P&L section total (Revenue, COGS, etc.) | section.label, section.class, section.rows[], period |
| `kpi` | KPI card click | kpiKey, label, value, formattedValue, period |
| `variance` | Variance line | metric, current, previous, period |
| `custom` | Summary/calculated rows | label, description, components[] |

### Pages That Must Have Full Drill-Down
| Page | Status | What's Drillable |
|------|--------|-----------------|
| Income Statement | Must cover: section totals, individual accounts, GP, NP | Every number in the table |
| Balance Sheet | Must cover: asset/liability/equity account rows | Every account row |
| Cash Flow | Must cover: operating/investing/financing line items | Every line item with accountId |
| KPIs | Must cover: every KPI card | Click opens KPI detail with contributing accounts |
| Dashboard | Must cover: revenue, expenses, net profit cards | Click opens relevant drill context |
| Variance | Must cover: every variance line | Click shows period comparison |
| Executive Summary | Must cover: all metric values | Click opens relevant context |

### UUID vs Code Issue
The drill-down sheet fetches transactions using the account UUID from `chart_of_accounts.id`.
- CORRECT: `accountId: "a1b2c3d4-e5f6-..."` (UUID from chart_of_accounts.id)
- WRONG: `accountId: "400"` (account code string — will return empty results)
- The server component MUST pass the UUID through to the client
- Pattern: `{ id: r.accountId, name: r.accountName, code: r.accountCode }`

## Verification
For each page:
1. Click every number that should be drillable
2. Verify the drill-down sheet opens
3. Verify it shows accounts/transactions (NOT "0 accounts")
4. Verify amounts in drill-down sum to the clicked number
5. Close and verify no UI artifacts
