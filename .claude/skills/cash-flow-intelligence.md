# Skill: Cash Flow Intelligence

## Purpose
The platform must understand not just WHETHER a business is cash-flow negative, but WHY. "Negative cash flow" has completely different implications depending on the cause:
- **Operationally unprofitable** → costs exceed revenue → survival threat
- **Profitable but debt-burdened** → operating profit exists but interest/principal eats it → restructuring opportunity
- **Growth investment** → deliberately burning cash for customer acquisition → strategic, with runway limit
- **Working capital trap** → profitable on paper but cash stuck in receivables → collection problem

Every page showing cash, profit, or runway must communicate the correct root cause.

## When to Apply
- BEFORE displaying any cash position, runway, or burn rate metric
- WHEN building or modifying cash flow, dashboard, or financial health pages
- AFTER any change to how profit or cash is calculated
- When a new client onboards with debt or negative cash flow

## Cash Flow Diagnosis Framework

### Step 1: Determine Operating Cash Flow Direction
```
Operating Profit = Revenue - COGS - OpEx (BEFORE finance costs)
```
- If Operating Profit > 0 → Business IS operationally viable
- If Operating Profit < 0 → Business has a revenue/cost problem

### Step 2: Determine Impact of Finance Costs
```
Profit After Finance Costs = Operating Profit - Monthly Interest
```
- If Operating Profit > 0 but Profit After Finance Costs < 0 → Debt is the problem
- Debt Service Coverage Ratio (DSCR) = Operating Profit / (Interest + Principal Payments)
- DSCR < 1.0 → Cannot service debt from operations → restructuring needed
- DSCR < 1.5 → Tight, vulnerable to revenue dips

### Step 3: Determine Working Capital Impact
```
Cash Flow from Operations = Profit + Non-Cash Items - Working Capital Changes
Working Capital Change = Δ Receivables + Δ Inventory - Δ Payables
```
- If Profit > 0 but Cash Flow < 0 → Cash trapped in working capital
- Check DSO (Days Sales Outstanding) — are clients paying slowly?
- Check DPO (Days Payable Outstanding) — are we paying suppliers too fast?

### Step 4: Determine Cash Burn Rate and Runway
```
Monthly Burn = Total Cash Outflow - Total Cash Inflow
Runway = Current Cash Balance / Monthly Burn
```
- Include: operating costs, debt repayments, tax payments
- Exclude: one-off capex (unless recurring)
- Flag: If runway < 6 months → critical
- Flag: If runway < 12 months → warning

## What Every Page Must Show

### Dashboard
- Cash runway in months (with colour: green >12, amber 6-12, red <6)
- Monthly burn rate (total outflow - inflow)
- Root cause label: "Operationally profitable, debt service creates shortfall" or "Revenue insufficient to cover costs"

### Financial Health Page
- Debt Service Coverage Ratio
- Interest Cover Ratio (EBIT / Interest)
- Working Capital Cycle (DSO + Inventory Days - DPO)
- Free Cash Flow (Operating CF - Capex)

### Income Statement
- Clear separation: Operating Profit → Finance Costs → Profit Before Tax → Net Profit
- User must be able to see WHERE profitability turns negative

### KPIs
- Monthly burn rate (auto-calculated, not just input)
- DSCR
- Interest cover
- Cash conversion efficiency

## Deriving Cash Flow Intelligence for Any Client

### From Xero Data (automatic)
1. `normalised_financials` → P&L lines → operating profit
2. `debt_facilities` → interest + principal → finance costs
3. Bank account balances → current cash position
4. Invoice aging → DSO calculation
5. Bill aging → DPO calculation

### From Onboarding (interview)
1. `acceptable_burn_rate` → target burn
2. `runway_requirement_months` → minimum comfort level
3. `business_stage` → is burning cash expected? (startup vs mature)
4. `biggest_challenges` → often mentions "cash flow" directly

### From Industry Benchmarks
1. Expected working capital cycle by sector
2. Typical DSCR for healthy businesses (>1.5)
3. Expected burn rate for business stage

## Anti-Patterns
1. **Showing "profitable" when debt service makes it cash-negative** — most dangerous
2. **Showing burn rate without explaining WHY** — number without context
3. **Assuming cash flow = profit** — working capital changes matter
4. **Ignoring principal repayments** — interest is only part of debt service
5. **Static runway** — must account for seasonal revenue swings
6. **Treating all burn as bad** — growth-stage burn with 18+ months runway is strategic
