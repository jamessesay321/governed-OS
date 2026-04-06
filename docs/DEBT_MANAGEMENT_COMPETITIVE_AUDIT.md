# DEBT & LOAN MANAGEMENT — COMPETITIVE AUDIT
## Advisory OS Build Reference | April 2026

> **Purpose:** Deep analysis of how all 10 FP&A competitors handle debt/loan management, plus best-in-class patterns from treasury management tools. Designed to inform Advisory OS's Debt & Loan Management module.

---

## EXECUTIVE SUMMARY

**The gap is enormous.** None of the 10 FP&A platforms treat debt management as a first-class feature. Most handle loans as a balance sheet line item with basic amortization math. There is no dedicated "Debt Command Centre" in any of them. This is a major opportunity for Advisory OS — particularly for UK SMEs where CBILS, Recovery Loans, bounce-back loans, and commercial mortgages are a critical part of the financial picture.

### Key Findings

1. **Jirav** is the only FP&A tool with a proper documented debt schedule (via Custom Tables), but it is spreadsheet-like and requires finance expertise to configure.
2. **Planful** has a Capital Planning module that supports loan-financed asset purchases, but it is enterprise-grade and not debt-focused.
3. **Kevin Steel's Inflectiv Intelligence** has a dedicated Loans page in the sidebar navigation — the closest to what Advisory OS should build, but details are limited.
4. **No FP&A tool has**: dedicated covenant tracking, interest rate comparison visualizations, refinancing scenario tools, or good/bad debt classification.
5. **The best debt UX patterns live outside FP&A** — in treasury management tools (TreasuryView, DebtBook) and covenant compliance platforms (Cerebro Capital).

### Competitive Whitespace for Advisory OS

| Feature | Any FP&A Competitor Has It? | Treasury Tools Have It? |
|---------|---------------------------|------------------------|
| Dedicated debt dashboard | NO | YES (TreasuryView) |
| Loan payment schedule tracking | Partial (Jirav only) | YES (DebtBook) |
| Interest rate comparison viz | NO | Partial (TreasuryView) |
| Covenant monitoring | NO | YES (Cerebro Capital) |
| Debt-to-equity visualization | NO (just the KPI number) | NO (just the ratio) |
| Cash flow impact of debt | Partial (all tools, indirectly) | YES (DebtBook) |
| Refinancing scenario tool | NO | NO |
| Good/bad debt classification | NO | NO |

**This is uncontested whitespace. Building a proper Debt Command Centre puts Advisory OS ahead of every FP&A competitor AND most treasury tools.**

---

## PLATFORM-BY-PLATFORM ANALYSIS

### 1. DataRails

**How they handle debt/loans:**
- Debt appears as a balance sheet line item within their consolidated financial reporting.
- No dedicated debt schedule or loan management page.
- Loans tracked via the general financial data consolidation engine — pulls from ERP/accounting data.
- Cash Management module tracks bank balances and liquidity but does not break out debt service separately.
- Their FinanceOS AI agents can answer ad-hoc questions about debt ("What are our total liabilities?") but there is no structured debt workflow.

**Dedicated debt schedule page?** NO.
**Interest rate comparisons?** NO. No visualization of rates across multiple loans.
**Payment schedule tracking?** NO. Payment data flows from the ERP but is not surfaced in a dedicated view.
**Covenant tracking?** NO.
**Debt-to-equity visualization?** Only as a KPI if manually configured. No dedicated visualization.
**Cash flow impact of debt?** Indirect only — visible in cash flow statements but not isolated as "debt service cash impact."
**Refinancing scenario tools?** NO. Their scenario engine could model it, but there is no pre-built refinancing workflow.

**UX pattern worth noting:** DataRails' drill-down pattern (click any number, see contributing transactions) would be excellent applied to a loan balance — click the loan balance, see every payment and interest charge that contributed to the current figure.

---

### 2. Fathom HQ

**How they handle debt/loans:**
- Loans appear as balance sheet accounts in forecasting.
- Users can create a "microforecast" to model a new loan — allows experimentation with loan timing and amount.
- If the loan is used to purchase an asset, users can link via the "Purchase an asset" forecast event.
- Three-way forecasting shows the cash flow impact of loan payments, but this is generic (P&L + BS + CF integration), not debt-specific.
- KPI library includes Debt-to-Equity ratio as a pre-built metric.

**Dedicated debt schedule page?** NO. Loans are modeled as forecast journals/schedules within the broader forecasting module.
**Interest rate comparisons?** NO.
**Payment schedule tracking?** Partial. Microforecasts can model recurring payments, but there is no amortization schedule view.
**Covenant tracking?** NO.
**Debt-to-equity visualization?** YES — as one of 50+ pre-built KPIs, with trend line and target comparison. But no dedicated debt visualization page.
**Cash flow impact of debt?** YES — visible in the three-way forecast cash flow statement, but not isolated.
**Refinancing scenario tools?** NO. Users could manually create scenarios to compare, but there is no guided refinancing workflow.

**UX pattern worth noting:** Fathom's Goalseek could theoretically answer "What revenue do I need to cover a 6% interest rate increase?" but this is not a pre-built use case. Advisory OS should build this as a pre-built Goalseek template.

---

### 3. Syft Analytics (Xero-owned)

**How they handle debt/loans:**
- Balance sheet visualization allows comparison of cash vs. debt over time via donut/bar charts.
- Working capital report shows current liabilities (which may include short-term debt portions).
- Cash Management feature forecasts cash position up to 180 days, which would reflect debt payments but does not isolate them.
- No dedicated debt module.

**Dedicated debt schedule page?** NO.
**Interest rate comparisons?** NO.
**Payment schedule tracking?** NO.
**Covenant tracking?** NO.
**Debt-to-equity visualization?** Donut chart showing composition of liabilities vs. equity is possible in their custom dashboard builder, but not pre-built.
**Cash flow impact of debt?** Indirect — cash flow forecasting reflects all outflows including debt payments.
**Refinancing scenario tools?** NO.

**UX pattern worth noting:** Syft's ability to compare "how cash vs. debt changes each quarter" in a donut chart is a simple but effective visualization. Advisory OS should adopt this as a quick-view widget.

---

### 4. Jirav

**How they handle debt/loans:** MOST COMPREHENSIVE AMONG FP&A TOOLS.
- Dedicated **Loan Schedule** via Custom Tables feature.
- Users create a "Debt Schedule" custom table with two sections:
  - **Loan Assumptions**: Interest Loan Addition (money), Monthly Interest Rate (percent)
  - **Interest Loan Schedule**: Beginning Balance, Payment, Interest, Principal (all money format)
- Calculation methodology uses drivers:
  - Monthly Interest = Beginning Balance x Monthly Interest Rate
  - Principal = Payment - Interest
  - Ending Balance = Beginning Balance - Principal
  - Beginning Balance = Prior month's Ending Balance
- **Driver types**: Global Drivers (consistent across plans, e.g., annual rate / 12) and Plan Drivers (vary by scenario, e.g., drawdown timing, payment start dates)
- Interest expense links to income statement via drivers.
- Loan additions and principal payments connect to Balance Sheet liability accounts (Notes Payable) with separate increase/decrease tracking.
- Displays month-by-month amortization in a tabular view.

**Dedicated debt schedule page?** YES — via Custom Tables, but requires manual setup. Not pre-built.
**Interest rate comparisons?** NO — single loan at a time. No multi-loan rate comparison.
**Payment schedule tracking?** YES — month-by-month amortization with configurable start/end dates.
**Covenant tracking?** NO.
**Debt-to-equity visualization?** Only as a calculated KPI.
**Cash flow impact of debt?** YES — integrated into three-statement model. Loan draws and payments visible on balance sheet report with cash impact.
**Refinancing scenario tools?** Partial — users can clone plans and adjust loan assumptions to compare, but there is no guided refinancing workflow.

**UX pattern worth noting:** Jirav's Custom Table approach is powerful but requires financial expertise. The driver-based calculation (Global vs. Plan drivers) is the right architecture, but the UX needs to be translated into plain English for SME owners. Advisory OS should pre-build the debt schedule structure so users just enter loan terms, not configure custom tables.

---

### 5. Runway

**How they handle debt/loans:**
- Debt is modeled as a "driver" within their unified data model.
- Users can create loan-related dimensions (loan type, lender, facility) and plan against them.
- The plain-English formula engine could support statements like "loan balance decreases by $5,000 per month starting March."
- Scenario management allows comparing different debt structures side-by-side.
- No dedicated debt module or pre-built debt templates.

**Dedicated debt schedule page?** NO.
**Interest rate comparisons?** NO. Could be modeled but not pre-built.
**Payment schedule tracking?** NO. Would need to be built as a custom model.
**Covenant tracking?** NO.
**Debt-to-equity visualization?** Only if manually modeled as a metric.
**Cash flow impact of debt?** Yes — their cash flow forecasting would capture it, but not isolate it.
**Refinancing scenario tools?** Partial — their scenario engine is best-in-class and COULD model refinancing, but there are no pre-built refinancing templates.

**UX pattern worth noting:** Runway's plain-English formula approach is the gold standard for how Advisory OS should let users define loan terms: "Barclays loan: borrow 250,000 at 6.5% over 5 years, payments start April 2026." The system should parse this into a full amortization schedule.

---

### 6. Mosaic (Bob Finance)

**How they handle debt/loans:**
- Mosaic's educational content (mosaic.pe/academy/debt) covers debt schedule concepts, indicating awareness of the use case.
- Their Debt Schedule content describes: tracking balances of each tranche, running cash balance, interest expense calculations, and financing fee amortization.
- Interest expense flows to income statement, closing debt balance flows to balance sheet, principal repayments flow to cash flow statement.
- However, this appears to be educational/template content rather than a built-in product feature.

**Dedicated debt schedule page?** NO — educational content only, not a product feature.
**Interest rate comparisons?** NO.
**Payment schedule tracking?** NO.
**Covenant tracking?** NO.
**Debt-to-equity visualization?** Only as a calculated metric.
**Cash flow impact of debt?** Indirect only — through general financial statements.
**Refinancing scenario tools?** NO.

**UX pattern worth noting:** Mosaic's 4-week implementation philosophy and "Metric Builder" for custom KPIs would be relevant — a "Debt Health Score" custom metric could combine debt-to-equity, interest coverage, and debt service coverage into a single indicator.

---

### 7. Puzzle

**How they handle debt/loans:**
- Loan accounts set up as liability accounts under "Long Term Debt" parent account.
- Debt and equity financing transactions categorized within the general ledger.
- AI-powered transaction categorization may auto-detect loan payments.
- No dedicated debt management features — Puzzle is accounting-first, not planning-first.

**Dedicated debt schedule page?** NO.
**Interest rate comparisons?** NO.
**Payment schedule tracking?** NO.
**Covenant tracking?** NO.
**Debt-to-equity visualization?** NO.
**Cash flow impact of debt?** Only through standard cash flow statements.
**Refinancing scenario tools?** NO.

**UX pattern worth noting:** Puzzle's AI auto-categorization of transactions (90-95% accuracy) could be adapted for Advisory OS to auto-detect loan payments from Xero transactions and build a payment history without manual entry.

---

### 8. Planful

**How they handle debt/loans:**
- **Capital Planning** module supports financing modes for asset purchases: credit, cash, or loans.
- Users configure finance mode templates mapping to general ledger accounts.
- Supports depreciation and amortization calculations for assets.
- No standalone debt management — loans are a financing method for capital expenditures, not managed independently.

**Dedicated debt schedule page?** NO — debt is a sub-feature of Capital Planning.
**Interest rate comparisons?** NO.
**Payment schedule tracking?** Partial — within the context of financed asset purchases only.
**Covenant tracking?** NO.
**Debt-to-equity visualization?** Only as a custom dashboard KPI.
**Cash flow impact of debt?** Yes — within the capital planning module's impact on cash flow forecasts.
**Refinancing scenario tools?** NO.

**UX pattern worth noting:** Planful's approach of treating loans as a "financing mode" for capital purchases is relevant for Advisory OS's asset purchase workflow. When a user says "I want to buy a van for 45,000," Advisory OS should ask: "Cash, loan, or HP?" and model accordingly.

---

### 9. Vena Solutions

**How they handle debt/loans:**
- **Capital Planning add-on** handles CapEx planning with financing options.
- Pre-built logic for depreciation and amortization of existing and new assets.
- Cash flow planning module would capture debt service payments.
- Cell-level audit trail tracks every number change, including debt-related fields.
- No dedicated debt schedule or loan management module.

**Dedicated debt schedule page?** NO.
**Interest rate comparisons?** NO.
**Payment schedule tracking?** NO — only within capital planning context.
**Covenant tracking?** NO.
**Debt-to-equity visualization?** Only as a custom report/dashboard element.
**Cash flow impact of debt?** Yes — through cash flow planning module.
**Refinancing scenario tools?** NO.

**UX pattern worth noting:** Vena's cell-level audit trail is directly applicable to debt management. Every change to a loan term, interest rate, or payment amount should be tracked with who changed it, when, and why. This is critical for governance.

---

### 10. Cube

**How they handle debt/loans:**
- Debt data flows through from connected ERP/accounting systems.
- AI Analyst can answer natural language questions about debt ("What is our total debt by lender?").
- Scenario planning can model different debt structures.
- No dedicated debt management features.

**Dedicated debt schedule page?** NO.
**Interest rate comparisons?** NO.
**Payment schedule tracking?** NO.
**Covenant tracking?** NO.
**Debt-to-equity visualization?** Only as a custom metric in dashboards.
**Cash flow impact of debt?** Indirect — through financial statements.
**Refinancing scenario tools?** NO.

**UX pattern worth noting:** Cube's NL query approach ("What is our weighted average interest rate across all loans?") is the interaction model Advisory OS should support for debt queries.

---

### 11. Kevin Steel / Inflectiv Intelligence

**How they handle debt/loans:**
- **Dedicated "Loans" page** in the left sidebar under Balance Sheet section.
- Loans and Fixed Assets are separate navigation items — treated as first-class entities.
- Loan data feeds into Balance Sheet, Cash Flow (both direct and indirect methods), and 13-Week Cash Flow.
- HMRC Payment Plans tracked separately — for VAT, Corp Tax, and PAYE debts on monthly repayment to HMRC.
- Opening balance taken from actuals at lock month; each forecast month deducts monthly payment until zero.
- Does NOT disrupt main payment timing profiles.

**Dedicated debt schedule page?** YES — "Loans" in sidebar navigation.
**Interest rate comparisons?** Not documented.
**Payment schedule tracking?** YES — monthly deductions until zero, with HMRC payment plan support.
**Covenant tracking?** NO.
**Debt-to-equity visualization?** Not documented, but KPI module includes 19 metrics.
**Cash flow impact of debt?** YES — flows through to all three cash flow views (indirect, direct, 13-week).
**Refinancing scenario tools?** Not documented, but scenarios (Best/Worst/Budget) could model this.

**UX pattern worth noting:** Kevin's separation of HMRC Payment Plans from regular loan payments is UK-specific and highly relevant. Advisory OS needs this same separation — HMRC debt behaves differently from commercial loans.

---

## BEST-IN-CLASS DEBT UX — OUTSIDE FP&A

### TreasuryView (Best Debt Dashboard for SMBs)
**Price:** EUR 250
**Target:** CFOs and controllers at SMBs

**Key features:**
- One clear dashboard for ALL business loans — single view of entire debt portfolio
- Track maturities, interest costs, and refinancing dates in real time
- Full debt maturity timeline visualization
- Fixed vs. floating interest rate mix — automated from transaction data
- Export-ready reports for board use
- Replaces scattered Excel files with a central source of truth
- Covers: loans, maturities, interest schedules, hedging instruments

**UX patterns to adopt:**
1. **Maturity Timeline** — horizontal bar/Gantt chart showing when each loan matures, color-coded by urgency (green = 12+ months, amber = 6-12 months, red = <6 months)
2. **Fixed vs. Floating Mix** — pie/donut chart showing exposure split, critical for interest rate risk awareness
3. **Single Dashboard, All Loans** — no clicking into individual loan pages to get the full picture
4. **Refinancing Date Alerts** — proactive notifications before refinancing windows open/close

---

### DebtBook (Best Debt Management for Governance)
**Target:** Municipalities and government entities (but patterns are universally applicable)

**Key features:**
- Centralized debt and lease tracking with full compliance automation
- Data visualization, charts, and reports for stakeholder communication
- Consolidated calendar reminders for: payment dates, redemption dates, disclosure requirements, compliance deadlines
- Automated journal entries for debt transactions
- Year-end audit note disclosures — auto-generated
- Tracks debt obligations across multiple categories, filters, and allocations
- Permissions and access management for collaboration

**UX patterns to adopt:**
1. **Debt Calendar** — unified view of all upcoming debt events (payments, covenant certifications, maturity dates, refinancing windows)
2. **Auto-Generated Audit Disclosures** — for Advisory OS, this maps to auto-generating the debt section of board packs
3. **Category/Filter System** — filter loans by type (term loan, revolving credit, CBILS, bounce-back, commercial mortgage, HP, invoice finance)
4. **Stakeholder Permissions** — who can see what loan data (owner sees all, advisor sees assigned clients, investor sees approved summaries only)

---

### Cerebro Capital — Loan Compliance Navigator (Best Covenant Tracking)
**Target:** Mid-market companies with multiple loan agreements

**Key features:**
- Drag-and-drop upload of loan agreements — digitized in 24-48 hours
- Unified dashboard showing all loan covenants across all facilities
- Non-financial covenant tracking with task assignment to internal stakeholders
- Financial covenant auto-calculation — upload financials, ratios calculate instantly
- Covenant calendar with 15-day and 30-day email alerts before deadlines
- Compliance certificate generation with workflow approvals
- Role-based access: view-only, edit, or approval rights per stakeholder
- Solves: "38% of middle market companies violated a loan agreement and didn't know it"

**UX patterns to adopt:**
1. **Covenant Health Dashboard** — traffic light system per covenant (green = comfortable, amber = approaching threshold, red = breached or at risk)
2. **Auto-Calculate from Financials** — when Xero data syncs, all covenant ratios should recalculate automatically
3. **Deadline Alerts** — proactive notifications 30, 15, and 7 days before any covenant certification is due
4. **Compliance Certificate Export** — one-click generation of the document the bank needs
5. **Task Assignment** — assign covenant monitoring tasks to specific team members

---

## BEST-IN-CLASS VISUALIZATION PATTERNS

### Loan Portfolio Visualization

**Recommended pattern: Stacked horizontal bar chart (maturity timeline)**
- X-axis = time (months/years)
- Each bar = one loan facility
- Color segments within bar = principal remaining vs. amount repaid
- Bar length = loan term (start to maturity)
- Urgency indicator: red glow/border on loans maturing within 6 months
- Hover tooltip: lender name, balance, rate, monthly payment, maturity date, next payment date

**Alternative: Bubble chart for multi-loan comparison**
- X-axis = interest rate
- Y-axis = remaining term
- Bubble size = outstanding balance
- Color = loan type (term loan, revolving, HP, invoice finance)
- Immediately shows which loans are expensive AND long-term (top-right = worst position)

### Payment Schedule Tracking

**Recommended pattern: Combined timeline + table**
- **Top section**: Stacked area chart showing principal vs. interest over remaining term
  - Two colors: dark for principal portion, light for interest portion
  - Shows the crossover point where payments become principal-heavy
  - Monthly or quarterly granularity toggle
- **Bottom section**: Amortization table
  - Columns: Date | Payment | Principal | Interest | Balance
  - Actual payments (from Xero) in white background
  - Forecast payments in blue/highlighted background (matching Kevin Steel's pattern)
  - Overdue payments in red
  - Running balance column with sparkline

### Interest Rate Comparison

**Recommended pattern: Horizontal lollipop chart**
- Each loan = one row
- Dot position = current interest rate
- Line extends from 0 to the rate
- Color code: green = below Bank of England base rate + 2%, amber = base + 2-5%, red = base + 5%+
- Reference line at BoE base rate (currently 4.5%)
- Second reference line at "refinancing target rate" (user-configurable)
- Immediately shows which loans are expensive relative to the market

**Alternative: Small multiples for rate history**
- One mini-chart per loan showing rate over time
- Useful for variable rate loans where the rate has moved
- Overlay with BoE base rate to show spread changes

### Good/Bad Debt Classification

**Recommended pattern: Quadrant matrix**
- X-axis = interest rate (low to high)
- Y-axis = asset productivity (the asset funded by the debt — is it generating returns?)
- **Top-left quadrant (green)**: "Growth Debt" — low rate, high asset productivity (e.g., 3% loan funding equipment that generates 15% returns)
- **Top-right quadrant (amber)**: "Expensive Growth" — high rate but productive (refinance opportunity)
- **Bottom-left quadrant (amber)**: "Cheap but Idle" — low rate but the funded asset is underperforming
- **Bottom-right quadrant (red)**: "Bad Debt" — high rate AND low/no productivity (e.g., bounce-back loan used for operating expenses that didn't generate growth)

**Narrative annotation pattern (from finstory.ai):**
Each quadrant should have an AI-generated callout explaining the classification in plain English: "Your Barclays CBILS loan at 2.5% funded warehouse expansion that now generates 18,400/month in revenue. This is productive debt."

### Refinancing Scenario Planning

**Recommended pattern: Side-by-side comparison cards**
- **Current Loan Card**: Lender, balance, rate, remaining term, monthly payment, total remaining interest cost
- **Scenario Card(s)**: Same fields but with proposed new terms
  - Input fields for: new rate, new term, arrangement fees, early repayment charge
  - Auto-calculated: monthly payment change, total interest saving, breakeven point (how many months until fees are recouped)
- **Summary bar at bottom**: "Refinancing saves 12,400 over 3 years. Breakeven after 8 months. Recommendation: proceed."
- **Cash flow impact chart**: overlay showing current vs. refinanced monthly outflow over remaining term

**Advanced pattern: Multi-loan refinancing optimizer**
- Select multiple loans to consolidate
- System models the optimal consolidation (lowest total cost of debt)
- Shows: current total monthly payment vs. consolidated payment
- Flags: any early repayment charges that make consolidation uneconomic

### Debt-to-Equity Visualization

**Recommended pattern: Gauge chart with context**
- Gauge showing current D/E ratio
- Zones: green (healthy), amber (watch), red (overleveraged)
- Zone thresholds configurable per industry (construction D/E norms differ from SaaS)
- **Trend line below the gauge**: D/E ratio over last 12 months showing direction
- **Narrative annotation**: "Your debt-to-equity ratio is 1.8x, down from 2.1x in January. You are moving toward the healthy range for your sector (target: below 1.5x)."

**Supporting visualization: Waterfall chart**
- Shows bridge from equity to total capital
- Segments: Retained Earnings | Share Capital | Long-Term Debt | Short-Term Debt | Total Capital Employed
- Makes the composition of the capital structure immediately visible
- Highlights how much of the business is "owned" vs. "owed"

### Cash Flow Impact of Debt

**Recommended pattern: Debt Service Overlay on Cash Flow**
- Standard cash flow chart (bar or area)
- Red overlay showing debt service (principal + interest) as a proportion of operating cash flow
- **Debt Service Coverage Ratio (DSCR)** displayed as a KPI card above the chart
- Trend line showing DSCR over time
- Threshold alerts: if DSCR drops below 1.25x, flag as warning; below 1.0x = critical

**Alternative: Sankey diagram**
- Revenue flows in from the left
- Branches out to: Operating costs, Tax, Debt Service (principal + interest), Retained Cash
- Immediately shows what proportion of revenue goes to servicing debt
- Powerful for SME owners who have never seen their cash flow decomposed this way

---

## ADVISORY OS BUILD RECOMMENDATIONS

### Pre-Built Debt Module Architecture

**Page: Debt Command Centre** (new sidebar item under Financial Health or standalone section)

**Section 1: Portfolio Overview**
- All loans in one view (TreasuryView pattern)
- Summary cards: Total Debt Outstanding, Weighted Average Interest Rate, Total Monthly Debt Service, Next Payment Due, Next Maturity Date
- Maturity timeline (horizontal Gantt chart)
- Fixed vs. floating split (donut chart)
- Debt-to-equity gauge with trend

**Section 2: Individual Loan Detail** (click any loan to expand)
- Loan terms: lender, original amount, balance, rate (fixed/variable), term, start date, maturity date, payment frequency
- Amortization schedule (table + stacked area chart)
- Payment history (from Xero — auto-matched transactions)
- Interest rate history (for variable loans)
- Linked asset (if applicable — what was this loan used for?)
- Covenant status (if any covenants attached)

**Section 3: Debt Health Analytics**
- Good/bad debt quadrant matrix
- Interest rate comparison (lollipop chart)
- DSCR trend
- Cash flow impact overlay
- AI narrative: "Your total debt service consumes 23% of operating cash flow. This is within healthy range for your sector. Your most expensive loan (Barclays term loan at 7.2%) is a refinancing candidate — current market rates for your profile are approximately 5.5%."

**Section 4: Scenario Tools**
- Refinancing comparison cards
- "What if I pay off X loan early?" calculator
- "What if interest rates rise by 1%?" stress test
- Loan consolidation optimizer
- Goalseek: "What revenue do I need to bring DSCR above 1.5x?"

**Section 5: Compliance & Governance**
- Covenant tracker (traffic light dashboard)
- Payment calendar (all upcoming debt events)
- Deadline alerts (configurable: 30/15/7 days)
- Audit trail on every loan record change
- Export: compliance certificate, debt summary for board pack

### UK-Specific Features (Not in Any Competitor)

1. **HMRC Debt Tracker** — separate section for VAT, Corporation Tax, and PAYE payment plans (Kevin Steel pattern)
2. **CBILS / Recovery Loan Scheme Tracker** — government-backed loan terms are different (guarantee percentages, interest caps)
3. **Bounce-Back Loan Status** — many UK SMEs still carry these; track repayment status and "pay as you grow" flexibility options
4. **Commercial Mortgage Tracker** — with LTV monitoring against property valuations
5. **Invoice Finance / Factoring Dashboard** — different beast from term loans; track facility utilization, debtor concentration, availability

### Data Architecture

Loans should auto-populate from Xero where possible:
- Match liability accounts to loan records
- Auto-detect recurring payments as loan payments
- Pull interest charges from P&L
- Flag unmatched transactions for user review

Manual entry for terms not in Xero:
- Interest rate, loan type, maturity date, covenants
- These fields live in Advisory OS, not Xero
- Audit trail on every manual entry

### Integration with Existing Advisory OS Features

1. **KPI Engine**: Add Debt-to-Equity, DSCR, Interest Coverage Ratio, Debt Service as % of Revenue to pre-built KPI library
2. **Scenario Engine**: "What if I take a new 100K loan at 6%?" should auto-generate the full three-statement impact including amortization schedule
3. **Board Pack**: Auto-include debt summary section with maturity timeline, covenant status, and DSCR trend
4. **AI Commentary**: Claude API generates narrative on debt health as part of monthly/quarterly intelligence summaries
5. **Playbook Engine**: Trigger "Refinancing Opportunity" playbook when market rates drop below a loan's current rate by a configurable threshold

---

## COMPETITIVE POSITIONING STATEMENT

> "Every FP&A tool treats debt as a balance sheet line item. Advisory OS treats it as a strategic lever. Our Debt Command Centre gives SME owners and their advisors a complete view of their debt portfolio — with payment tracking, covenant monitoring, refinancing scenarios, and AI-powered recommendations — in a single governed dashboard. No FP&A competitor offers this. No treasury tool offers this with the forecasting and scenario depth we provide. This is a first."

---

## SOURCES

### FP&A Platform Research
- [DataRails Reviews & Features (Capterra)](https://www.capterra.com/p/177451/DataRails/)
- [DataRails FinanceOS (Fortune)](https://fortune.com/2026/03/10/datarails-aims-disrupt-itself-ai-financeos-didi-gurfinkel/)
- [Fathom Journals & Schedules in Forecasting](https://support.fathomhq.com/en/articles/4606897-journals-and-schedules-in-fathom)
- [Fathom Features](https://www.fathomhq.com/features)
- [Syft Analytics Visualization Guide](https://help.syftanalytics.com/en/articles/9070894-visualize)
- [Jirav Loan Schedule Documentation](https://help.jirav.com/bs/simple-loan)
- [Runway Financial Platform](https://runway.com)
- [Mosaic Debt Academy](https://www.mosaic.pe/academy/debt)
- [Puzzle Accounting Summary](https://help.puzzle.io/en/articles/6987040-summary-of-puzzle-by-page)
- [Planful Capital Planning Documentation](https://help.planful.com/v1/docs/capital-planning)
- [Vena Solutions FP&A](https://www.venasolutions.com/solutions/financial-planning-analysis)
- [Cube Software Features](https://www.cubesoftware.com/how-cube-works)

### Treasury & Debt Management Tools
- [TreasuryView Debt Portfolio Management](https://www.treasuryview.com/en/debt-portfolio-management)
- [TreasuryView Maturity & Fixed/Floating Tracking](https://www.treasuryview.com/en/how-to-track-loan-maturities-and-fixed-floating-mix)
- [DebtBook Treasury Management](https://www.debtbook.com/debt)
- [DebtBook 10 Ways Debt Software Boosts Efficiency](https://www.debtbook.com/blog/10-ways-debt-management-software-boosts-efficiency-accuracy-collaboration)
- [Cerebro Capital Loan Compliance Navigator](https://www.cerebrocapital.com/loan-compliance-navigator-features/)
- [Cerebro Capital Loan Compliance Best Practices](https://www.cerebrocapital.com/blog/3-practices-loan-compliance/)

### UX & Visualization Research
- [Loan Data Visualization Best Practices (FasterCapital)](https://fastercapital.com/content/Loan-Data-Visualization--How-to-Use-Interactive-Dashboards-and-Charts-to-Analyze-and-Communicate-Your-Loan-Performance-Metrics.html)
- [Financial Waterfall Charts (HiBob)](https://www.hibob.com/financial-tools/financial-waterfall-charts/)
- [Financial Dashboard Examples (Qlik)](https://www.qlik.com/us/dashboard-examples/financial-dashboards)
- [Balance Sheet Visual Presentation (Reach Reporting)](https://reachreporting.com/blog/transforming-a-balance-sheet-into-a-comprehensive-visual-presentation)
- [Fintech UX Design Practices 2026 (Onething Design)](https://www.onething.design/post/top-10-fintech-ux-design-practices-2026)
- [Best Debt Portfolio Analytics Software 2026](https://wifitalents.com/best/debt-portfolio-analytics-software/)
- [Debt Visualization Progress Tracking (FasterCapital)](https://fastercapital.com/content/Debt-Visualization--How-to-Visualize-Your-Debt-and-Track-Your-Progress.html)
