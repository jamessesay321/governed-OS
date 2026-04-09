# Skill: Management Accounts as Classification Authority

## Principle

Management accounts prepared by the client's accountant are the **single source of truth** for how Xero accounts should be grouped and classified in the platform. They represent months of professional judgment about how to present financial data for business decision-making.

**Never** rely solely on Xero's flat class/type taxonomy (REVENUE, DIRECTCOSTS, EXPENSE, OVERHEADS). These are accounting system defaults, not business-meaningful groupings.

## How to Apply

1. **Obtain management accounts** (PDF or Excel) from the client's accountant — ideally 2-3 recent months
2. **Extract the P&L structure**: section headings, sub-groupings, and which accounts sit under each
3. **Map Xero accounts** to the platform's 27-category taxonomy using the management account groupings as the guide
4. **Validate** that the platform's output matches the accountant's structure within acceptable rounding

## Alonuko Ltd — BSMART London Management Account Structure

### Revenue (9 streams)
- Sales - Bridal - Bespoke
- Sales - Bridal - MTO (Made to Order)
- Sales - Robes
- Sales - Undergarments
- Shipping Income
- Consultation Income
- Sales - Other
- Alteration Income
- Ready Made Evening Wear

### Cost of Sales (3 sub-groups)
**Direct Staff Costs:**
- Bridal Production Salaries
- Employer NIC (production)
- Employer Pension (production)

**Other Cost of Sales:**
- Fabric
- Purchases
- CoS - Accessories / Robes / Undergarments / Others / Wholesale
- Freelance Work - COGS
- Embroidery
- Courier/Delivery (production)

**Stock/WIP Movement:**
- Opening Stock / WIP
- Closing Stock / WIP

### Operating Expenses (9 sub-groups)
1. **Product Dev Staff** — Design salaries, NIC, pension
2. **Advertising & Marketing** — Photoshoots, trunk shows, digital, PR
3. **Establishment Expenses** — Rent, rates, insurance, cleaning
4. **Staff Costs** — Director remuneration, wages, employer NIC/pension, training
5. **General Administration** — Office expenses, subscriptions, bank charges
6. **Legal & Professional Fees** — Accountancy, legal, consultancy
7. **FX Gains/Losses** — Currency revaluation
8. **Finance Charges** — Bank charges, credit card fees
9. **Depreciation** — Fixed asset depreciation

### Below Operating Profit
- **Interest Payable** — Loan interest, finance costs (shown SEPARATELY from OpEx)
- **Corporation Tax**

## Key Insight

The management accounts show Interest Payable BELOW Operating Profit. This means:
- Operating Profit = Gross Profit - Operating Expenses
- Profit Before Tax = Operating Profit - Interest Payable
- Net Profit = Profit Before Tax - Corporation Tax

The platform should mirror this structure, not lump interest into Operating Expenses.

## Mapping Rules Pattern

When classifying accounts for a new client, use regex-based rules informed by their management accounts:

```
Revenue: /sales|income|consultation|alteration|shipping/i
Cost of Sales: /fabric|cos|cogs|embroidery|freelance.*cogs|direct.*labour|production/i
Employee Costs: /director.*remuneration|wages|employer.*nic|pension|staff.*training/i
Marketing: /advertising|marketing|photoshoot|trunk.*show|pr\b/i
Rent & Occupancy: /rent|rates|premises|studio.*expense/i
Professional Fees: /accountancy|legal|professional.*fee|consultancy/i
```

Then fall back to Xero class/type for anything the rules don't catch.

## When to Update

- When a new client is onboarded and provides management accounts
- When the accountant changes their groupings between periods
- When the platform's taxonomy is extended with new categories
