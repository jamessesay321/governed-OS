# Skill: Client Context Derivation

## Purpose
When a NEW business onboards, the platform must automatically derive quality control rules that are as good as the hand-crafted ones we have for existing clients. No hardcoded business-specific rules. Everything must be derivable from:
1. Onboarding interview data
2. Xero chart of accounts + financials
3. Industry benchmarks
4. Debt facilities data

This skill defines HOW to auto-derive the context that powers every other skill.

## When to Apply
- AFTER a new org completes Xero sync
- AFTER onboarding interview is completed
- WHEN a sync reveals significant new data (new accounts, new debt facilities)
- At session start for any client work

## Derivation Pipeline

### Stage 1: Interview Data Extraction
Source: `business_context_profiles` + `organisations.raw_interview_data`

Extract and cache:
```typescript
interface DerivedBusinessContext {
  // Revenue model
  revenueModel: 'subscription' | 'project' | 'retail' | 'retainer' | 'marketplace';
  revenueStreams: string[];
  invoiceToClientRatio: number; // 1 for subscription, 3-5 for project

  // Seasonality
  isSeasonal: boolean;
  peakMonths: number[]; // 1-12
  troughMonths: number[];
  seasonalAmplitude: number; // 1.0 = flat, 3.0 = highly seasonal

  // Cost structure
  costStructureType: 'fixed_heavy' | 'variable_heavy' | 'balanced';
  fixedCostRatio: number; // 0-1
  variableCostRatio: number;
  keyFixedCosts: string[];
  keyVariableCosts: string[];
  discretionaryCosts: string[];

  // Debt and cash flow
  hasDebt: boolean;
  totalMonthlyDebtService: number;
  monthlyInterest: number;
  monthlyPrincipal: number;
  debtServiceCoverageRatio: number;
  expectedCashFlowDirection: 'positive' | 'negative' | 'breakeven';
  cashFlowNegativeReason?: 'operational_loss' | 'debt_burden' | 'growth_investment' | 'working_capital';

  // Benchmarks
  industryKey: string;
  expectedGrossMarginRange: [number, number];
  expectedNetMarginRange: [number, number];
  expectedWorkingCapitalDays: number;

  // Validation thresholds
  maxPlausibleMonthlyRevenue: number;
  minPlausibleMonthlyRevenue: number;
  revenueAnomalyThreshold: number; // % change that IS anomalous after seasonal adjustment
}
```

### Stage 2: Xero Data Analysis (Post-Sync)
Run automatically after every successful Xero sync:

1. **Account Classification**
   - Map all accounts to taxonomy categories
   - Detect fixed vs variable from account names and classes
   - Flag unclassified accounts for manual mapping

2. **Revenue Pattern Detection**
   - Calculate monthly revenue for all available periods
   - Detect seasonality (coefficient of variation > 0.3)
   - Identify peak/trough months
   - Build seasonal index

3. **Cost Structure Detection**
   - Separate fixed costs (consistent MoM ±10%) from variable (correlates with revenue)
   - Calculate fixed/variable ratio
   - Identify discretionary costs

4. **Client Count Derivation**
   - Count unique invoice contacts per period
   - If revenue_model = 'project': divide by estimated invoices per client
   - Cross-reference with CRM if integrated (Monday.com, HubSpot)

5. **Cash Flow Classification**
   - Query debt_facilities → compute total monthly debt service
   - Compare operating profit to debt service → derive DSCR
   - Determine WHY cash flow is positive or negative

### Stage 3: Benchmark Matching
Match `organisations.industry` to `industry-benchmarks.ts`:
- Set expected margin ranges
- Set expected cost structure
- Set expected working capital cycle
- Flag if actuals deviate significantly from benchmarks

### Stage 4: Rule Generation
Output a set of validation rules for this specific business:

```typescript
const rules = {
  // Revenue validation
  clientCountSource: 'crm' | 'deduplicated_contacts' | 'invoice_contacts',
  clientCountMultiplier: 1/3.5, // For project businesses: divide invoice contacts by this

  // Profit validation
  mustIncludeFinanceCosts: true, // If debt exists
  expectedProfitDirection: 'negative', // From DSCR analysis

  // Seasonality
  anomalyThresholdMultiplier: 3.0, // For seasonal businesses

  // Formatting
  primaryCurrency: 'GBP',
  revenueRecognitionMethod: 'delivery', // For FRS 102 project businesses
};
```

### Stage 5: Storage and Refresh
- Store in `company_skills` table (already exists)
- TTL: 7 days or on next Xero sync
- Refresh triggers: sync completion, interview completion, debt facility changes

## For the Developer Building Features

### Before Building Any Financial Page
1. Check: Does this page read from `company_skills` or `business_context_profiles`?
2. If no → the page is generic and may show misleading numbers for specific clients
3. Add: Fetch derived context and use it for thresholds, labels, comparisons

### Before Displaying Any Profit Number
1. Check: Does this page call `fetchFinanceCosts()`?
2. If no → profit is WRONG for any business with debt
3. Add: The shared utility handles it, just import and call

### Before Flagging Any Anomaly
1. Check: Does this check account for seasonality?
2. If no → you will flag normal business patterns as errors
3. Add: Read seasonal profile, adjust threshold

### Before Showing Client Count or AOV
1. Check: Does this use the correct count method for the revenue model?
2. If no → you may be overcounting by 3-5x
3. Add: Use `clientCountSource` from derived context

## Verification Checklist for New Client Onboarding
- [ ] Interview completed → business context extracted
- [ ] Xero sync completed → accounts classified
- [ ] Debt facilities checked → finance costs calculated
- [ ] Revenue model detected → correct client count method set
- [ ] Seasonality detected → anomaly thresholds adjusted
- [ ] Industry matched → benchmark ranges set
- [ ] Cost structure classified → fixed/variable split calculated
- [ ] Cash flow direction determined → root cause identified
- [ ] All derived rules stored in company_skills
- [ ] Every financial page reads from derived context
