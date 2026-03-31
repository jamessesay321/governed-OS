# FP&A UX Review Skill

## Purpose
Before building or redesigning ANY financial page or component in Advisory OS, cross-reference against the 10 FP&A competitors documented in `docs/FPA_COMPETITIVE_AUDIT.md`. Never reinvent the wheel — adopt proven patterns.

## When to Use
- Building a new financial page (P&L, Balance Sheet, Cash Flow, Budget, KPIs, Variance, etc.)
- Redesigning an existing financial page
- Adding interactive features (drill-down, filtering, comparison, export)
- Designing empty states, error states, or onboarding flows for financial features

## Process

### Step 1: Read the Competitive Audit
Read `docs/FPA_COMPETITIVE_AUDIT.md` focusing on the specific feature area you're building.

### Step 2: Identify Best-in-Class Patterns
For the feature you're building, identify which competitors lead and what patterns they use:

| Area | Leaders | Key Patterns |
|------|---------|-------------|
| **Variance Analysis** | DataRails, Runway | Threshold suppression (<10% hidden), click-through drill-down, dimensional breakdown |
| **KPI Cards** | Kevin Steel, Fathom | Sparklines, trend arrows, period-over-period %, budget vs actual side-by-side |
| **Financial Tables** | Fathom, Kevin Steel | Sticky headers/columns, automatic actual/forecast shading, section totals |
| **Period Controls** | DataRails | Dashboard-level filter applies to all widgets, monthly/quarterly/annual toggle |
| **Comparison** | DataRails, Jirav | Multiple reference points (budget, prior year, prior month, custom) simultaneously |
| **Empty States** | Fathom | Smart prompts with CTA, suggest alternatives (use prior year, AI forecast) |
| **Status Badges** | DataRails | Tolerance-based: On Budget (±2%), Watch (5-10%), Material (10-25%), Critical (>25%) |
| **Charts** | DataRails, Fathom | Waterfall (revenue→EBITDA→PAT), variance bridges, gauge charts for KPI progress |
| **Export** | All competitors | CSV/Excel/PDF, with formatted headers and sections matching the on-screen view |
| **Narrative** | finstory.ai, Fathom | AI-generated commentary positioned next to relevant data points |

### Step 3: Design Checklist
Before writing code, verify your design includes:

- [ ] **Sticky first column** — category/account names never scroll off screen
- [ ] **Always-visible column structure** — don't hide columns conditionally, use dashes/grayed state instead
- [ ] **Variance progress bars** — visual gauge showing actual vs budget as a filled bar
- [ ] **Tolerance-based status** — not binary favourable/adverse; use On Budget / Watch / Adverse / Critical tiers
- [ ] **Human-readable variance text** — "5.2% over budget" not "+5.2%"
- [ ] **Colour legend** — explain what green/amber/red mean for this context (costs vs revenue have opposite semantics)
- [ ] **Summary cards ABOVE the table** — KPI cards with budget vs actual, trend indicators, not just raw numbers
- [ ] **Material variance counter** — header badge showing "3 material variances" to draw attention
- [ ] **Suppress minor option** — toggle to hide small variances and focus on what matters
- [ ] **Margin ratios** — always show computed ratios (Gross Margin %, Net Margin %, etc.) as footer or card
- [ ] **Smart empty state** — when data is missing, explain why and offer actionable alternatives
- [ ] **Period-responsive** — all data re-aggregates when user changes period selection

### Step 4: Cross-Check Functionality
Verify against competitor feature matrix:

- [ ] Period filtering works (monthly/quarterly/annual aggregation)
- [ ] Comparison mode works (prior period, prior year, budget)
- [ ] Search/filter works within the table
- [ ] CSV export includes all visible columns with proper formatting
- [ ] Drill-down is possible (click a line → see breakdown)
- [ ] Numbers are sense-checked (net profit ≤ revenue, assets = liabilities + equity, etc.)

## Anti-Patterns to Avoid
- Binary favourable/adverse (no tolerance bands)
- Hiding columns when data is missing (collapse confuses users)
- Raw signed percentages ("+12.3%" is ambiguous — over or under?)
- Summary cards showing only actuals (no budget context)
- Tables without sticky columns (scroll loses context)
- "Connect your accounting software" when software IS connected (wrong empty state)
- Period picker without Apply button (user doesn't know filter took effect)

## Reference Files
- `docs/FPA_COMPETITIVE_AUDIT.md` — full competitor analysis
- `docs/FPA_INTEGRATION_LANDSCAPE.md` — integration patterns
- `docs/BUILD_VS_BUY_ANALYSIS.md` — vendor decisions
