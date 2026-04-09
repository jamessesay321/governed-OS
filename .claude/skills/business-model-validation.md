# Skill: Business Model Validation

## Purpose
Platform outputs must match business reality. Before displaying ANY financial number, ask: "Does this make sense for THIS specific business?" A luxury bridal business showing 590 clients when the actual number is 146 is a trust-destroying error, even if the code runs perfectly.

## When to Apply
- BEFORE showing any derived metric (client count, AOV, revenue, margin)
- AFTER any change to data aggregation or KPI calculation
- When building features specific to a client's industry
- At session start — sanity check key metrics against known business data

## Alonuko Business Model Rules

### Client Metrics
- Alonuko is luxury bridal: each bride has 3-5 invoices (consultation, deposit, balance, alterations)
- Counting Xero invoice contacts OVERCOUNTS clients by 3-5x
- Source of truth for client count: Monday.com confirmed clients
- Expected: ~146 confirmed clients/year (2025), NOT 590+ invoice contacts
- AOV: ~£8,634 per client (not £3K implied by overcounting)

### Revenue Recognition (FRS 102 Section 23)
- Deposits received ≠ revenue recognised
- Revenue for MTO goods: recognised on DELIVERY, not on deposit
- Deposit is a LIABILITY (deferred income) until dress is delivered
- If platform shows £1.8M from invoices, actual recognised revenue is ~£1.43M
- Wedding dates span 2025-2027 — deposits in 2025 may be revenue in 2027

### Seasonality
- Bridal is highly seasonal: trunk show months spike, quiet months near zero
- January, September: typically high (new year brides, autumn brides)
- April-May: trunk show season (US events)
- Revenue swings of 200-500% month-over-month are NORMAL, not errors
- Sense checks must account for seasonality (don't flag seasonal spikes as anomalies)

### Debt Reality
- 13+ active debt facilities, £511K outstanding
- £55.7K/month in repayments (46.6% of monthly revenue)
- £257K/year in interest (17.9% of revenue)
- ANY P&L that shows Alonuko as profitable WITHOUT deducting finance costs is WRONG
- The business is structurally loss-making after debt service

### Cost Structure
- Materials/fabric: 30-40% of COGS
- Labour (seamstresses): 9 staff + 2 directors
- Trunk show costs: £8-15K per event (travel, hotel, freelancers, shipping)
- Studio overhead: rent, utilities, insurance
- MCA repayments: largest single cash outflow

## Generalised Validation Rules (Any Client)

### Before Displaying Client Count
- ASK: "How does this business count clients?" (invoices? contacts? orders?)
- CROSS-REFERENCE with operational system (Monday.com, CRM, Shopify)
- NEVER report Xero invoice contact count as "clients"

### Before Displaying Revenue
- ASK: "When does this business recognise revenue?" (on delivery? on invoice? on payment?)
- CHECK: Does the total match the business's own management accounts?
- FLAG: If platform revenue > 130% of known revenue, likely double-counting or deposit inclusion

### Before Displaying Profit/Loss
- ASK: "Does this business have debt?" If yes, finance costs MUST be included
- CHECK: Is the profit/loss direction correct? (profitable vs loss-making)
- FLAG: If showing profit but known to be loss-making → STOP, find what's missing

### Before Displaying Any Ratio
- ASK: "Is the denominator correct?" (revenue per employee needs correct employee count, not payroll contacts)
- CHECK: Does the ratio make sense for the industry? (40% gross margin for manufacturing, 80% for SaaS)
- FLAG: If ratio is 2x or 0.5x industry norm, investigate before displaying

## Implementation
Every page server component should include:
```typescript
// After computing financial data, validate against business model
const validationFlags = validateBusinessModel({
  revenue, netProfit, clientCount, grossMargin,
  hasDebt: debtFacilities.length > 0,
  totalDebtInterest: monthlyInterest * 12,
});
// Pass flags to client for display
```

## Known Alonuko-Specific Issues
1. Invoice contacts overcounts clients by 4x (Lesson 18)
2. Revenue overstated by deposits (FRS 102 Section 23)
3. P&L missing finance costs → shows false profit (fixed in 0de5266)
4. Seasonal revenue treated as anomaly by sense-check (too aggressive thresholds)
5. Interest expense on bank transactions not in normalised_financials (Lesson 10 trade-off)
