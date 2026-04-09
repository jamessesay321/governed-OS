# Skill: Cost Structure Analysis

## Purpose
Every business has a different mix of fixed and variable costs. The platform must understand this because it determines:
- Breakeven point (high fixed costs → need more revenue to break even)
- Operating leverage (high fixed costs → profits amplify with revenue growth)
- Cost-cutting options (only discretionary/variable costs can be cut without structural change)
- Resilience (high variable costs → survives revenue dips better)

A SaaS business with 85% labour costs behaves completely differently from a manufacturer with 40% materials costs. The platform must detect and adapt.

## When to Apply
- BEFORE displaying any breakeven analysis
- BEFORE building cost reduction recommendations
- WHEN showing expense breakdown or cost pages
- WHEN building forecasts or scenarios
- For any page that recommends "cut costs by X%"

## Cost Classification Framework

### Fixed Costs (don't change with revenue)
- Rent and occupancy
- Permanent staff salaries
- Insurance premiums
- Loan repayments (interest + principal)
- Software subscriptions
- Accounting/legal retainers

### Variable Costs (change with revenue/volume)
- Materials and fabric (manufacturing)
- Freelancer/contractor costs (project-based)
- Shipping and logistics
- Sales commissions
- Payment processing fees
- Cloud hosting (usage-based)

### Semi-Variable (step function)
- Staff costs (fixed until you hire, then step up)
- Equipment leases (fixed until capacity exceeded)
- Marketing (discretionary but often budgeted as fixed)

### Discretionary vs Non-Discretionary
From `taxonomy.ts`, categories marked `isDiscretionary: true` can be cut:
- Marketing and advertising
- Travel and entertainment
- Training and development
- Subscriptions (non-essential)

Categories marked `isDiscretionary: false` cannot easily be cut:
- Rent (locked into lease)
- Staff salaries (unless making redundancies)
- Insurance (legally required)
- Debt repayments (contractual)

## Auto-Detection from Xero Data

### Step 1: Classify Accounts
Map each `chart_of_accounts` entry to fixed/variable using:
1. Account mapping taxonomy (`account_mappings.standard_category`)
2. Industry benchmark defaults
3. Account name pattern matching:
   - "Rent", "Lease", "Insurance" → Fixed
   - "Materials", "Fabric", "Stock" → Variable
   - "Freelance", "Contractor", "Commission" → Variable
   - "Salary", "Wages", "PAYE", "Pension" → Fixed (staff)

### Step 2: Calculate Ratios
```
Fixed Cost Ratio = Total Fixed Costs / Total Revenue
Variable Cost Ratio = Total Variable Costs / Total Revenue
Contribution Margin = 1 - Variable Cost Ratio
Breakeven Revenue = Total Fixed Costs / Contribution Margin
```

### Step 3: Validate Against Industry
| Industry | Typical Fixed % | Typical Variable % | Notes |
|----------|----------------|--------------------|-|
| SaaS | 70-85% | 15-30% | Labour-heavy, high operating leverage |
| Manufacturing | 30-50% | 50-70% | Materials-heavy |
| Professional Services | 60-75% | 25-40% | People costs dominate |
| Retail | 20-40% | 60-80% | COGS dominates |
| Fashion/Luxury | 40-60% | 40-60% | Mix of materials + studio overhead |

### Step 4: Surface Insights
- "Your fixed costs are X% of revenue. You need £Y/month in revenue just to cover overheads."
- "Your variable cost ratio is X%. For every £1 of revenue, £X.XX goes to direct costs."
- "Your highest discretionary cost is [category] at £X/month. Cutting this would save £Y/year."

## Pages That Must Use This
- **Breakeven page** → already calculates contribution margin, but must explain fixed vs variable
- **Costs page** → must tag each category as Fixed/Variable/Discretionary
- **Forecast page** → variable costs should scale with revenue assumptions
- **Scenario engine** → "cut costs by 10%" must specify WHICH costs (can't cut rent by 10%)
- **Dashboard** → cost KPI cards should show fixed cost coverage ratio
- **Key Actions** → "reduce costs" recommendations must target discretionary costs only

## For New Clients
1. After Xero sync, auto-classify all accounts using taxonomy + pattern matching
2. Calculate fixed/variable split
3. Compare against industry benchmark
4. Flag if cost structure seems unusual for the industry
5. Ask in interview: "What are your biggest fixed costs?" to validate
