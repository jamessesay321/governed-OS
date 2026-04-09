# Skill: Business Model Validation

## Purpose
Platform outputs must match business reality. Before displaying ANY financial number, ask: "Does this make sense for THIS specific business?" A luxury bridal business showing 590 clients when the actual number is 146 is a trust-destroying error, even if the code runs perfectly.

This skill is NOT Alonuko-specific. It defines a FRAMEWORK that applies to any onboarded client. Client-specific parameters must be derived from onboarding interview + Xero data — never hardcoded.

## When to Apply
- BEFORE showing any derived metric (client count, AOV, revenue, margin)
- AFTER any change to data aggregation or KPI calculation
- When building features for a client's industry
- At session start — sanity check key metrics against known business data

## Generalised Framework (Any Client)

### Step 1: Derive Business Model from Onboarding
Every client's `business_context_profiles` and `raw_interview_data` contain:
- `revenue_model` (project-based, subscription, product sales, service retainer)
- `revenue_streams` (distinct income sources)
- `seasonality_description` (when are busy/quiet months?)
- `business_stage` (startup, growth, mature, turnaround)
- `team_size` and `team_structure`
- `target_gross_margin`, `target_net_margin`

These MUST inform every validation check. If interview hasn't been completed, the platform must flag: "Business context incomplete — financial outputs may not reflect reality."

### Step 2: Detect Invoice-to-Client Ratio
- For project-based businesses (bridal, construction, consulting): each client generates multiple invoices
- For SaaS/subscription: each client = 1 recurring invoice per period
- For retail: "clients" may not be meaningful (transaction count instead)
- RULE: Cross-reference Xero invoice contacts against operational CRM (Monday.com, HubSpot) or interview data to determine the real client count
- RULE: If `revenue_model = 'project-based'`, warn that Xero contact count OVERCOUNTS clients

### Step 3: Validate Revenue Recognition
- Ask: "When does this business recognise revenue?" (delivery, invoice, payment, milestone)
- For made-to-order goods (FRS 102 Section 23): revenue on DELIVERY, deposits are liabilities
- For SaaS: revenue recognised monthly (even if billed annually)
- For professional services: as work is performed
- RULE: If invoiced amount > 130% of expected revenue, investigate deposit inclusion

### Step 4: Validate Profit Direction
- Ask: "Does this business have debt?" → Check `debt_facilities` table
- If active debt exists AND P&L shows profit WITHOUT finance costs → STOP, this is wrong
- Ask: "Is this business expected to be profitable?" → Check interview `business_stage`
- Turnaround/startup businesses may be legitimately loss-making
- RULE: If showing profit but debt service > operating profit → flag as misleading

### Step 5: Industry-Specific Sense Checks
Pull from `industry-benchmarks.ts` for the client's sector:
- Gross margin within expected range?
- Net margin within expected range?
- Expected cost categories present? (COGS for product businesses, no COGS for pure service)

## Client-Specific Rules (Auto-Derived)

### How to Build Rules for a New Client
When a new org completes onboarding:
1. Read `organisations.industry` + `business_context_profiles`
2. Match to industry benchmark template
3. Query `debt_facilities` → if any exist, profit MUST include finance costs
4. Query interview `seasonality_description` → configure seasonal thresholds
5. Query `revenue_model` → determine invoice-to-client mapping
6. Store derived rules in `company_skills` cache (7-day TTL, refreshed on sync)

### Example: Luxury Bridal (Alonuko Pattern)
- Revenue model: project-based, made-to-order
- Each bride = 3-5 invoices (consultation, deposit, balance, alterations)
- Source of truth for client count: operational CRM, NOT Xero contacts
- Revenue recognition: on delivery (FRS 102 Section 23)
- Seasonality: Jan/Sep high, trunk show months spike
- Active debt: 13+ facilities → P&L MUST include finance costs
- Expected gross margin: 30-65% (fashion-luxury benchmark)

### Example: SaaS Business
- Revenue model: subscription
- Each customer = 1 Xero contact (invoice count ≈ client count × months)
- Revenue recognition: monthly (deferred if annual billing)
- Seasonality: typically flat, Q4 enterprise push
- Expected gross margin: 70-85%
- Key metric: MRR, churn rate, LTV:CAC

### Example: Professional Services
- Revenue model: project/retainer
- Each client = multiple invoices per engagement
- Revenue recognition: as work performed or milestone
- Seasonality: quiet in August/December
- Expected gross margin: 50-70%
- Key metric: utilisation rate, revenue per consultant

## Implementation
Every page server component should:
```typescript
// After computing financial data, validate against business context
const businessContext = await getCompanySkill(orgId);
const validationFlags = validateBusinessModel({
  revenue, netProfit, clientCount, grossMargin,
  hasDebt: debtFacilities.length > 0,
  totalDebtInterest: monthlyInterest * 12,
  revenueModel: businessContext?.revenue_model,
  expectedMarginRange: businessContext?.industryBenchmark?.grossMarginRange,
});
```

## Known Anti-Patterns
1. **Hardcoding client numbers** — Always derive from operational data, never assume
2. **Treating all businesses as profitable** — Check debt first
3. **Ignoring deposits** — For project businesses, invoiced ≠ earned
4. **Flat seasonality assumptions** — Bridal swings 200-500% MoM, that's normal
5. **One-size-fits-all thresholds** — SaaS margins ≠ manufacturing margins
