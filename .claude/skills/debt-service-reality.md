# Skill: Debt Service Reality

## Purpose
For any business with active debt, the TOTAL cost of debt is not just interest. It includes:
- Monthly interest payments
- Monthly principal repayments
- Arrangement/facility fees (amortised)
- Early repayment penalties (if applicable)

The platform must model the FULL debt service burden because:
- Interest alone understates the cash outflow
- A business paying £55.7K/month in total debt service (46.6% of revenue) cannot be shown as "profitable"
- Debt maturity dates create cliff-edge risks that must be visible
- Refinancing opportunities are only visible when the full picture is clear

## When to Apply
- WHENEVER P&L shows profit for a business with active debt
- WHEN calculating cash runway or burn rate
- WHEN building cash flow forecasts
- WHEN evaluating scenario outcomes
- ON debt/MCA pages — must show complete picture

## Debt Service Metrics

### Monthly Debt Service
```
Total Monthly Debt Service = Sum of all facilities:
  - Monthly interest (annual_interest_amount / 12)
  - Monthly principal repayment (from facility schedule)
  - Any monthly fees
```

### Debt Service Coverage Ratio (DSCR)
```
DSCR = Monthly Operating Profit / Monthly Total Debt Service
```
- DSCR > 2.0 → Healthy, comfortable servicing
- DSCR 1.5-2.0 → Adequate, limited headroom
- DSCR 1.0-1.5 → Tight, vulnerable to any revenue dip
- DSCR < 1.0 → CANNOT service debt from operations → cash draining
- DSCR < 0 → Operating at a loss AND has debt → critical

### Interest Cover Ratio
```
Interest Cover = Operating Profit / Monthly Interest Only
```
- Interest cover > 3.0 → Comfortable
- Interest cover 1.5-3.0 → Adequate
- Interest cover < 1.5 → Concerning
- Interest cover < 1.0 → Interest alone exceeds operating profit

### Debt-to-Revenue Ratio
```
Debt Service Ratio = Annual Total Debt Service / Annual Revenue
```
- < 15% → Manageable
- 15-30% → Elevated
- 30-50% → Critical
- > 50% → Unsustainable without restructuring

## What the Platform Must Show

### On P&L Pages
```
Revenue                    £120,000
- Cost of Sales            (£48,000)
= Gross Profit             £72,000      60.0% margin
- Operating Expenses       (£45,000)
= Operating Profit         £27,000      22.5% margin  ← Operationally viable
- Finance Costs            (£21,400)    ← Interest component
= Profit Before Tax        £5,600       4.7% margin
- Debt Principal           (£34,300)    ← Not on P&L but REAL cash outflow
= Free Cash After Debt     (£28,700)    ← The ACTUAL monthly position
```

### On Dashboard
- Show operating profit AND profit after finance costs
- If they have different signs (one positive, one negative), highlight this
- Label: "Operationally profitable, debt service creates monthly cash shortfall of £X"

### On Cash Flow Pages
- Separate operating cash flow from financing cash flow
- Show debt maturity timeline (when does each facility end?)
- Show cumulative cash impact of debt over remaining term

### On Scenario Pages
- Every scenario that changes revenue must show impact on DSCR
- "If revenue drops 10%, DSCR falls from 1.2 to 0.95 — you can no longer service debt"

## Deriving Debt Data for Any Client

### From `debt_facilities` Table
```sql
SELECT name, facility_type, annual_interest_amount, monthly_repayment,
       outstanding_balance, maturity_date, status
FROM debt_facilities
WHERE org_id = ? AND status = 'active'
```

### Computed Fields
- `totalMonthlyInterest` = SUM(annual_interest_amount / 12)
- `totalMonthlyPrincipal` = SUM(monthly_repayment) - totalMonthlyInterest
- `totalMonthlyDebtService` = SUM(monthly_repayment)
- `totalOutstanding` = SUM(outstanding_balance)
- `weightedAverageRate` = SUM(annual_interest_amount) / SUM(outstanding_balance)
- `nearestMaturity` = MIN(maturity_date WHERE maturity_date > now())

### Debt Types to Handle
| Type | Typical Structure | Key Risk |
|------|------------------|----------|
| Bank Loan (BBL) | Fixed rate, monthly P&I | Rate reset risk |
| MCA (Merchant Cash Advance) | Daily/weekly % of revenue | Very high effective rate |
| Invoice Finance | Revolving, % of receivables | Concentration risk |
| Credit Line | Revolving, interest only | Facility withdrawal risk |
| Asset Finance | Fixed term, monthly P&I | Asset depreciation |

### MCA-Specific Rules
MCAs are the most dangerous debt type because:
- Effective APR often 30-80%
- Repayments scale with revenue (look like variable costs)
- Multiple stacked MCAs compound the problem
- Daily deductions reduce cash visibility

The platform MUST flag: "X MCA facilities with total outstanding of £Y. Effective APR: Z%. Monthly repayment: £W."

## Anti-Patterns
1. **Showing interest only, ignoring principal** — understates cash outflow
2. **Including debt service in "operating expenses"** — inflates cost perception, hides operating profitability
3. **Ignoring maturity dates** — a facility maturing next month is urgent
4. **Treating MCA repayments as COGS** — they're financing, not operations
5. **Not recalculating DSCR when revenue changes** — every revenue scenario must update DSCR
6. **Comparing pre-debt businesses to post-debt** — different business entirely
