# SEMANTIC INTELLIGENCE LAYER SPRINT

> **Purpose:** This is the missing layer between "raw Xero data in" and "intelligent platform output." Without this, Advisory OS is just reorganised accounting software. With it, every number on the platform has meaning, context, trust status, and actionable intelligence attached.
>
> **Priority:** P0 — blocks everything. No KPI, dashboard, scenario, or narrative feature works properly without this layer in place.
>
> **Origin:** Merged from two inputs: (1) Snowflake enterprise feedback on semantic layers as the prerequisite for AI over financial data, (2) direct observation that the current build pulls Xero numbers without understanding what they mean in the context of the specific business.

---

## THE CORE PROBLEM

Right now the platform does this:

```
Xero API → Raw numbers → Display on screen
```

It needs to do this:

```
Xero API → Data Validation → Semantic Mapping → Business Context → Intelligence → Display
```

The four missing steps are what this sprint builds.

### What "semantic layer" means in plain English

Every number in Xero has a raw value (£14,200) and a nominal code (200). But the platform doesn't know:
- **What it represents** in this specific business (is code 200 revenue from bridal gowns, or alterations, or accessories?)
- **Whether it's trustworthy** (has the accountant reconciled this month yet?)
- **What time period it belongs to** (what's the company's financial year-end? Are we showing YTD from the right start date?)
- **What context surrounds it** (this is a bridal business with 6 staff, seasonal revenue peaks around wedding season, gross margins vary by product type)
- **What it should be compared against** (industry benchmarks, prior period, budget)

Without this, showing "Revenue: £14,200" is no better than Xero. The business owner already has that number. They came to Advisory OS because Xero doesn't *explain* it.

---

## THE FOUR LAYERS TO BUILD

### Layer 1: Data Validation & Trust Status (The "Holding Room")

Before any number goes live on the platform, it passes through validation. This is the "holding room" concept — data arrives, gets checked, and only then feeds into intelligence.

**What to build:**

#### 1.1 Reconciliation Status Check
```typescript
interface DataTrustStatus {
  org_id: string;
  period: string; // e.g. "2025-03"
  bank_reconciled: boolean;
  last_reconciled_date: string | null;
  unreconciled_transaction_count: number;
  status: 'fully_reconciled' | 'partially_reconciled' | 'not_reconciled' | 'unknown';
  confidence_level: 'high' | 'medium' | 'low';
  checked_at: string; // timestamp
}
```

**How:** On every Xero sync, call the Xero Reports API for Bank Summary and check reconciliation status. Flag months where bank reconciliation is incomplete.

**Display rule:** Any number from a non-reconciled period gets a visual indicator (amber dot or similar) with tooltip: "This period has not been fully reconciled in Xero. Numbers may change."

#### 1.2 Data Completeness Scan
On first connect AND on every sync, run these checks:
- Are there uncategorised transactions? (Xero account code 850/unknown)
- Are there transactions posted to suspense/clearing accounts?
- Are bank feeds connected and up to date?
- Is the current month closed or still open?
- Are there any manual journals that might indicate corrections in progress?
- What percentage of transactions have tracking categories assigned?

**Output:** A `data_health_score` (0-100) stored per org, per period.

```typescript
interface DataHealthReport {
  org_id: string;
  period: string;
  overall_score: number; // 0-100
  checks: {
    bank_reconciliation: { status: 'pass' | 'warn' | 'fail'; detail: string };
    uncategorised_transactions: { count: number; value: number; status: 'pass' | 'warn' | 'fail' };
    suspense_account_balance: { value: number; status: 'pass' | 'warn' | 'fail' };
    tracking_category_coverage: { percentage: number; status: 'pass' | 'warn' | 'fail' };
    period_lock_status: { locked: boolean; status: 'pass' | 'warn' | 'fail' };
    bank_feed_currency: { connected: boolean; last_statement_date: string | null };
  };
  recommendations: string[]; // AI-generated plain English list of what to fix
  forecast_ready: boolean; // true only if score > 70
  created_at: string;
}
```

**Display:** Before any dashboard or KPI page loads for the first time, show the Data Health Report. "Your Xero data is 73% ready. Here's what to fix before we build your financial model." This is the guardrail — it prevents the platform from showing unreliable numbers without context.

#### 1.3 Accounting Period Awareness
```typescript
interface OrgAccountingConfig {
  org_id: string;
  financial_year_end_month: number; // 1-12, pulled from Xero Organisation API
  financial_year_end_day: number;
  vat_scheme: string | null; // 'standard' | 'flat_rate' | 'cash' | null
  vat_period: string | null; // 'monthly' | 'quarterly'
  base_currency: string; // GBP, USD etc.
  tax_year_end: string; // UK: 5 April
  corporation_tax_period: string | null;
  last_filed_accounts_date: string | null;
  created_at: string;
  updated_at: string;
}
```

**How:** Pull from Xero Organisation endpoint on first connect. This tells the platform:
- When YTD starts (not always January — a company with March year-end has YTD starting April)
- What periods to show by default
- How to calculate comparative periods correctly

**Display rule:** Every time period shown anywhere on the platform uses this config. "YTD" always means from the start of the company's financial year, not the calendar year. Period selectors default to the company's own accounting periods.

---

### Layer 2: Semantic Mapping (The Chart of Accounts Translation)

This is the direct answer to the Snowflake question: "Do you have semantic views defining all the different data points?"

**What to build:**

#### 2.1 Chart of Accounts (CoA) Mapping Engine

Every Xero organisation has its own chart of accounts. The same economic reality (staff costs) might be coded as account 400 in one business and 7200 in another. The platform needs a universal financial taxonomy that Xero accounts map into.

```typescript
interface CoAMapping {
  org_id: string;
  xero_account_code: string;
  xero_account_name: string;
  xero_account_type: string; // REVENUE, EXPENSE, ASSET etc.
  // The universal taxonomy mapping:
  advisory_os_category: string; // e.g. 'revenue', 'cogs', 'staff_costs', 'overheads', 'other_income'
  advisory_os_subcategory: string | null; // e.g. 'product_revenue', 'service_revenue', 'salaries', 'contractor_costs'
  // Business-specific semantic label:
  business_label: string | null; // e.g. "Bridal Gown Sales", "Alteration Services", "Fabric Purchases"
  // Flags:
  is_mapped: boolean;
  mapped_by: 'auto' | 'ai_suggested' | 'user_confirmed' | 'advisor_confirmed';
  confidence: number; // 0-1, AI confidence in auto-mapping
  affects_gross_margin: boolean;
  is_staff_related: boolean;
  is_discretionary: boolean;
  tracking_categories_used: string[]; // Xero tracking categories on this account
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

**The mapping process (3-step):**

**Step 1 — Auto-map:** When Xero connects, the platform sends the full chart of accounts to Claude API with this prompt pattern:

```
You are mapping a Xero chart of accounts for a [business_type] business.
Here is their chart of accounts: [full CoA from Xero]
Map each account to our universal taxonomy: [taxonomy definition]
For each, provide:
- Category and subcategory
- A plain English business label
- Whether it affects gross margin
- Whether it's staff-related
- Your confidence level (0-1)
Flag any accounts you're unsure about.
```

**Step 2 — Present for confirmation:** Show the business owner/advisor a mapping review screen. Auto-mapped items with high confidence (>0.8) are pre-filled. Low-confidence items are flagged for manual review. The UI should feel like Kevin Steel's mapping section — a dedicated screen, not buried in settings.

**Step 3 — Lock and version:** Once confirmed, the mapping is locked. Any changes create a new version with audit trail. This is governance — the mapping is an auditable decision, not a hidden config.

#### 2.2 Tracking Category Interpretation

Xero tracking categories are how businesses segment data (by location, department, project, product line). The platform needs to understand what each tracking category *means*.

```typescript
interface TrackingCategoryMapping {
  org_id: string;
  xero_tracking_category_id: string;
  xero_tracking_category_name: string; // e.g. "Location", "Product Line"
  semantic_type: 'location' | 'department' | 'project' | 'product_line' | 'cost_centre' | 'custom';
  options: {
    xero_option_id: string;
    xero_option_name: string; // e.g. "Birmingham", "Bridal Gowns"
    business_label: string | null; // Human-friendly label if different
    is_active: boolean;
  }[];
  created_at: string;
}
```

**Why this matters:** When the platform shows "Revenue by Product Line" on a dashboard, it needs to know that Tracking Category "Region" is a location, not a product. Without this mapping, the platform can't build the right drill-down paths.

#### 2.3 Universal Financial Taxonomy

This is the master reference that all CoA mappings point to. It defines what the platform considers standard financial categories:

```typescript
const ADVISORY_OS_TAXONOMY = {
  revenue: {
    product_revenue: { label: 'Product Revenue', affects_gross_margin: true },
    service_revenue: { label: 'Service Revenue', affects_gross_margin: true },
    other_income: { label: 'Other Income', affects_gross_margin: false },
    interest_income: { label: 'Interest Income', affects_gross_margin: false },
  },
  cost_of_sales: {
    materials: { label: 'Materials / COGS', affects_gross_margin: true },
    direct_labour: { label: 'Direct Labour', affects_gross_margin: true },
    subcontractors: { label: 'Subcontractors', affects_gross_margin: true },
    other_direct_costs: { label: 'Other Direct Costs', affects_gross_margin: true },
  },
  staff_costs: {
    salaries: { label: 'Salaries & Wages', is_staff_related: true },
    employer_ni: { label: 'Employer NI', is_staff_related: true },
    employer_pension: { label: 'Employer Pension', is_staff_related: true },
    staff_benefits: { label: 'Staff Benefits', is_staff_related: true },
    contractor_costs: { label: 'Contractor / Freelance', is_staff_related: true },
    recruitment: { label: 'Recruitment Costs', is_staff_related: true },
    training: { label: 'Training & Development', is_staff_related: true },
  },
  overheads: {
    rent: { label: 'Rent & Rates' },
    utilities: { label: 'Utilities' },
    insurance: { label: 'Insurance' },
    professional_fees: { label: 'Professional Fees (Legal, Accounting)' },
    software_subscriptions: { label: 'Software & Subscriptions' },
    marketing: { label: 'Marketing & Advertising', is_discretionary: true },
    travel: { label: 'Travel & Entertainment', is_discretionary: true },
    office_costs: { label: 'Office Costs' },
    depreciation: { label: 'Depreciation' },
    bank_charges: { label: 'Bank Charges & Interest' },
    bad_debts: { label: 'Bad Debts' },
  },
  // Balance sheet categories follow same pattern
  // ...
};
```

This taxonomy is what makes it possible for KPIs to work across different businesses. "Gross Margin" always means Revenue minus Cost of Sales, regardless of how the Xero CoA is structured, because the mapping translates local account codes into universal categories.

---

### Layer 3: Business Context Profile (The Onboarding Intelligence)

This is the layer that turns numbers into meaning. Without it, the platform knows "Revenue: £14,200" but doesn't know this is a bridal business where that number represents approximately X bridal gown sales at Y average price with Z% margin.

**What to build:**

#### 3.1 The Business Context Profile

This is the structured output of the onboarding interview, stored as a persistent profile that every AI call on the platform includes as context.

```typescript
interface BusinessContextProfile {
  org_id: string;
  version: number;

  // Core identity
  business_name: string;
  trading_name: string | null;
  business_type: string; // e.g. 'Bridal Retail & Alterations'
  sector: string; // e.g. 'Retail — Fashion & Bridal'
  sector_sic_code: string | null;
  company_number: string | null;
  incorporation_date: string | null;

  // Operating model
  revenue_model: string; // e.g. 'Product sales (gowns) + Service (alterations/fittings)'
  primary_products_services: string[]; // e.g. ['Wedding dresses', 'Bridesmaid dresses', 'Alterations', 'Accessories']
  pricing_model: string | null; // e.g. 'Fixed price per gown, hourly for alterations'
  average_transaction_value: number | null;
  customer_type: 'b2b' | 'b2c' | 'mixed';
  seasonality_pattern: string | null; // e.g. 'Peak Jan-Jun (engagement season → wedding season)'

  // Scale & team
  employee_count: number | null;
  employee_breakdown: Record<string, number> | null; // e.g. { 'Designers': 2, 'Fitters': 3, 'Admin': 1 }
  contractor_count: number | null;
  locations: string[];

  // Financial context
  approximate_annual_revenue: number | null; // From Xero, confirmed in interview
  financial_year_end: string;
  vat_registered: boolean;
  vat_scheme: string | null;
  uses_tracking_categories: boolean;
  tracking_category_structure: string | null; // Plain English description
  has_external_accountant: boolean;
  accountant_firm: string | null;
  uses_management_accounts: boolean;
  management_accounts_frequency: 'monthly' | 'quarterly' | 'annual' | 'none';

  // Goals & priorities (from interview)
  primary_goal: string | null; // e.g. 'Improve profitability and understand cost per dress'
  biggest_concern: string | null;
  key_metrics_they_track: string[]; // What they currently look at
  key_metrics_they_want: string[]; // What they wish they could see

  // Platform-specific
  connected_integrations: string[]; // ['xero'] initially
  desired_integrations: string[]; // ['shopify', 'monday'] — captured for Phase 2
  data_health_score: number;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;

  // Audit
  created_at: string;
  updated_at: string;
  last_updated_by: string; // user_id or 'system' or 'onboarding_interview'
}
```

#### 3.2 The Onboarding Interview Flow

**Trigger:** After Xero connects and data validation (Layer 1) completes.

**Pre-interview analysis:** Before the interview starts, send Xero data to Claude API:

```
Analyse this Xero data for a new business connecting to Advisory OS.

Chart of Accounts: [CoA]
Last 12 months P&L summary: [P&L]
Balance Sheet: [BS]
Aged Receivables: [AR]
Aged Payables: [AP]
Organisation details: [Org]

Infer:
1. What type of business this likely is
2. Revenue model (product, service, mixed)
3. Estimated team size from payroll costs
4. Seasonal patterns from monthly revenue
5. Key financial characteristics (margin profile, cash position, growth trend)
6. Any anomalies or concerns (large one-off items, declining trends, high debtor days)
7. What questions to ask the business owner to fill gaps

Return as structured JSON.
```

**Interview stages (4 stages, ~10 minutes total):**

**Stage 1: Confirm Inferences (2 min)**
Show what the platform has figured out from Xero. Let the owner confirm or correct.
"Based on your Xero data, it looks like you're a bridal retail business with around £[X] monthly revenue. Your biggest costs are [Y] and [Z], and you have approximately [N] staff. Is that right?"

**Stage 2: Fill the Gaps Xero Can't Answer (3 min)**
- Products/services breakdown and pricing
- Team structure (roles, not just headcount)
- Customer type and sales cycle
- Seasonality
- Anything the business owner tracks outside Xero (number of fittings, bookings, etc.)

**Stage 3: Goals and Concerns (3 min)**
- What does success look like in 12 months?
- What financial question can't you answer today?
- Are there planned changes (hires, location, investment)?

**Stage 4: Data Quality Acknowledgment (2 min)**
Show the data health report from Layer 1. Explain what needs fixing. Get confirmation to proceed with current data quality level or pause until accountant resolves issues.

**Output:** Populated `BusinessContextProfile` → stored in `company_skills` table (or new `business_context_profiles` table) → loaded into every subsequent Claude API call as system context.

#### 3.3 Website & Public Data Scan (Supplementary)

After the interview, optionally scan the business's website to enrich the profile:

```
Scan this website: [url]
Extract:
- Products/services listed with prices if visible
- Team page (names, roles)
- Location(s)
- Brand positioning and target market
- Any information that enriches the financial context

Compare with what we know from Xero and the interview. Flag any gaps or contradictions.
```

This is supplementary — not required for MVP. But it addresses the "should we scan the website and figure out the products" question directly. Yes, but after the interview, not instead of it.

---

### Layer 4: Contextual Intelligence (The "So What?" Engine)

This is where the semantic layer pays off. Every number displayed on the platform now has all four layers attached:

```
Raw Number (Xero) 
  → Trust Status (is it reconciled?) 
    → Semantic Meaning (what category is it?) 
      → Business Context (what does it mean for THIS business?) 
        → Intelligence (so what should you do about it?)
```

**What to build:**

#### 4.1 The Company Skill (Claude API Context Package)

Every Claude API call on the platform includes a structured context package:

```typescript
interface CompanySkill {
  business_context: BusinessContextProfile;
  coa_mapping: CoAMapping[];
  tracking_categories: TrackingCategoryMapping[];
  data_health: DataHealthReport;
  accounting_config: OrgAccountingConfig;
  // The specific data being analysed:
  current_data: any; // KPIs, P&L, whatever the user is looking at
  comparison_data: any; // Prior period, budget, benchmark
  // What the user is asking:
  user_query: string | null;
  page_context: string; // Which page/module they're on
}
```

This is the semantic layer. When Claude gets a question like "Why did revenue drop?", it doesn't just see numbers — it sees: "This is a bridal business. Revenue comes from gown sales and alterations. March is typically strong (pre-summer wedding season). Revenue dropped 15% vs last March. The CoA shows the drop is in account 200 (Bridal Gown Sales), not account 210 (Alterations). The business owner said their biggest concern is understanding cost per dress."

That context turns a generic "revenue declined" response into: "Your bridal gown sales were £X below the same month last year, while alterations held steady. Given this is typically your strongest quarter for gown orders, this is worth investigating — are bookings down, or are customers choosing lower-priced gowns?"

#### 4.2 KPI Selection Engine

Instead of showing the same 30 KPIs to every business, the platform uses the Business Context Profile to select and prioritise relevant KPIs:

```
Given this business context: [BusinessContextProfile]
And this financial data: [12-month summary]

Select the 10 most important KPIs for this business, in priority order.
For each KPI, explain:
1. Why it matters for this specific business
2. What the current value is
3. What a healthy target would be for their sector/size
4. What's driving the current performance

Return as structured JSON.
```

For a bridal business, this might prioritise:
- Revenue per fitting/consultation (conversion metric)
- Average gown sale value
- Gross margin by product type (gowns vs alterations vs accessories)
- Staff cost as % of revenue
- Seasonal revenue trend (are bookings on track for wedding season?)
- Aged debtors (do brides pay on time?)
- Cash runway

For a SaaS business, the same engine would pick completely different KPIs (MRR, churn, CAC, LTV).

**This is why the onboarding interview is the prerequisite.** Without knowing it's a bridal business, the platform would show generic KPIs that don't mean anything to the owner.

#### 4.3 Period-Aware Display Logic

Every page on the platform respects the accounting config:

```typescript
interface PeriodDisplayConfig {
  default_period: 'current_month' | 'last_closed_month'; // Show last closed if current isn't reconciled
  ytd_start: string; // Calculated from financial_year_end
  comparison_options: ('prior_period' | 'prior_year' | 'budget' | 'forecast')[];
  show_reconciliation_warning: boolean;
  available_periods: {
    period: string;
    trust_status: 'high' | 'medium' | 'low';
    reconciled: boolean;
  }[];
}
```

**Default behaviour:** If the current month hasn't been reconciled, default to showing the last fully reconciled month. Show a banner: "Showing March 2025 data (last reconciled period). April 2025 is still open — [View draft numbers]."

**YTD calculation:** Always uses the company's financial year start, not January. Display as "YTD (Apr 2024 – Mar 2025)" so there's no ambiguity.

---

## DATABASE SCHEMA ADDITIONS

```sql
-- Data health reports (per org, per period)
CREATE TABLE data_health_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organisations(id) NOT NULL,
  period TEXT NOT NULL, -- e.g. '2025-03'
  overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  checks JSONB NOT NULL, -- The full check results
  recommendations TEXT[],
  forecast_ready BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_data_health_org_period ON data_health_reports(org_id, period);

-- Accounting configuration (per org)
CREATE TABLE org_accounting_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organisations(id) UNIQUE NOT NULL,
  financial_year_end_month INTEGER NOT NULL,
  financial_year_end_day INTEGER NOT NULL,
  vat_scheme TEXT,
  vat_period TEXT,
  base_currency TEXT DEFAULT 'GBP',
  corporation_tax_period TEXT,
  last_filed_accounts_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chart of Accounts mapping (per org, per account)
CREATE TABLE coa_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organisations(id) NOT NULL,
  xero_account_code TEXT NOT NULL,
  xero_account_name TEXT NOT NULL,
  xero_account_type TEXT NOT NULL,
  advisory_os_category TEXT NOT NULL,
  advisory_os_subcategory TEXT,
  business_label TEXT,
  is_mapped BOOLEAN DEFAULT false,
  mapped_by TEXT DEFAULT 'auto' CHECK (mapped_by IN ('auto', 'ai_suggested', 'user_confirmed', 'advisor_confirmed')),
  confidence NUMERIC(3,2) DEFAULT 0,
  affects_gross_margin BOOLEAN DEFAULT false,
  is_staff_related BOOLEAN DEFAULT false,
  is_discretionary BOOLEAN DEFAULT false,
  tracking_categories_used TEXT[],
  notes TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, xero_account_code, version)
);
CREATE INDEX idx_coa_org ON coa_mappings(org_id);

-- Tracking category mappings
CREATE TABLE tracking_category_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organisations(id) NOT NULL,
  xero_tracking_category_id TEXT NOT NULL,
  xero_tracking_category_name TEXT NOT NULL,
  semantic_type TEXT CHECK (semantic_type IN ('location', 'department', 'project', 'product_line', 'cost_centre', 'custom')),
  options JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, xero_tracking_category_id)
);

-- Business context profiles
CREATE TABLE business_context_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organisations(id) UNIQUE NOT NULL,
  version INTEGER DEFAULT 1,
  profile_data JSONB NOT NULL, -- Full BusinessContextProfile
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_completed_at TIMESTAMPTZ,
  last_updated_by TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Onboarding interview transcripts (immutable audit trail)
CREATE TABLE onboarding_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organisations(id) NOT NULL,
  conducted_by UUID REFERENCES users(id),
  method TEXT CHECK (method IN ('chat', 'voice', 'manual')),
  transcript JSONB NOT NULL, -- Full Q&A log
  xero_snapshot JSONB, -- Snapshot of Xero data at time of interview
  ai_inferences JSONB, -- What Claude inferred before the interview
  profile_output JSONB, -- The BusinessContextProfile generated
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
  -- No updated_at: interviews are immutable
);

-- RLS: All tables scoped to org_id
```

---

## BUILD SEQUENCE

### Step 1: Accounting Config Pull (Day 1)
On Xero connect, immediately pull:
- Organisation details (year-end, VAT scheme, currency, registered address)
- Store in `org_accounting_config`
- Use this to set all default period displays across the platform

### Step 2: Data Health Check (Day 1-2)
On first sync, run the validation checks:
- Bank reconciliation status
- Uncategorised transaction count
- Suspense account balances
- Tracking category coverage
- Period lock status
- Generate `DataHealthReport` and store
- Show to user before anything else

### Step 3: Auto-Map Chart of Accounts (Day 2-3)
- Pull full CoA from Xero
- Send to Claude API with taxonomy and business type (if known from Xero org details)
- Store auto-mapped results in `coa_mappings`
- Build mapping review UI screen

### Step 4: Onboarding Interview (Day 3-5)
- Build chat-based interview flow
- Pre-analyse Xero data via Claude API
- Walk through 4 stages
- Generate and store `BusinessContextProfile`
- Update `coa_mappings` with any corrections from interview

### Step 5: Contextual KPI Selection (Day 5-6)
- Use profile + mapped CoA to select relevant KPIs
- Generate KPI definitions with business-specific labels
- Build initial dashboard from selections

### Step 6: Wire Intelligence Layer (Day 6-7)
- Build the `CompanySkill` context package
- Ensure every Claude API call includes it
- Update all existing "Explain This" / narrative features to use full context
- Implement period-aware display logic with reconciliation warnings

---

## WHAT CHANGES IN EXISTING PAGES

Once this layer exists, every page on the platform gets smarter:

**Dashboard:** Widgets selected based on business type. KPIs labelled in business-specific language ("Gown Sales This Month" not "Revenue"). Reconciliation status visible. YTD calculated from actual financial year.

**P&L:** Categories use the semantic mapping, not raw Xero account names. Drill-down follows the taxonomy → subcategory → individual account path. AI commentary references business context ("Your fabric costs rose 12% — this typically indicates either higher volume or supplier price increases. Given bookings were flat, it's worth checking supplier invoices.").

**KPIs:** Only shows relevant KPIs. Each KPI has a "Why this matters" tooltip generated from the business context. Targets set using sector benchmarks where available.

**Scenarios:** Natural language input gets interpreted with full context. "What if I hire another fitter?" → Claude knows fitters cost approximately £X based on the staff cost breakdown, and can model the P&L impact accurately.

**CEO Review / Board Pack:** Narrative generated with full context. Not "Revenue was £14,200" but "Revenue from bridal gown sales was £14,200 in March, down 8% on the prior year. This is your peak booking season — the decline suggests either fewer consultations or lower conversion rates."

---

## WHAT TO LEARN FROM COMPETITORS

**Kevin Steel / Inflectiv:**
- Dedicated CoA mapping screen as first-run experience ✓
- Maps every nominal code manually per client
- Advisory OS improvement: auto-suggest mappings based on business type, dramatically reducing setup time

**Fathom HQ:**
- 50+ pre-built KPIs with sector benchmarks
- Auto-detects business type from data patterns
- Advisory OS improvement: combine auto-detection with interview confirmation for higher confidence

**Syft Analytics:**
- Xero-native, pulls tracking categories automatically
- Good at multi-entity consolidation
- Advisory OS improvement: interpret tracking categories semantically, not just display them

**DataRails:**
- "Knows your business" positioning — their AI agents are pre-loaded with company context
- Advisory OS improvement: our context is richer because it combines Xero data + interview + website scan, not just data alone

**Puzzle:**
- AI learns from user patterns over time
- Advisory OS improvement: the Business Context Profile evolves — re-interview quarterly or when major changes detected in data patterns

---

## SUCCESS CRITERIA

This sprint is done when:

1. A new business connects Xero and immediately sees a data health report before any numbers
2. The platform knows the company's financial year-end and uses it everywhere
3. Every Xero account is mapped to the universal taxonomy (auto + confirmation)
4. A Business Context Profile exists and is loaded into every Claude API call
5. KPIs are selected based on business type, not shown generically
6. Non-reconciled periods are visually flagged
7. AI narratives reference business context, not just numbers
8. The onboarding interview transcript is stored as an immutable audit record

---

## WHY THIS IS THE MOAT

Your Snowflake mate was right: the semantic layer is where companies spend most of their time before AI goes live. But he was thinking about it from an enterprise data warehouse perspective — dozens of data sources, millions of rows, complex joins.

Your semantic layer is simpler but more opinionated: one data source (Xero), one domain (SME financial management), one purpose (turning accounting data into business intelligence). That focus means you can build a semantic layer that's *better* for this use case than anything a generic platform like Snowflake Cortex can offer, because every mapping and every inference is tuned for UK SME financial management.

The combination of data validation + semantic mapping + business context + contextual intelligence is what makes Advisory OS fundamentally different from "ChatGPT over a spreadsheet." It's not just AI capability — it's governed understanding. That's the answer when anyone asks "How do you prevent hallucinations?"

**You prevent hallucinations by knowing what every number means before you ask the AI to explain it.**
