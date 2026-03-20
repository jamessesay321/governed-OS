# FP&A TOOL DEEP AUDIT — TOP 10 PLATFORMS
## Advisory OS Build Reference | March 2026

> **Purpose:** Feature-by-feature breakdown of the top 10 FP&A tools, mapped to Advisory OS sprint plan. Designed to be pushed directly to Claude Code as build specification context.

---

## EXECUTIVE SUMMARY — WHAT TO BUILD FIRST

Based on analysis across all 10 tools, here are the **highest-impact features** for Advisory OS, ranked by defensibility × user value:

### Tier 1: Build Immediately (Sprint 2-5 Priority)
1. **Natural Language Scenario Engine** — Runway and DataRails both prove this is the killer UX. Plain English text box → instant three-statement impact. No competitor in the SME advisory space has this.
2. **Variance Analysis with Drill-Down** — DataRails' click-through comparative analysis is the gold standard. Click any variance → break down by department, account, entity. Advisory OS needs this on every KPI.
3. **50+ Pre-Built KPI Library** — Fathom ships 50+ financial KPIs out of the box (revenue growth, breakeven margin of safety, cash conversion cycle, AR/AP days, expense-to-revenue ratio). Advisory OS should ship with at least 30 sector-agnostic KPIs.
4. **Three-Way Forecasting** — Fathom and Jirav both nail the P&L + Balance Sheet + Cash Flow forecast. This is table stakes for credibility with advisors.
5. **AI Commentary / Narrative Generation** — Fathom just shipped AI commentary. DataRails has Storyboards. This is the "explain the numbers" layer that SME owners actually need.

### Tier 2: Build in Sprint 6-8
6. **Goalseek / Reverse Scenario** — Fathom's Goalseek lets users ask "what revenue do I need to hit X margin?" This is the inverse of scenario planning and extremely powerful for non-finance users.
7. **Board Pack / Report Generator** — Every tool has this. DataRails auto-generates PowerPoint. Fathom has a drag-and-drop report editor. Advisory OS Sprint 8 covers this.
8. **KPI Alerts & Thresholds** — Fathom triggers alerts when KPIs cross thresholds. Simple but high-value for the governance layer.
9. **Benchmark Comparison** — Fathom and Syft both offer cross-client benchmarking. This feeds directly into the playbook engine.

### Tier 3: Phase 2
10. **Workforce/Headcount Planning** — Jirav, Mosaic, Runway all have dedicated modules. Park for Phase 2.
11. **Multi-Entity Consolidation** — Important for advisor portal but not single-business MVP.
12. **Month-End Close Automation** — DataRails' newest product. Adjacent but not core.

---

## TOOL 1: DATARAILS (FinanceOS)
**Category:** Excel-native FP&A platform → evolving into "Finance Operating System"
**Funding:** $175M total, $70M Series C (Jan 2026, led by One Peak)
**Revenue Growth:** 70% YoY, team nearly doubled to 400+ employees in 2025
**Target:** SMBs using Excel, mid-market finance teams
**Pricing:** Not publicly listed; enterprise pricing model

### Core Product Suite
- **FP&A** — Consolidation, reporting, budgeting, planning with Excel-native interface
- **Cash Management** — Real-time bank data, cash position monitoring, liquidity forecasting
- **Month-End Close** — Visualize, streamline, manage entire close process
- **Spend Control** — Expense management
- **FinanceOS** — New category (March 2026): governed execution layer connecting real-time data to AI (Claude, ChatGPT, Copilot)

### Feature Deep-Dive

#### Data Integration
- 200+ pre-built integrations (ERPs, CRMs, HRIS, banks, billing)
- 400+ data sources for FinanceOS
- Automated data consolidation from multiple entities and systems
- Real-time syncing — refresh on click or scheduled auto-refresh
- Excel remains the input/output layer — 100% Excel-native

#### Variance Analysis (KEY FOR ADVISORY OS)
- **Comparative Analysis**: Click any data point → panel shows variance breakdown
- Compare to: Previous Year, Previous Month, Budget, any custom period
- Breakdown by: Department, Account, Entity, Cost Center, any defined dimension
- Variance threshold: <10% suppressed, >10% shows insights on hover
- **Drill-Down List**: Click value → see all transactions contributing to that number (like Excel drill-down)
- **Drill-Down By**: Dynamic — click data point, choose any field to drill by on the fly
- Export drill-down data to Excel for further analysis
- Add variance breakdown as new dashboard widget with one click

#### Dashboard & Visualization
- **Widget Types**: Table, Pie Chart, Combo Chart, Waterfall Chart, Gauge (KPI progress), Column, Bar, Line
- **Widget Editor**: Override color palette per widget, add labels/tooltips/titles
- **Aggregation**: Switch between time periods (monthly, quarterly, annual) on the fly
- **Formatting**: Number formats (accounting, percentages), decimal control, comma separators
- Variance coloring: Green for favorable, red for unfavorable (auto-applied by value sign and metric context)
- **Pre-built dashboards**: P&L, Balance Sheet, KPIs, Validation, Warehouse (extra widgets to move around)
- Drill-down indicated by underlined labels throughout
- Dashboard sharing: scheduled email, PDF export, shareable link, invite members

#### AI Capabilities (CRITICAL COMPETITIVE INTELLIGENCE)
- **FP&A Genius**: Generative AI chatbot running on company's consolidated data
- **AI Finance Agents** (launched Jan 2026):
  - **Strategy Agent**: Tackles big-picture questions, transforms data into perspective/options/recommendations
  - **Reporting Agent**: Analyzes actuals, uncovers drivers, tells the story behind numbers
  - **Planning Agent**: Fast ad-hoc forecasting, scenario analysis, "what if" questions
- **Storyboards**: AI-powered storytelling — 2 clicks transforms financial data into narrative presentations
- **Insights by Datarails AI**: Configurable automated summaries — weekly, monthly, quarterly — choose KPIs, recipients, cadence
- **Auto-generated presentations**: Board-ready PowerPoint, PDF, and Excel from unified data
- Outputs grounded in validated financial data, not general LLM hallucinations

#### Forecasting & Planning
- Scenario analysis: Compare multiple financial outcomes
- Predictive forecasting using real-time data and ML algorithms
- Dynamic forecasts reflecting fluid business environments
- Custom calculations for industry-specific formulas
- External data integration: exchange rates, commodities, interest rates

#### Security & Governance
- SOC 2 certified
- User-based permissions
- Audit trails
- Built-in compliance features

#### UX Observations (from reviews)
- **Strengths**: Familiar Excel interface, fast reporting once set up, single-click drill-downs during presentations
- **Weaknesses**: Steep learning curve during implementation (4-6 weeks), Excel Add-In can be slow with many tabs, dashboards have gaps vs. Excel's built-in charts
- **Key Pattern**: Users value staying in Excel — Advisory OS should NOT force users into a new tool but augment their existing workflow

### Advisory OS Build Implications
- **Adopt**: Comparative analysis click-through pattern, variance threshold suppression, widget-based dashboard architecture
- **Adapt**: The text-box scenario engine should replace DataRails' more Excel-centric approach. SME owners don't want Excel.
- **Skip**: Excel-native focus (our users are NOT finance professionals who live in Excel)
- **Watch**: FinanceOS "governed execution layer" — this is exactly what Advisory OS is building. DataRails just validated the category.

---

## TOOL 2: FATHOM HQ
**Category:** Financial analysis, reporting, and forecasting
**Acquired by:** The Access Group
**Target:** Accountants, advisors, business managers — specifically designed for advisory practices
**Pricing:** Monthly pay-as-you-go, no contracts. Fathom Pro (full features) + Fathom Portfolio (client oversight)
**Integrations:** Xero, QuickBooks Online, MYOB, Excel, Google Sheets

### Feature Deep-Dive

#### Financial Analysis (50+ KPIs)
- **Pre-built KPI library**: 50+ standard financial KPIs calculated automatically
- Revenue Growth, Breakeven Margin of Safety, Cash Conversion Cycle
- Expense-to-Revenue Ratio, AR Days, AP Days
- Working Capital Ratio, Liquidity Ratio
- **Custom KPIs**: Formula-based, user-defined calculations
- **Non-financial KPIs**: Headcount, Number of Projects, New Orders/Leads/Customers, NPS Score, CSAT Score
- **KPI Explorer**: Overview of all KPIs across review periods, sort by variance from target or importance
- **KPI Alerts**: Triggered when result exceeds threshold (e.g., cash reserves below preset balance)
- **KPI Targets**: Set clear benchmarks per metric, track progress over time

#### Goalseek (UNIQUE — BUILD THIS)
- Change multiple variables → visualize overall impact on a specific KPI
- Essentially reverse scenario planning: "What do I need to change to achieve X?"
- Example: "What revenue do I need to reach 20% net margin?"
- Interactive and visual — users drag sliders to see impact

#### Breakeven Analysis
- Standard view showing when the business reaches profitability
- Interactive chart — entrepreneurs can see impact of different scenarios

#### Cash Flow Analysis
- Visual cash inflows and outflows
- Cash position tracking over time

#### Growth Metrics
- Visualize business growth over time
- Compare growth metrics across periods

#### Trend Analysis
- Chart financial and non-financial data over time
- Add comparatives (budget, prior year, etc.)

#### Forecasting (Three-Way)
- **P&L + Balance Sheet + Cash Flow** — fully integrated three-statement forecast
- Driver-based forecasting — build models based on operational drivers
- Scenario modelling — hope for best, plan for worst
- Forecast up to 36 months
- Auto-updates as financials refresh
- Forecast events: model specific events (hiring, asset purchase)
- Forecast notes: explain assumptions
- Include forecast in reports
- **Forecast Snapshots**: Compare actuals, budgets, and forecasts over time
- Audit trail: know where numbers come from

#### Reporting (THE UX GOLD STANDARD)
- **Drag-and-drop report editor** — combine text, charts, tables, financial statements
- **90+ ready-to-use chart types**, fully customizable
- **Report templates**: Ready-made templates, save custom templates for reuse
- **Automated delivery**: Schedule creation and delivery of reports
- **Brand customization**: Logos, cover pages, brand colors
- **Multi-format**: Print, web, any device
- **Conditional commentary**: Auto-show positive or negative comments based on rules
- **Draft mode**: Keep reports in draft until ready to share
- **In-app notifications**: Stay up to date on report activity
- **Batch operations**: Duplicate, move, delete multiple components at once
- **Financial statements**: Summary or detailed views
- **Placeholders**: Auto-reference latest numbers

#### AI Commentary (NEW — JUST LAUNCHED)
- AI-generated commentary that "actually knows your business"
- Shaped by goals, strategy, market conditions
- Every insight is relevant, every number is traceable
- PhD in ML on team doing testing, red teaming, training to minimize hallucinations

#### Multi-Entity & Benchmarking
- **Consolidated reporting**: Group companies, intercompany eliminations, multi-currency
- **Benchmarking**: Compare, rank companies/clients/franchisees
- **Insights Dashboard**: Key financial metrics across portfolio at a glance
- **Breakdown analysis**: Compare divisions, locations, business segments

#### UX Observations
- **Strengths**: "Refreshingly easy", beautiful visual reports, save hundreds of hours with templates, clean aesthetic, 14-day free trial, self-paced certification course
- **Weaknesses**: No public API, initial learning curve, consolidated charts module needs more granular features, data refresh can be slow
- **Key Pattern**: Fathom's UX is about COMMUNICATION — making numbers beautiful and understandable for non-finance people. This is exactly what Advisory OS needs.

### Advisory OS Build Implications
- **ADOPT HEAVILY**: KPI library architecture, Goalseek concept, three-way forecasting, report editor UX
- **Adapt**: Fathom is backward-looking analysis first, forecasting second. Advisory OS should be forward-looking first.
- **Replicate**: The 50+ pre-built KPI list — adapt for UK SMEs (include HMRC-relevant metrics)
- **Key Insight**: Fathom's advisory-first design (built for accountants serving clients) is the closest to Advisory OS's multi-party model

---

## TOOL 3: SYFT ANALYTICS (Now Xero-owned)
**Category:** Financial reporting, analytics, benchmarking
**Acquisition:** Acquired by Xero for up to $70M (Sept 2024)
**Status:** Being integrated directly into Xero as "Analytics powered by Syft"
**Target:** Accountants, bookkeepers, small businesses
**Availability:** US, Australia, UK (early access rolling out)

### Feature Set
- Interactive & collaborative financial reporting
- AI-powered anomaly detection
- Reports, visualizations, consolidations, forecasts, budgets, valuations, benchmarks
- Data integration: Xero, QuickBooks, FreshBooks, Stripe, Square, Shopify, Gusto
- 200,000+ businesses using it
- SOC 2 Type I and II accredited

### Key Features (Now in Xero)
- **Cash Flow Manager**: Detailed overview of cash position, forecast with confidence up to 180 days, predict bill/invoice payments based on past behavior, adjust for expected transactions, test big decisions
- **AI Insights** (beta, US): Select from suggested prompts to understand "why" behind profitability trends
- **Customizable dashboards**: Choose metrics, graph types, filters
- **Export & share**: PDF, Excel, Slack, WhatsApp, Teams
- **Industry benchmarks**: Compare against industry standards

### Advisory OS Build Implications
- **Key Insight**: Xero's acquisition of Syft validates that accounting platforms are moving toward embedded analytics. Advisory OS's Xero integration should surface Syft-equivalent insights within the governed environment.
- **Adopt**: Cash flow manager pattern (predict payments based on historical behavior), AI-driven anomaly detection
- **Watch**: As Syft integrates deeper into Xero, the standalone analytics layer becomes less relevant — Advisory OS should position as the intelligence layer ON TOP of Xero+Syft

---

## TOOL 4: JIRAV
**Category:** Driver-based FP&A for accounting firms and SMEs
**Target:** Accounting firms, fractional CFOs, VC-backed growth companies
**Pricing:** Not publicly listed; tiered pricing
**Integrations:** QBO, Xero, NetSuite, Sage Intacct, Gusto, BambooHR, Paylocity, ADP, Google Sheets

### Feature Deep-Dive

#### Driver-Based Modeling (JIRAV'S CORE)
- **Assumptions**: Global drivers (static variables)
- **Drivers**: Formulaic expressions forecasting account values
- **Sub-items**: Roll up into accounts
- Three-statement pro forma: P&L, Balance Sheet, Cash Flow — all interconnected
- Rolling forecasts, annual operating plans, long-range projections
- **Auto-forecast**: Smart algorithm using historical data, seasonality, trends to predict future
- Department-level planning: Include department heads for accountability

#### Scenario Planning
- Clone plans → update assumptions → compare
- Multiple what-if scenarios across all three financial statements
- Best-case / worst-case outcomes with full financial impact
- Compare actuals to budget AND multiple planning scenarios simultaneously

#### Workforce Planning
- Import employee roster
- Forecast new hires, raises, bonuses, accrued expenses
- Fully loaded cost modeling

#### Reporting & Dashboards
- **Industry-specific templates**: SaaS, professional services, nonprofits, manufacturing
- Plan-vs-actual variance views
- Rolling forecast visualizations
- Customizable client dashboards
- **Jirav Intelligent Forecasting (JIF)**: AI-powered — single toggle generates forecasts
- Automated alerts for significant variances or deadlines

#### UX Observations
- **Strengths**: Dashboard-based UI, driver-based approach loved by finance professionals, strong for accounting firm model
- **Weaknesses**: Steep learning curve for non-intuitive UI, limited customization in reporting, fewer third-party integrations than competitors, basic collaboration tools, only single comparisons (no multi-scenario overlay on one report)
- **Key Pattern**: Jirav is built for finance professionals, NOT business owners. The driver-based model requires financial literacy.

### Advisory OS Build Implications
- **Adopt**: Three-statement interconnected model architecture, driver-based forecasting concept
- **CRITICAL ADAPTATION**: Jirav's drivers/assumptions require finance knowledge. Advisory OS must translate this into plain English. "If you hire 2 more people in Q3" not "Adjust headcount driver in FTE assumptions table"
- **Skip**: Industry-specific templates (Advisory OS's playbook engine handles this differently)
- **Key Insight**: Jirav proves accounting firms want FP&A tools for client advisory. Advisory OS's advisor portal needs to match this depth.

---

## TOOL 5: RUNWAY
**Category:** Collaborative financial modeling for high-growth teams
**Funding:** $33.5M (Series A led by a16z)
**Target:** High-growth startups, 50-1,500+ employees
**Pricing:** Custom pricing, positioned as premium

### Feature Deep-Dive

#### Modeling Architecture (MOST INNOVATIVE)
- **"One Data" Model**: Unified data model eliminates silos
- **Drivers**: Named financial elements (cash flow, expenses) — human-readable names
- **Dimensions**: Properties to segment drivers (department, customer type, location, product, region)
- **Plans**: Tie initiatives directly to financial model (e.g., "Q3 marketing push")
- **Formulas in plain English**: Write logic in natural language, trace values to source
- **750+ integrations**: Accounting, HRIS, CRM, data warehouse tools
- **Separate Actuals/Forecast Formulas**: Distinct logic for historical vs. projected data

#### Scenario Management (BEST IN CLASS)
- **Draft/Sandbox Model**: Every assumption change auto-drafts a new scenario
- **Main scenario protection**: Admin-controlled merging
- Create explicit named scenarios ("Marketing x2", "Low-demand case")
- Side-by-side comparison without duplicating models
- **Macro scenarios**: Economy-level (GDP drops, interest hikes, tariff changes)
- **Micro scenarios**: Levers you control (pricing, hiring, volume, costs)

#### Runway Copilot
- AI-powered scenario generation in seconds
- **Ambient Intelligence**: Integrates into workflow, anticipates needs rather than waiting for commands
- Natural language questions → navigable reports

#### Collaboration
- Real-time collaborative planning
- Role-based permissions
- Cross-functional: sales, marketing, ops teams input directly
- Budget goals and accountability tracking

#### Reporting
- Audience-specific reports (CEO, investors, board)
- Drill-ins: Click-through from high-level to underlying data
- Multi-entity consolidation with dimensional segmentation

#### UX Observations
- **Strengths**: "Insane SQL engine", human-readable formulas, fast implementation, "white glove" onboarding, exceptional customer support
- **Weaknesses**: Relatively new (still adding features), pricey, needs dedicated model owner
- **Key Pattern**: Runway's plain-English formula approach and auto-draft scenarios are the UX standard Advisory OS should target

### Advisory OS Build Implications
- **ADOPT**: Plain-English formula concept, auto-draft scenario pattern, dimension-based segmentation
- **ADOPT**: The Ambient Intelligence philosophy — AI should anticipate, not wait
- **Adapt**: Runway is designed for finance teams at growth companies. Advisory OS needs this for non-finance SME owners.
- **Key Insight**: Runway's "50× efficiency improvement" claim (Superhuman case study) sets the bar for Advisory OS's NL scenario engine

---

## TOOL 6: MOSAIC (Now HiBob Finance Suite)
**Category:** Strategic finance platform
**Funding:** $73M total ($26M Series C, led by OMERS Ventures)
**Status:** Acquired by HiBob (April 2025); rebranded as "Bob Finance"
**Target:** SMB and mid-market, particularly SaaS/tech companies
**Founded by:** Three finance leaders from Palantir

### Feature Deep-Dive
- **Real-time analytics**: ERP, CRM, HRIS, billing integration
- **Metric Builder**: Create, analyze, plan custom financial metrics
- **Canvas Reports**: Flexible reporting canvases surfacing action items
- **Pre-built templates**: ARR reporting, headcount planning, SaaS metric benchmarking
- **Automated insights**: AI-driven forecast vs. actuals breakdowns
- **Board materials**: One-click generation of business state, forecasts, top-line metrics, burn rate
- **Version control**: Everyone works with most up-to-date data
- **4-week implementation**: Fast setup vs. 6+ month enterprise tools

### UX Observations
- **Strengths**: Easy setup, fast ROI, good for small teams without dedicated FP&A, clean data visualization
- **Weaknesses**: Limited collaboration until Jan 2025 update, not as customizable as enterprise tools, Excel power users need adjustment period
- **Key Insight**: Mosaic was acquired by HiBob (HCM platform), validating the convergence of people data and financial planning

### Advisory OS Build Implications
- **Adopt**: Metric Builder concept (custom KPI creation), fast implementation philosophy (4 weeks or less)
- **Adapt**: SaaS-specific metrics → sector-agnostic via playbook engine
- **Watch**: HiBob integration pattern — combining HR/people data with financial planning is relevant for Advisory OS's headcount cost modeling

---

## TOOL 7: PUZZLE
**Category:** AI-native accounting (not traditional FP&A)
**Funding:** $50M total ($30M Series A)
**Target:** Startups and their accounting firms
**Pricing:** Starts at $50/month, Advanced at $100/month, Complete at $200/month

### Feature Deep-Dive
- **AI-powered transaction categorization**: 90-95% automated
- **Dual-basis accounting**: Cash AND accrual simultaneously
- **Real-time metrics**: Burn rate, runway, ARR/MRR tracking
- **AI month-end close review**: Identifies potential errors
- **AI flux analysis**: Explains significant changes period-over-period
- **Continuous accuracy monitoring**: Flags issues in real-time
- **Integrations**: Stripe, Mercury, Ramp, Brex, Deel, Gusto
- **Close checklist**: Guided monthly bookkeeping tasks

### UX Observations
- **Strengths**: True AI-native (not bolted on), 98% auto-categorization, modern UI, startup-focused metrics
- **Weaknesses**: Not ideal for international businesses, hard to override AI miscategorizations, limited customization
- **Key Pattern**: Puzzle proves AI can handle 98% of bookkeeping. The remaining 2% (judgment calls, context-specific decisions) is where human advisors add value.

### Advisory OS Build Implications
- **Adopt**: AI-powered anomaly detection pattern, flux analysis concept (explain significant changes automatically)
- **Key Insight**: Puzzle's partner-only model (never competes with accounting firms) aligns perfectly with Advisory OS's advisor-first positioning
- **Integration Target**: Puzzle could be an accounting integration source alongside Xero for startup-focused clients

---

## TOOL 8: PLANFUL
**Category:** Enterprise FP&A, financial close, consolidation
**Target:** Mid-size to large enterprises (1,000+ customers including Boston Red Sox, Del Monte, TGI Friday's)
**Pricing:** Custom enterprise pricing
**Previously:** Host Analytics

### Feature Deep-Dive
- **Financial consolidation**: Multi-entity, multi-currency, intercompany eliminations
- **Driver-based planning**: Connect financial results to operational metrics
- **Rolling forecasts**: Dynamic adaptation to shifting environments
- **Planful Predict**: AI for anomaly detection and large-scale forecasting
- **Capital planning**: Asset performance analysis
- **Workflow management**: Reviews, approvals, submissions with status reports
- **Customizable dashboards**: KPIs, real-time data from ERP/CRM/HR integrations
- **Excel-like interface**: Familiar for finance teams

### UX Observations
- **Strengths**: Comprehensive budgeting/forecasting, strong consolidation, good value for money
- **Weaknesses**: Steep learning curve, reporting customization limited vs. competitors, performance issues with very large datasets, Chrome lag
- **Key Insight**: Planful is enterprise-grade — too heavy for SME advisory. But its consolidation and close management patterns are worth studying for Phase 2.

### Advisory OS Build Implications
- **Park for Phase 2**: Multi-entity consolidation, month-end close workflow
- **Adopt concept**: Approval workflow architecture for governance gates
- **Skip**: Enterprise complexity — not aligned with SME target

---

## TOOL 9: VENA SOLUTIONS
**Category:** Excel-native complete FP&A platform, Microsoft ecosystem
**Recognition:** 13 consecutive years in Nucleus Research CPM Value Matrix (Leader)
**Recent:** Acquired Acterys (Feb 2026) for Power BI write-back; launched Vena Copilot for Teams
**Target:** Mid-market, Microsoft-ecosystem companies
**Pricing:** Professional and Complete plans (not publicly listed)

### Feature Deep-Dive
- **Excel-native**: Uses Excel as primary interface with OLAP cube technology
- **Microsoft integration**: Excel, PowerPoint, Power BI embedded, Teams, Fabric
- **Vena Copilot**: Agentic AI purpose-built for FP&A, available in Teams meetings/chats
- **Vena Planning Agent**: Driver-based planning, predictive forecasting, intelligent scenario modeling via natural language
- **Workflow builder**: Automate processes, manage approvals
- **Template & version control**: Centralized, secure templates with audit trails
- **Cell-level audit trail**: See history of every number change
- **One-click version comparison**: Spot differences between template versions
- **Pre-configured templates**: Balance sheet, income statement, departmental variance, detailed views
- **Add-ons**: Workforce Planning, Capital Planning, Agile Planning
- **Vena Insights**: Power BI embedded for dashboards and self-service analytics

### UX Observations
- **Strengths**: True Excel integration (finance teams love it), fast setup for reporting, strong audit trails, drill-save feature showing value changes over time
- **Weaknesses**: No direct consolidation solution, poor Mac support, minor bugs, needs implementation partner for best results, data connectivity not always satisfying
- **Key Insight**: Vena's Microsoft-first strategy validates Advisory OS's Google-first approach (for different market segments). The co-sell through Azure Marketplace is a growth model to study.

### Advisory OS Build Implications
- **Adopt**: Cell-level audit trail concept (fits governance moat), workflow builder pattern, version comparison
- **Study**: Vena Copilot in Teams — this is the model for Advisory OS's Slack integration
- **Differentiate**: Advisory OS targets Google Workspace first, then Microsoft — the inverse of Vena's approach

---

## TOOL 10: CUBE
**Category:** Spreadsheet-native financial intelligence platform
**Founded by:** 3× CFO (Christina Ross)
**Target:** Startups to mid-market, finance teams using Excel/Google Sheets
**Pricing:** Custom (historically $1,250-$2,800/month range)

### Feature Deep-Dive
- **Spreadsheet-native**: Works in Excel AND Google Sheets (unique differentiator)
- **AI Analyst**: Natural language questions → smart reports ("How did revenue per sales rep trend last quarter?")
- **FP&Agents**: Automated variance analysis, smart forecasting, NL Q&A
- **Bi-directional sync**: Real-time between Cube and spreadsheets
- **Scenario planning**: Multiple forecast scenarios, test business driver impacts
- **Automated variance analysis**: Flags budget vs. actual shifts, identifies revenue/cost drivers, drafts commentary
- **Intelligent mapping**: Plain language rules → structured dimensions and hierarchies
- **Slack/Teams apps**: Conversational AI for finance queries
- **SOC 2 Type II**: Role-based access, audit trails
- **Quick implementation**: Among fastest in the industry (G2 recognition)

### UX Observations
- **Strengths**: Fast implementation, excellent customer support, reliable daily use, Google Sheets support (rare), AI-driven scenarios
- **Weaknesses**: Limited drill-down, restricted custom dimensions, dashboard customization needs work, no headcount planning module
- **Key Insight**: Cube's Google Sheets support and Slack integration make it the closest competitor to what Advisory OS is building from a UX perspective

### Advisory OS Build Implications
- **ADOPT**: Google Sheets support pattern, Slack-native querying, automated variance commentary drafting
- **Differentiate**: Advisory OS adds governance, multi-party workflow, and playbook layers that Cube completely lacks
- **Competitive Note**: Cube is the tool most likely to be confused with Advisory OS by potential customers. Clear positioning is essential.

---

## CROSS-PLATFORM FEATURE MATRIX

| Feature | DataRails | Fathom | Syft | Jirav | Runway | Mosaic | Puzzle | Planful | Vena | Cube |
|---------|-----------|--------|------|-------|--------|--------|--------|---------|------|------|
| NL Scenario Engine | ● | ○ | ○ | ○ | ● | ○ | ○ | ○ | ● | ● |
| Variance Drill-Down | ● | ◐ | ◐ | ◐ | ● | ◐ | ○ | ● | ● | ◐ |
| 50+ Pre-Built KPIs | ◐ | ● | ◐ | ◐ | ○ | ◐ | ◐ | ◐ | ◐ | ◐ |
| Three-Way Forecast | ● | ● | ◐ | ● | ● | ◐ | ○ | ● | ● | ◐ |
| AI Commentary | ● | ● | ◐ | ◐ | ● | ◐ | ◐ | ◐ | ● | ● |
| Goalseek | ○ | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| Report Builder | ● | ● | ◐ | ● | ● | ◐ | ○ | ● | ● | ◐ |
| Board Pack Gen | ● | ● | ○ | ● | ● | ● | ○ | ● | ● | ◐ |
| KPI Alerts | ◐ | ● | ◐ | ● | ○ | ◐ | ◐ | ◐ | ◐ | ○ |
| Benchmarking | ○ | ● | ● | ◐ | ○ | ● | ○ | ◐ | ○ | ○ |
| Xero Integration | ● | ● | ● | ○ | ◐ | ○ | ○ | ◐ | ◐ | ◐ |
| Google Sheets | ○ | ● | ○ | ◐ | ○ | ○ | ○ | ○ | ○ | ● |
| Audit Trail | ● | ◐ | ◐ | ○ | ◐ | ◐ | ◐ | ● | ● | ● |
| Multi-Entity | ● | ● | ● | ◐ | ● | ◐ | ○ | ● | ◐ | ◐ |
| Workforce Plan | ○ | ○ | ○ | ● | ● | ● | ○ | ◐ | ● | ○ |
| Playbook/Actions | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| Multi-Party Workflow | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| Role-Based Visibility | ◐ | ◐ | ○ | ○ | ● | ○ | ○ | ● | ● | ● |

● = Full feature | ◐ = Partial | ○ = Not present

**CRITICAL TAKEAWAY**: The last three rows confirm the competitive analysis — NO competitor has playbook/actions, multi-party workflow, or role-based visibility at the Advisory OS level. This remains the clearest uncontested whitespace.

---

## SPRINT-MAPPED BUILD RECOMMENDATIONS

### Sprint 2: Xero Integration with Governed Data Pipeline
**Learn from:** Syft (Xero-native), Fathom (seamless Xero sync), DataRails (200+ integrations pattern)
**Build:**
- OAuth connection with Xero (Fathom pattern: 2-click setup)
- Auto-sync financial data on schedule + manual refresh button
- Map GL accounts into customizable categories (Mosaic pattern)
- Audit trail on every data pull (Vena pattern: timestamp + source tracking)

### Sprint 3: KPI Engine with Variance Analysis
**Learn from:** Fathom (50+ KPIs, KPI Explorer), DataRails (comparative analysis), Cube (automated variance commentary)
**Build:**
- 30+ pre-built KPIs: Revenue Growth, Gross Margin, Net Margin, Breakeven Margin of Safety, Cash Conversion Cycle, AR Days, AP Days, Expense-to-Revenue Ratio, Working Capital Ratio, Burn Rate, Runway, Current Ratio, Quick Ratio, Debt-to-Equity, ROE, ROA, Revenue per Employee, Customer Acquisition Cost, LTV, Churn Rate (if SaaS), MRR/ARR (if SaaS), Inventory Turnover, Operating Cash Flow, Free Cash Flow, EBITDA Margin, Interest Coverage, Fixed Charge Coverage
- Custom KPI builder (Fathom pattern: formula-based, any data inputs)
- Non-financial KPI support (Fathom: headcount, NPS, CSAT, projects)
- KPI Explorer view: all KPIs in grid, sort by variance from target, importance
- Variance analysis: Click any KPI → comparative analysis panel (DataRails pattern)
- Breakdown by: Any dimension in the data (department, product, location)
- Threshold-based alerts (Fathom: configurable per KPI)
- Variance coloring: Green favorable / Red unfavorable (DataRails convention)
- AI-generated variance commentary (Cube pattern: drafts explanation of what drove the change)

### Sprint 4: AI Onboarding Interview
**Learn from:** Puzzle (AI learns from user patterns), DataRails AI Agents (knows your business)
**Build:**
- Chat-based onboarding pulling from Xero data to contextualize questions
- Build business profile from conversation (sector, stage, goals, pain points)
- Auto-suggest relevant KPIs based on business type
- Generate initial dashboard configuration from onboarding responses
- Voice option via Vapi.ai

### Sprint 5: NL Scenario Engine
**Learn from:** Runway (plain-English formulas, auto-draft scenarios), DataRails (Planning Agent), Cube (NL Q&A)
**Build:**
- Plain English text box: "What happens if I hire 2 people next quarter?"
- Auto-draft scenario from input (Runway pattern)
- Show impact across P&L, Balance Sheet, Cash Flow simultaneously (Jirav three-statement model)
- Compare scenarios side-by-side without duplicating models (Runway sandbox pattern)
- Macro scenarios (market conditions) + micro scenarios (operational levers) — Runway framework
- Goalseek mode (Fathom): "What revenue do I need to reach 15% net margin?"
- User confirmation required before applying any changes (Advisory OS governance principle)
- AI reasoning chain collapsed by default, expandable on click

### Sprint 6: Playbook & Maturity Scoring
**Learn from:** NONE — this is Advisory OS's uncontested whitespace
**Build based on original spec — no competitive reference needed**

### Sprint 7: Macro-to-Micro Intelligence Layer
**Learn from:** DataRails Insights (automated summaries), Fathom AI Commentary, Runway Ambient Intelligence
**Build:**
- Personalised monetary impact statements ("Your AR days increased by 5 → this costs you £12,400/year in working capital")
- Automated weekly/monthly summaries (DataRails Insights pattern: configurable cadence/KPIs/recipients)
- AI narrative generation grounded in actual data (Fathom pattern: every number is traceable)
- Proactive insights (Runway Ambient Intelligence: anticipate, don't wait for questions)

### Sprint 8: Board Pack PDF
**Learn from:** Fathom (drag-and-drop report editor, 90+ charts), DataRails (Storyboards, auto PowerPoint)
**Build:**
- Report template system (Fathom: save and reuse templates)
- Include: KPI dashboard, P&L summary, cash flow forecast, variance analysis, scenario comparison
- Conditional commentary (Fathom: auto-show positive/negative based on rules)
- Brand customization (logo, colors)
- PDF export with professional formatting
- Scheduled delivery option

### Sprint 9: Knowledge Vault
**Learn from:** DataRails FinanceOS (governed data layer), Vena (cell-level audit trail)
**Build based on original spec with governance patterns from competitive research**

---

## WEEKEND HANDS-ON REVIEW ROADMAP

### Priority Order (highest impact on build decisions)

#### Session 1: Fathom HQ (45 min) — Saturday Morning
**Why first:** Closest to Advisory OS's UX philosophy. 14-day free trial, no credit card.
**What to capture:**
1. KPI Explorer screen — how are 50+ KPIs presented? Grid layout? Cards? Sorting UX?
2. Goalseek interaction — how do you adjust variables? Sliders? Input fields? Real-time update speed?
3. Report editor — drag-and-drop experience, chart customization options, template save flow
4. AI Commentary — trigger it, assess quality, see how it references data
5. Three-way forecast setup — how intuitive is it for a non-finance user?
6. **Record**: Screen recording of full Goalseek flow + report editor flow

#### Session 2: DataRails (30 min) — Saturday Afternoon
**Why:** Variance analysis drill-down is the pattern to replicate. Request demo (no free trial).
**What to capture:**
1. Dashboard drill-down: Click a bar → drill-down menu → comparative analysis panel
2. Widget editor: How do you customize a widget? Color? Aggregation toggle?
3. Storyboards: How does AI storytelling flow from data → narrative → presentation?
4. **If demo only**: Focus on getting the variance analysis UX on screen recording

#### Session 3: Runway (30 min) — Saturday Evening
**Why:** Best-in-class scenario engine UX. Request demo.
**What to capture:**
1. Plain-English formula creation — how does it feel to write "revenue grows 10%"?
2. Auto-draft scenario behavior — what happens when you change an assumption?
3. Scenario comparison view — side-by-side or overlay?
4. Dimension setup — how do you segment by department/product?
5. **If demo only**: Focus on scenario creation and comparison UX

#### Session 4: Cube (30 min) — Sunday Morning
**Why:** Closest competitor to Advisory OS's UX. Free demo available.
**What to capture:**
1. Google Sheets integration — how does bi-directional sync feel?
2. AI Analyst — ask a natural language question, assess response quality
3. Slack integration — how does the conversational finance query work?
4. Automated variance commentary — quality and usefulness

#### Session 5: Jirav (20 min) — Sunday Afternoon
**Why:** Driver-based modeling depth. Request demo.
**What to capture:**
1. Assumption/driver/sub-item setup — how complex is it?
2. Auto-forecast toggle (JIF) — speed and accuracy feeling
3. Industry-specific template selection — UX of choosing a template

### What I CANNOT Capture (Your Focus Areas)
1. **Response times under load** — How fast do dashboards render with real data?
2. **Mobile experience** — Does anything work well on phone?
3. **Onboarding friction** — Where do you get confused as a non-finance user?
4. **"Aha moment" timing** — How quickly do you see value?
5. **Export quality** — Open a generated PDF/PPT, assess print quality
6. **Error handling** — What happens when you enter bad data or impossible scenarios?

---

## CLAUDE COWORK + CHROME SCANNING APPROACH

### How It Works

Claude Cowork (launched Jan 2026) paired with Claude in Chrome creates a powerful research and file automation pipeline. Here's how to set it up for ongoing FP&A tool monitoring:

### Setup
1. **Claude in Chrome** (already available in beta on all paid plans)
   - Install Chrome extension from Chrome Web Store
   - Claude sees what you see in the browser, can navigate, click, fill forms, extract data
   - Works across multiple tabs simultaneously

2. **Claude Cowork** (available on Max and Pro plans)
   - Desktop app → click "Cowork" tab
   - Grant access to a dedicated folder (e.g., `~/Advisory-OS/competitive-research/`)
   - Cowork handles multi-step tasks autonomously: read files → browse web → create outputs

### Workflow for FP&A Tool Scanning

**Step 1: Point Cowork at competitor sites**
```
Prompt: "Go to datarails.com/features, fathomhq.com/features, runway.com/product, 
and cubesoftware.com/how-cube-works. For each site:
1. Extract every feature listed
2. Screenshot key UI patterns
3. Save findings as structured JSON per tool
4. Create a comparison spreadsheet in my research folder"
```

**Step 2: Monitor changes over time**
- Use Claude in Chrome's **scheduled tasks** feature to run recurring checks
- Example: Weekly scan of competitor changelog pages, pricing pages, and feature announcements
- Cowork saves delta reports to your local folder

**Step 3: Generate build specs from findings**
```
Prompt: "Read the competitive research files in this folder. Cross-reference 
with CLAUDE.md sprint plan. For each sprint, create a specification document 
that includes:
- Features to replicate (with source tool)
- UX patterns to adopt
- Differentiators to maintain
- Files should be saved as sprint-specific markdown"
```

### Limitations to Know
- Chrome automation is slower than expected (2-3 min per multi-page task)
- Pro plan users get Haiku 4.5 (less capable) — Max plan recommended for quality
- Browser automation eats through usage limits faster than regular chat
- Cannot access content behind login walls (demos/trials need manual login first)
- xlsx parsing struggles with complex spreadsheets (fine for text extraction)
- **Security caution**: Don't point Cowork at sensitive financial documents

### Recommended Approach
1. **You log into free trials** (Fathom, Syft, Cube) manually
2. **Chrome extension** navigates within the logged-in session to extract feature details
3. **Cowork** processes the extracted data and generates structured outputs
4. **Push outputs to Claude Code** as context for overnight builds

This creates a continuous competitive intelligence loop: Chrome scans → Cowork structures → Claude Code builds.

---

## FINAL BUILD PRIORITY — OVERNIGHT SESSION

For tonight's Claude Code push, prioritize these features from the audit:

1. **KPI Engine architecture** — Data model supporting 30+ pre-built KPIs with custom KPI formula builder
2. **Variance analysis component** — Click-through drill-down with dimensional breakdown
3. **NL query interface** — Text box that translates to scenario calculations against real Xero data
4. **Goalseek reverse calculation** — "What X do I need to achieve Y?" 
5. **AI narrative generation** — Auto-explain what drove each variance in plain English
6. **KPI alert thresholds** — Configurable per KPI with notification system
7. **Dashboard widget system** — Drag-and-drop widgets (table, chart types, gauge, waterfall)

These seven features, built on governed Xero data with audit trails, create a product that matches the analytical depth of DataRails + the UX clarity of Fathom + the scenario intelligence of Runway — while adding the governance, playbook, and multi-party layers that NONE of them have.

---

## TOOL 11: KEVIN STEEL / INFLECTIV INTELLIGENCE (Claude Code-Built)
**Category:** Custom-built FP&A platform for fractional CFO practice
**Builder:** Kevin Steel, Remote Fractional CFO for £1mm-£20mm Service Companies
**Tech:** Built entirely with Claude Code, 143 commits, 24 days, 1 developer, 28+ pages, 3 API integrations
**Status:** v0.1.0, actively shipping features weekly. Not intended for commercial sale — used as service delivery tool.

### Why This Matters
Kevin is the EXACT persona of a fractional CFO who would use Advisory OS instead of building his own. He can build because he's technical enough for Claude Code. The vast majority of fractional CFOs can't. A Financial Director at Legl commented: "How would I even start to build something like this? Starting feels like the biggest hurdle."

### Build Timeline (4 Weeks)

**Week 1 — Foundation:**
- P&L Engine + Forecasting
- Balance Sheet + Working Capital
- Cash Flow — Direct, Indirect, 13-Week
- Tax — VAT, Corp Tax, PAYE, Pension
- Prepayments & Accruals
- Loans & Fixed Assets
- Aged Debtors & Creditors
- AES-256 Encryption

**Week 2 — Platform:**
- Multi-client Encrypted Vault
- KPI Module — 19 metrics
- Report Builder — 20 block types
- PDF & HTML Export
- AI Commentary Generation
- Goalseek & Sensitivity Analysis
- Group Consolidation + FX
- Scenarios — Best / Worst / Budget

**Week 3 — Integrations:**
- Xero API Live Sync
- QuickBooks Online OAuth
- Sage Business Cloud API
- Excel / CSV Import & Export
- Master Password System
- Auto-backup & Auto-save
- Security Hardening
- Intercompany Recharges

**Week 4 — Polish:**
- Dark Mode — 28 pages
- Dashboard & Org Chart
- Headcount Register — 47 staff
- Payroll Groups
- Board Pack Template
- Variance Analysis
- DSO / DPO Analytics
- Manual Deferred Income

### Feature Deep-Dive

#### UK Tax Engine (NOT in any US-focused FP&A tool)
- **Corporation Tax**: Rate field (default 23.5% in his demo, standard UK rate is 25%) applied to PBT for forecast months. Overrides any manually mapped corporation tax lines.
- **VAT Settings**: Controls quarterly VAT settlement timing on the balance sheet. VAT codes set per miniforecast. VAT Quarter Start Month selector (January default). Quarters: Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec.
- **Payroll Rates**: PAYE Rate (20%), Employee NI Rate (8%), Employer NI Rate (15%), Employee Pension Rate (5%), Employer Pension Rate (3%). Rates applied to gross payroll from selected P&L categories. Employee deductions are withheld (no additional P&L cost). Employer costs are extra P&L expenses.
- **HMRC Payment Plans**: For historical tax debts on monthly repayment with HMRC. Opening balance taken from actuals at lock month. Each forecast month deducts monthly payment until zero. Three types: VAT Payment Plan, Corp Tax Payment Plan, PAYE Payment Plan. Does NOT disrupt main payment timing profiles (PAYE next month, VAT quarterly, CT 9 months).

#### Payroll Groups
- Group salary nominals by team (e.g. "Client Services" with 2 salary nominals, NI 15% → nominal 405 — Employer NIC, Pension 3%)
- Each group maps salary nominals to target NI/Pension nominals with per-group employer rates
- Forecast months are auto-calculated from the salary inputs
- Switch between grouped view and flat mode
- Add multiple payroll groups (+ Add Payroll Group button)
- Useful for viewing fully loaded staff cost per team across the business

#### Payroll Categories
- Select which P&L categories represent gross payroll
- Employer NI and Employer Pension auto-calculated from the total of these categories for forecast months
- Categories: Recurring Revenue, Non-Recurring Revenue, Other Revenue (all Revenue type), Direct Labour, Direct Materials, Other COGS (all COGS type), Salaries & Wages (CoGs type)

#### KPI Module (19 metrics with targets and variance)
- **Profitability section**: Revenue, Gross Profit, EBITDA, EBIT, PBT, PAT, Total OpEx
- **Efficiency section**: Headcount, Avg Monthly Salary, Revenue per Employee, Website Visits, Cost per Website Visit
- **Margins section**: Gross Profit Margin (with target row and variance row), EBITDA Margin, PAT Margin, OpEx/Revenue
- Formulas displayed at top: e.g. "PAT Margin", "OpEx / Revenue"
- Results shown in monthly grid (Jan-Dec) with actuals (white background) and forecast months (blue/highlighted background)
- Target row shows target per month; Variance row shows delta colour-coded red for unfavourable
- KPIs vs Targets: Set targets for financial and non-financial KPIs that flow through into reporting

#### Forecasting Logic Formulas
- `[[AVERAGE6]]` — Takes the average of the last 6 months figures for a specific nominal code and forecasts it forward. Handy for random accounts like Travel.
- `[[PREVMONTH]+1]` — Adds 1 to the previous month result. Handy for modelling increase in numbers of clients (Number of clients × Monthly fee formula).
- `[[SMLASTYEAR]]` — Links directly to the result for the same month last year. If March 2026, returns March 2025 figure.
- These are entered per nominal code in the forecast configuration.

#### Report Builder (20 block types)
- Financial tables with automatic actual/forecast shading, section totals, smart auto-transpose (flips layout when more months than metrics)
- Waterfall charts showing the bridge from Revenue → EBITDA → PAT
- Variance bridges, budget vs actual with positive/negative colour coding
- KPI cards with sparklines, trend arrows, and period-over-period comparison
- Dashboard blocks, 4-up summary panels with mini charts
- Pie charts with hover tooltips showing £ values and percentages
- Two-column layouts, section headings, insight callouts, scenario decision cards
- 7 theme presets: Corporate Blue, Forest, Midnight, Sunset, Ocean, Slate, Minimal — with full colour customisation per report

#### Interactive HTML Export
- Dark mode toggle — one click switches the entire report
- Collapsible sections — expand/collapse
- Hover tooltips on charts showing exact £ values
- Print-optimised CSS — page breaks respect block boundaries so KPI cards, dashboards, and charts never split across pages
- SVG hardening — every chart cloned with explicit dimensions for cross-browser consistency

#### PDF Export
- Block-by-block rendering with intelligent page splitting
- Tables get row-level breaks with repeated headers
- Charts and cards stay intact (never split)
- JPEG compression brought file size to 1.3mb
- Pie chart labels rendered via SVG-to-canvas conversion to survive html2canvas pipeline
- Dynamic column sizing — wide tables automatically reduce font size and adjust label columns to prevent overlap
- Every report generated client-side with AES-256 encrypted file storage

#### AI-Powered Board Pack Generation
- Describe the board pack in natural language: "monthly performance report with revenue trends, cost breakdown, and three growth scenarios"
- AI generates the full board pack structure
- User edits from there
- All content sections are editable after generation

#### Group Consolidation
- Multiple entities (e.g. Mock Group GBP, Mock London GBP, Mock Creative USD)
- Each entity: currency, scenario selection (Baseline, Best Case, Budget), status (Loaded), include/exclude toggle
- Full forecast pull through — ANY change to forecast data for an individual company flows through to group and consolidates for up to 5 years
- Choose scenarios per company for consolidation (Company A — Worst Case, Company B — Medium Case, Company C — Best Case)
- Group consolidated forecast shows P&L, Balance Sheet, Cash Flow for each scenario
- Toggle scenarios per company and group consolidation updates in real time
- FX Rates management, CoA Mapping, Eliminations
- Consolidated views: P&L, Balance Sheet, Cash Flow, KPIs, Reports

#### Navigation Structure (Left Sidebar)
**P&L section**: Import, Mapping, Drivers, Miniforecasts, Forecast, P&L
**Balance Sheet section**: BS Import, BS Mapping, Aged Debtors, Aged Creditors, Prepay & Acc Inc, Accruals & Deferrals, Loans, Fixed Assets, Balance Sheet
**Cash Flow section**: Indirect Method, Direct Method, 13 Week
**Reports section**: Reports
**Analysis section**: Goalseek
**Config section**: Tax Settings, Scenarios, KPIs, Settings

#### Xero Integration Details
- Direct API link — P&L and balance sheet pull automatically from accounting software
- Took ~8 hours to implement (Kevin's own report)
- Linking to the API was easy (~1-2 hours), but mapping GL accounts to correct places required significant debugging
- Both Xero and QuickBooks APIs function differently — required debugging for both
- Sage Business Cloud added later (3 hours)
- Now supports: Xero, QuickBooks Online, Sage Business Cloud, Excel/CSV import

#### Community Response
- 43 reactions, 18 comments on update post
- 38 reactions, 11 comments on KPI/forecasting post
- Luke Giacomazzi (Financial Director @ Legl, FCCA AFM): "This looks amazing. Claude and excel has been my go to so far. How would I even start to build something like this? For me, starting feels like the biggest hurdle."
- Julie Bailey (CFO | Fractional): "I'm starting my API link over the next 7 days"

### Advisory OS Build Implications
- **Kevin's target market IS our target market** — £1mm-£20mm UK service companies
- **His alpha cohort overlaps ours** — he works with Alonuko
- **He will never sell commercially** — his exact words. But he proves the demand exists.
- **The 8-hour Xero integration** — Advisory OS can beat this with a smarter auto-mapping layer (Claude API suggests mappings with confidence scores, user approves)
- **His forecast formulas** (`[[AVERAGE6]]`, `[[PREVMONTH]+1]`, `[[SMLASTYEAR]]`) — Advisory OS should support equivalent logic but via plain English ("forecast travel costs using last 6 months average")
- **His report builder quality** — 20 block types, 7 themes, interactive HTML export with dark mode, print-optimised PDF. This is the bar for Sprint 8.

---

## TOOL 12: FINSTORY.AI (Financial Storytelling)
**Category:** AI-native financial storytelling platform
**Founders:** Wouter Born (CEO), Joost Vogelezang (COO), Matías Panario (CTO), Ali Bilawal (Chief Growth Officer)
**Status:** Early access, waitlist open, running pilot customers
**Target:** CFOs and finance teams who need to turn numbers into board-ready narratives

### Core Concept
"Finance should do more than just report. It should persuade, align, and drive decisions."

The platform takes financial data and generates executive-ready narratives — not just charts, but the STORY behind the numbers. The key insight: boards don't want a history lesson, they want a forecast of the future. Every number should answer "So what?"

### What Joost Demonstrated with Claude's Visualization Feature
- Uploaded a P&L to Claude
- Claude didn't hand him a dashboard — it READ the business first
- Visualized the portfolio, identified store formats, categorized by risk profile
- Built three capital allocation scenarios
- Asked five clarifying questions
- Produced a board-ready deck with strategic options

### Key UX Patterns to Learn From
- **Available Metrics panel**: Shows top-line KPIs (Gross Sales €1.53M ↑42% YoY, Net Sales €1.36M ↑38% YoY, Product Margin €621K 45.6% PM, EBITDA €223K ↑398% YoY, Net Profit €206K ↑860% YoY)
- **Metric line tags**: Clickable pill-shaped tags for available metrics (Gross Sales, Discounts %, Net Sales, Product Margin, Supplier Rebates, COGS, Staffing, Rent, Other Fixed, EBITDA, Depreciation, Net Profit)
- **Breakdown dimension tags**: Store (10 stores), Month (24 months), Quarter, Year (2024/2025), Store format, Store age/vintage
- **Store format identification**: AI auto-detected store formats from data (Flagship, Coastal adventure, Suburban, Trail-side, Mountain/MTB, Urban, High-end resort, Highway touring, New/baby)
- **Store Waterfall chart**: Net sales by store, showing contribution of each location
- **Narrative annotations on charts**: "Revenue momentum strong: Three consecutive months of growth. Recurring revenue base now covers 65% of fixed costs." and "Margin expansion opportunity: Gross margin has room to improve by 3-5pp if subcontractor mix is reduced in Q3."

### Advisory OS Build Implications
- **Adopt the narrative annotation pattern** — charts in Advisory OS should have AI-generated insight callouts positioned next to the relevant data point, not just in a separate text block
- **Adopt the metric/dimension tag system** — show available metrics and breakdown dimensions as clickable pills, letting users explore data conversationally
- **Key insight**: finstory.ai's entire value proposition is "numbers → narrative." Advisory OS embeds this as a FEATURE (Sprint 7 intelligence layer), not a standalone product. That's the advantage — finstory needs users to upload data manually; Advisory OS has governed Xero data already flowing.
- **The "So what?" principle**: Every number displayed in Advisory OS should be accompanied by a "so what" — why does this matter for THIS business? Claude API handles this via the personalised monetary impact statements.
- **Joost is worth following closely** — add to People to Monitor. His substack (finstoryai.substack.com) regularly demonstrates Claude's latest finance capabilities, which directly inform how Advisory OS should use the Claude API.


---

## CLAUDE'S NATIVE FINANCE CAPABILITIES (March 2026)

### Why This Section Exists
Advisory OS uses the Claude API as its intelligence engine. This section documents what Claude can ALREADY do natively for finance — so Claude Code knows what to call via API rather than building custom. As Anthropic ships upgrades, these capabilities improve automatically if Advisory OS's architecture calls the API correctly (data-forward prompts, not hardcoded logic).

### Inline Visualizations (Launched March 12, 2026)
- Claude generates interactive charts, diagrams, and visualizations DIRECTLY inside conversations — not just in the Artifacts side panel
- Powered by React components and SVG rendering, handled natively
- Charts appear inline, change as discussion progresses
- Available to ALL Claude users including free tier (beta)
- **Advisory OS implication**: When calling the Claude API, Claude can return React/SVG visualization code that Advisory OS renders directly. No need for a custom charting engine — Claude generates the chart code from the financial data. Use Recharts for standard charts, Claude API-generated React for complex/custom visualizations.

### What Claude Does for Finance (Tested by CFOs, March 2026)
Joost Vogelezang (finstory.ai) tested Claude Opus 4.6 with a real P&L:
- Claude READS the business first before producing any output — identifies store formats, categorizes locations by risk profile, understands the business model
- Generates interactive portfolio maps showing all business units with risk classification
- Builds three distinct capital allocation scenarios with tradeoff analysis (Aggressive expansion vs. Replicate what works vs. Improve and preserve)
- Produces board-ready narrative with strategic options, each with monetary impact estimates
- Asks clarifying questions when data is ambiguous rather than hallucinating
- Every number traces back to the uploaded data
- Shows "Available Metrics" panel with clickable pills (Gross Sales, Net Sales, COGS, EBITDA, etc.)
- Shows "Breakdown Dimensions" as clickable tags (Store, Month, Quarter, Year, Store format, Store age)
- Auto-detects business segments/formats from data patterns

### Claude's Finance Ecosystem (Components Advisory OS Can Leverage)

**Excel Plugin:** Claude sits inside Excel. DataRails CEO publicly stated: "You no longer need traditional FP&A tools to build models. AI engines like Claude in Excel can generate sophisticated financial models in seconds." Advisory OS implication: for users who want Excel, export governed data to Excel where Claude's plugin assists — but the audit trail lives in Advisory OS.

**PowerPoint Plugin:** Syncs analysis to slides, generates board-ready presentations from financial data. Advisory OS Sprint 8 board pack can output to PowerPoint format using this.

**Cowork (Launched January 12, 2026):** Desktop agent that reads local files, browses web, creates documents autonomously. Finance-specific use cases: journal entries, reconciliation, financial statements, variance analysis. Cowork is a potential competitor for individual use but validates the category. Advisory OS's advantage is governance, multi-party access, and persistent data — things a single-desktop tool cannot provide.

**Skills:** Reusable workflows. DataRails published Claude Code skills on GitHub for insights generation with specific design specs (Poppins font, variance colouring green #2ECC71 / red #E74C3C, Navy #0C142B backgrounds). Advisory OS should allow users to save favourite analysis prompts as reusable templates.

**Artifacts:** Persistent interactive outputs (HTML/CSS/JS/React), publishable via shareable links, support persistent storage and API calls. Board packs and scenario analyses could render as interactive artifacts with Advisory OS governance controlling access.

### Claude API Finance Capabilities (What Advisory OS Should Call, NOT Rebuild)

**Variance Analysis:** Pass current + comparison period → Claude identifies drivers, quantifies impact, generates narrative. Auto-determines favorable/unfavorable by metric type. Breaks down by any dimension in the data.

**Scenario Modelling:** Pass financial model + assumption change → Claude calculates three-statement impact. Handles UK tax implications (CT, VAT, Employer NI) when instructed. Generates multiple scenarios from single prompt.

**Narrative Generation:** Pass KPIs + targets + history → Claude writes executive summary. Contextualises for audience (board vs management vs investor). Identifies 3-5 most important things. Follows "So what?" principle.

**Anomaly Detection:** Pass time series → Claude identifies outliers, trend breaks, unusual patterns. Quantifies monetary impact. Suggests root causes and actions.

**Financial Education:** Pass term + user's data → Claude explains in context. "Your gross margin is 55.4%, meaning for every £1 revenue you keep 55p after direct costs." Adapts to user's financial literacy from onboarding.

**Goalseek:** Pass current financials + target → Claude calculates required input changes. Handles multi-variable goalseek. "To reach 20% net margin, increase revenue by £X or reduce costs by £Y."

### What Claude CANNOT Do (Advisory OS Must Build These)
- Persist data between API calls (no memory between completions — send full context every time)
- Enforce governance (doesn't know who should see what)
- Maintain audit trails (doesn't log its own outputs)
- Connect to Xero (cannot make outbound API calls)
- Real-time data sync (works only with data you send it)
- Multi-party workflows (single-user tool)

---

## SUPABASE MCP — DEVELOPMENT TOOLING REFERENCE

### What It Is
Supabase MCP (Model Context Protocol) connects Claude Code directly to the Supabase project. Claude Code manages the entire database layer through natural language — create tables, run migrations, set up RLS, configure auth, generate types — no manual SQL or dashboard switching.

### 40+ Tools Available

**Database Management:** Create/modify/drop tables, generate/run migrations, design schema from descriptions, auto-generate TypeScript types, run SQL queries, set up Row Level Security policies

**Auth Configuration:** Configure users/roles/policies, set up third-party auth providers, manage API keys and JWT templates

**Infrastructure:** Manage Edge Functions, configure Realtime subscriptions, custom domains, performance optimization, security auditing, backup management

### Claude Code Templates for Supabase

**Agents:**
- `database/supabase-schema-architect` — Designs database schema from natural language. Use for Sprint 2 data model creation.
- `database/supabase-realtime-optimizer` — Optimizes Realtime subscriptions for live dashboards.

**Commands:**
- `database/supabase-schema-sync` — Keeps TypeScript types in sync with DB. Run after every schema change.
- `database/supabase-migration-assistant` — Generates and manages migrations. Use for all schema changes after initial setup.
- `database/supabase-performance-optimizer` — Analyses queries, suggests index improvements. Run before launch.
- `database/supabase-security-audit` — Reviews RLS policies and access patterns. Run after setting up role-based access.
- `database/supabase-type-generator` — Auto-generates TypeScript types from schema.
- `database/supabase-data-explorer` — Query and inspect data from Claude Code terminal.
- `database/supabase-backup-manager` — Database backup management.
- `database/supabase-realtime-monitor` — Realtime subscription health monitoring.

### Installation
```bash
# Add MCP server scoped to Advisory OS project
claude mcp add supabase --transport http "https://mcp.supabase.com/mcp?project_ref=YOUR_PROJECT_REF"

# Install all templates
npx claude-code-templates@latest \
  --command "database/supabase-schema-sync, database/supabase-migration-assistant, database/supabase-performance-optimizer, database/supabase-security-audit, database/supabase-type-generator, database/supabase-data-explorer" \
  --agent "database/supabase-schema-architect" \
  --mcp database/supabase
```
Type `/mcp` in Claude Code to verify. Browser window opens for Supabase OAuth on first use.

### Security Rules
1. **NEVER connect to production** — Development project only
2. **Always project-scope** — Include `?project_ref=` in the URL
3. **Review before executing** — Always review schema changes and migrations before approving
4. **Read-only for data exploration** — Prefer read-only mode when querying
5. **No real customer data in dev** — Use mock/synthetic data
6. **Prompt injection risk** — Data containing malicious text could influence Claude Code. MCP wraps results with protective instructions but risk is non-zero.

### Sprint Acceleration

**Sprint 2**: Create Xero data tables, mapping tables, audit trail tables. Set up RLS (owner sees own data, advisor sees assigned clients, investor sees shared data). Generate TypeScript types.

**Sprint 3**: Create KPI definition tables, target tables, alert threshold tables. Set up Realtime subscriptions for live dashboard.

**Sprint 4**: Create business profile tables, onboarding response tables. Link to KPI config and dashboard preferences.

**Sprint 5**: Create scenario storage tables (immutable — insert only, no update/delete for governance). RLS: scenarios visible only to permitted roles.

**Sprint 8**: Create board pack version tables, export history. Store with full governance metadata.

### Tosin's Setup
Same MCP config needed. Share project ref only — MCP uses OAuth, no API keys shared. Each developer authenticates with own Supabase account.
