---

# Feature Benchmark Audit: Scenario Planning & What-If
## Advisory OS (Grove) — Section 05 of 15
**Date:** 2026-04-02 | **Status:** Complete | **Auditor:** Claude Code

---

## Feature Inventory

| # | Feature | Type | Location | Current State |
|---|---------|------|----------|---------------|
| 1 | Scenario CRUD (create, list, update) | Workflow | `src/app/api/scenarios/route.ts`, `[id]/route.ts` | Working |
| 2 | Assumption Sets (create, list, manage) | Data model | `src/app/api/scenarios/assumption-sets/` | Working |
| 3 | Assumption Values (time-series, per-period) | Data model | `src/app/api/scenarios/assumption-sets/[id]/values/route.ts` | Working |
| 4 | Assumption Segments (revenue segmentation) | Data model | `src/app/api/scenarios/assumption-sets/[id]/segments/route.ts` | Working |
| 5 | Natural Language Interpret (what-if mode) | AI | `src/lib/ai/interpret-scenario.ts`, `src/app/api/scenarios/[id]/interpret/route.ts` | Working |
| 6 | Natural Language Interpret (goalseek mode) | AI | `src/lib/ai/interpret-scenario.ts` | Working |
| 7 | Proposal Confirmation Token (anti-replay) | Governance | `src/lib/ai/confirmation-token.ts` (referenced) | Working |
| 8 | Confirm / Apply Proposed Changes | Workflow | `src/app/api/scenarios/[id]/confirm/route.ts` | Working |
| 9 | Reject Proposed Changes | Workflow | `src/app/api/scenarios/[id]/reject/route.ts` | Working |
| 10 | Immutable Change Log | Governance | `scenario_change_log` table (insert-only) | Working |
| 11 | Model Pipeline (run projections) | Calculation | `src/lib/scenarios/scenario-pipeline.ts`, `[id]/run/route.ts` | Working |
| 12 | Deterministic Projection Engine | Calculation | `src/lib/scenarios/calculations.ts` | Working |
| 13 | Period Timeline Generator | Calculation | `src/lib/scenarios/assumptions.ts` | Working |
| 14 | Assumption Resolution (per-period, time-series) | Calculation | `src/lib/scenarios/assumptions.ts` | Working |
| 15 | Assumption Hash (audit + reproducibility) | Governance | `src/lib/scenarios/assumptions.ts` | Working |
| 16 | Immutable Model Snapshots | Governance | `src/lib/scenarios/snapshots.ts`, `model_snapshots` table | Working |
| 17 | Forecast Snapshots (actuals vs forecast) | Analytics | `src/lib/scenarios/snapshots.ts`, `forecast_snapshots` table | Working |
| 18 | Unit Economics (CAC, LTV, contribution margin by segment) | Analytics | `src/lib/scenarios/unit-economics.ts`, `unit_economics_snapshots` | Working |
| 19 | Scenario Comparison (delta per period) | Analytics | `src/lib/scenarios/scenarios.ts`, `src/app/api/scenarios/compare/route.ts` | Working |
| 20 | Scenario Duplicate | Workflow | `src/app/api/scenarios/[id]/duplicate/route.ts` | Working |
| 21 | Scenario Lock (admin-only) | Governance | `src/app/api/scenarios/[id]/lock/route.ts` | Working |
| 22 | Scenario Versioning | Governance | `src/app/api/scenarios/[id]/versions/route.ts` | Working |
| 23 | AI Commentary on Model Run | AI | `src/app/api/scenarios/[id]/commentary/route.ts` | Working |
| 24 | ScenarioChatBuilder UI component | UI | `src/components/scenarios/scenario-chat-builder.tsx` | Working |
| 25 | ProposalCard UI component | UI | `src/components/scenarios/proposal-card.tsx` | Working |
| 26 | ChatScenarioLauncher | UI | `src/components/scenarios/chat-scenario-launcher.tsx` | Working |
| 27 | ForecastChart | UI | `src/components/scenarios/forecast-chart.tsx` | Working |
| 28 | CashFlowChart | UI | `src/components/scenarios/cash-flow-chart.tsx` | Working |
| 29 | MarginTrendChart | UI | `src/components/scenarios/margin-trend-chart.tsx` | Working |
| 30 | AssumptionEditor | UI | `src/components/scenarios/assumption-editor.tsx` | Working |
| 31 | AICommentaryPanel | UI | `src/components/scenarios/ai-commentary-panel.tsx` | Working |
| 32 | UnitEconomicsTable | UI | `src/components/scenarios/unit-economics-table.tsx` | Working |
| 33 | ScenarioComparisonTable | UI | `src/components/scenarios/scenario-comparison-table.tsx` | Working |
| 34 | Scenario Detail Page (6 tabs) | Page | `src/app/(dashboard)/scenarios/[id]/` | Working |
| 35 | Scenarios List Page | Page | `src/app/(dashboard)/scenarios/page.tsx` | Working |
| 36 | Compare Scenarios Page | Page | `src/app/(dashboard)/scenarios/compare/` | Working |
| 37 | Goalseek Page (template gallery) | Page | `src/app/(dashboard)/scenarios/goalseek/` | Partial |
| 38 | Validate Proposed Changes | Governance | `src/lib/ai/validate-proposal.ts` | Working |
| 39 | Conflict Detection | Governance | `src/lib/ai/validate-proposal.ts` | Working |
| 40 | Legacy Forecast Engine (NL parse path) | Calculation | `src/lib/forecast/engine.ts`, `scenarios.ts` | Working (legacy) |
| 41 | Rate Limiting on LLM Calls | Security | 10 LLM calls/min/org in interpret route | Working |
| 42 | Audit Logging on all mutations | Governance | `src/lib/audit/log.ts` throughout | Working |
| 43 | Auto-store to Knowledge Vault | Integration | `src/app/api/scenarios/[id]/run/route.ts` | Working |

---

## Benchmark Tables

### 1. Natural Language Scenario Engine (What-If Mode)

| Dimension | Assessment |
|-----------|------------|
| **What it does** | User types a plain-English scenario ("What if revenue grows 10% with a new hire at £8k/month?") → Claude interprets → structured assumption changes proposed → user confirms → model recalculates |
| **What it's trying to achieve** | Remove the finance expertise barrier from scenario creation |
| **Who needs it** | Business owner (primary), advisor |
| **Best in class** | **Runway** — "Ambient Intelligence" that auto-drafts a scenario for every assumption change. Every NL input immediately creates a named, versioned scenario in a sandbox. Side-by-side comparison without duplicating models. Draft model is protected from main scenario without admin merge. The mechanism is a dedicated "sandbox" model that reflects every change instantly with full three-statement impact. |
| **How they achieved it** | Unified data model ("One Data") where every change propagates through P&L, Balance Sheet, and Cash Flow simultaneously. NL formulas written in plain English trace values to source. Auto-draft triggers on any assumption change without explicit user action. |
| **Runner up** | **DataRails Planning Agent** — fast ad-hoc forecasting, scenario analysis, "what if" questions via their AI agent. Inputs are grounded in consolidated actual data. Returns three-statement impact. |
| **Current Advisory OS state** | **Working — competitive.** `interpret-scenario.ts` builds financial context from Xero actuals (avg monthly revenue, growth rate, margin, top accounts, monthly P&L summary), calls Claude (Sonnet for what-if, Opus for goalseek), parses structured JSON (assumption_changes with key/label/current_value/new_value/reasoning/effective_from), validates via `validate-proposal.ts`, stores to `scenario_change_log` (immutable). Confirmation token prevents replay attacks. Rate limited at 10 LLM calls/min/org. Confidence threshold at 0.7 triggers clarification mode. |
| **Gaps vs competitors** | (1) Only 7 assumption keys supported (`revenue_growth_rate`, `seasonality_factor`, `variable_cost_rate`, `fixed_costs`, `receivables_days`, `payables_days`, `capital_expenditure`) — Runway supports unlimited named drivers. (2) No Runway-style "ambient auto-draft" — user must manually trigger interpret then confirm. (3) No immediate visual preview of P&L impact before confirmation. (4) No Business Context Profile injected into interpret prompt — treats all businesses the same, ignoring onboarding data. (5) Confidence threshold drops requests below 0.7 — good governance, but no "I'll try anyway" fallback for confident users. |
| **AI opportunity** | Very high — the current engine is structurally correct but the assumption key vocabulary is narrow. Expanding to 20+ keys (including headcount, specific cost line overrides, price changes by segment) dramatically increases the range of natural language inputs that resolve successfully. |
| **Non-finance user test** | **4/5** — The chat UX is excellent. Confidence badge and "Proposed Changes" breakdown are well-designed. Missing: instant visual preview of what the P&L looks like if you click Confirm (Runway shows this before you commit). |
| **Token efficiency** | Sonnet: ~2,000–3,000 tokens per interpret call. Opus for goalseek: ~4,000–6,000 tokens. Rate limited to 10/min/org. Estimated cost per scenario session: ~£0.02–£0.05. Acceptable. |
| **Build recommendation** | **ENHANCE** — Expand assumption key vocabulary; inject Business Context Profile into system prompt; add visual P&L preview in the ProposalCard before confirmation |
| **Priority** | **P0** — This is the hero feature of the entire platform |
| **Defensibility** | **Very High** — The governance layer (confirmation token, immutable change log, audit trail, version snapshot on lock) is not found in any competitor. Runway auto-drafts but has no governed confirmation gate. |

---

### 2. Goalseek / Reverse Scenario

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Two modes: (A) AI-powered goalseek via the interpret engine with `mode: 'goalseek'` — reverse-engineers assumption changes to hit a target metric. (B) Template gallery at `/scenarios/goalseek` — 15 pre-built templates across 6 categories with slider-based interaction |
| **What it's trying to achieve** | Answer "What do I need to change to achieve X?" — the inverse of what-if |
| **Who needs it** | Business owner primarily ("what revenue do I need to break even?"), advisor for client conversations |
| **Best in class** | **Fathom HQ** — Goalseek is a first-class feature. Users set a target KPI value (e.g., 20% net margin) and adjust multiple variables with sliders to see impact. Interactive, visual, real-time. Sliders update the output chart instantly. The mechanism: formula evaluation runs client-side on assumption changes so there's zero latency. The goalseek mode is integrated into the full three-statement model so you see P&L + Cash Flow impact of your target simultaneously. |
| **How they achieved it** | Client-side formula evaluation (no server round-trip) with direct tie into the forecast model. Target KPI defined → model iterates variable → shows required value. |
| **Runner up** | **Kevin Steel (Inflectiv)** — Goalseek and Sensitivity Analysis listed as Week 2 features. Navigation shows "Analysis > Goalseek" as a dedicated section. |
| **Current Advisory OS state** | **Partial — two disconnected implementations.** Mode A (AI goalseek via interpret engine) is solid — Opus model, reverse-engineering instructions in system prompt, grounded in Xero actuals. Mode B (template gallery) is a static frontend with 15 templates (3 per category: profitability, cash-flow, growth, people, marketing, debt). The slider updates a `resultFn` string — but the `resultFn` is a hardcoded formula string, NOT connected to the actual scenario model or Xero data. The "current values" in each template are also hardcoded placeholder numbers, not live Xero data. The "Save to Playbook" button sets a boolean flag but does not actually POST to any API. |
| **Gaps vs competitors** | (1) Template gallery uses hardcoded mock data — not connected to Xero actuals. (2) resultFn produces a text string, not a model projection. (3) "Save to Playbook" is a stub. (4) No integration between Mode A (AI goalseek) and Mode B (template gallery). (5) No slider-driven real-time preview that feeds into the actual scenario model. (6) No visual chart output showing P&L impact of the goal being achieved. |
| **AI opportunity** | High for Mode A (already using Opus correctly). Medium for Mode B — templates could be pre-populated with live Xero data and the resultFn could call the actual forecast engine. |
| **Non-finance user test** | Mode A: **3/5** — requires formulating a goalseek question correctly (e.g., "what revenue do I need for 20% margin?"). Mode B: **2/5** — beautiful UI but fictional numbers destroy credibility with an advisor. |
| **Build recommendation** | **BUILD** — Wire template gallery to live Xero data. Replace resultFn strings with actual scenario model calls. Connect "Save to Playbook" to the playbook API. Unify Mode A and Mode B under a single Goalseek flow. |
| **Priority** | **P1** — Strong structural foundation, but the disconnection from live data is a credibility problem |
| **Defensibility** | Medium — Fathom's goalseek is more polished. Advisory OS differentiates via governance (immutable audit trail of goalseek sessions) and business context (Fathom doesn't know it's a bridal business). |

---

### 3. Three-Statement Forecast (P&L + Balance Sheet + Cash Flow)

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Generates linked P&L, Balance Sheet, and Cash Flow projections from assumption inputs |
| **What it's trying to achieve** | Institutional-grade financial modelling for SMEs who can't build their own models |
| **Who needs it** | Advisor (primary), investor, business owner |
| **Best in class** | **Fathom HQ** — Fully integrated three-statement forecast up to 36 months. Driver-based (build from operational drivers). Auto-updates when financials refresh. Forecast snapshots to compare actuals vs budget vs forecast over time. Forecast events (model specific events like hiring, asset purchases). Forecast notes (explain assumptions). Audit trail on forecast changes. |
| **How they achieved it** | Driver-based model where each forecast item is a formula linked to named drivers. Three statements auto-reconcile (cash flow derived from P&L + BS changes). |
| **Runner up** | **Jirav** — Three-statement pro forma with interconnected P&L, BS, and CF. Auto-forecast using historical data + seasonality. Rolling forecasts and long-range projections to 5 years. |
| **Current Advisory OS state** | **Working — two overlapping implementations.** The legacy `src/lib/forecast/engine.ts` generates a full three-statement forecast (P&L + BS + CF) using linear regression on historical data, supports 12 assumption categories, and persists to `forecasts` table. The newer `src/lib/scenarios/calculations.ts` / `scenario-pipeline.ts` generates period projections but only tracks a simplified P&L and cash position (no full Balance Sheet reconciliation — BS is estimated, not derived from P&L). The `generateFullProjection` function in `calculations.ts` produces: revenue, cost_of_sales, gross_profit, gross_margin_pct, operating_expenses, net_profit, net_margin_pct, cash_in, cash_out, net_cash_flow, closing_cash, burn_rate, runway_months, is_break_even. No standalone Balance Sheet columns in the scenario pipeline snapshots. |
| **Gaps vs competitors** | (1) Scenario pipeline snapshots (`model_snapshots` table) do not persist Balance Sheet line items. (2) No 36-month horizon limit enforcement (UI allows up to 60 months but engine confidence degrades). (3) No driver-based modelling — assumptions are global rates, not account-specific formulas. (4) No seasonality modelling beyond a single `seasonality_factor` multiplier. (5) No forecast events (hiring schedule, specific one-off costs). (6) Balance Sheet in legacy engine is estimated (cash = BS plug), not properly reconciled. |
| **AI opportunity** | Medium — AI could generate "forecast narrative" explaining why certain months are projected higher/lower (seasonality, assumption changes). This is distinct from the commentary that already runs. |
| **Non-finance user test** | **3/5** — Forecast tab with ForecastChart shows revenue/gross profit/net profit lines, which is intelligible. Cash Flow tab exists. No Balance Sheet tab in the detail view. |
| **Build recommendation** | **ENHANCE** — Add Balance Sheet tab to scenario detail, wire it to a proper BS reconciliation in the pipeline. Extend assumption keys to include seasonality by month (12 multipliers, not one). |
| **Priority** | **P1** — The P&L and Cash Flow coverage is credible. Balance Sheet is the missing piece for advisor credibility. |
| **Defensibility** | Medium — the three-statement model is table stakes. Advisory OS differentiates through governance (immutable snapshots, assumption hash, version history) and the governed confirmation workflow. |

---

### 4. Scenario Comparison

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Side-by-side comparison of two scenarios showing period-by-period deltas for Revenue, Gross Profit, Net Profit, Closing Cash, and Runway |
| **What it's trying to achieve** | "Show me best case vs base case vs worst case simultaneously" |
| **Who needs it** | Advisor (presenting to client/board), investor |
| **Best in class** | **Runway** — Side-by-side comparison without duplicating models. Can overlay multiple scenarios on one chart. Macro scenarios (economy-level) and micro scenarios (operational levers) in one view. Best-case / base-case / worst-case toggle. The mechanism: Runway's unified data model means scenarios share the same underlying structure — comparison is just a view over the same data, not a separate model. |
| **How they achieved it** | Dimension-based architecture — scenarios are parameter sets over one model, not separate models. Comparison is rendered as a report over the dimension. |
| **Runner up** | **DataRails** — Compare scenarios across all three statements. Variance threshold suppression (<10% not shown). Breakdown by entity, department, account. |
| **Current Advisory OS state** | **Working — functional but limited.** `src/app/(dashboard)/scenarios/compare/` allows selecting two scenarios from dropdowns. Calls `POST /api/scenarios/compare`. `compareScenarios()` in `src/lib/scenarios/scenarios.ts` produces `ScenarioComparisonResult` with period deltas for Revenue, Gross Profit, OpEx, Net Profit, Cash, Operating Cash Flow. `ScenarioComparisonTable` renders the delta grid. |
| **Gaps vs competitors** | (1) Maximum two scenarios at once — no three-way or N-way comparison. (2) No chart view of comparison — table only, no overlapping line charts. (3) No variance threshold suppression (small deltas shown with same emphasis as large ones). (4) No breakdown dimension (can't see delta by cost category, only totals). (5) Comparison page is separate from scenario detail — no in-context comparison. (6) No "best / base / worst" quick-set pattern. |
| **Non-finance user test** | **3/5** — Table comparison is readable but dense. An advisor would want this as a chart for board presentations. |
| **Build recommendation** | **ENHANCE** — Add multi-scenario overlay chart (3 lines on one chart). Add variance threshold suppression. Embed comparison toggle directly on scenario detail page. |
| **Priority** | **P1** |
| **Defensibility** | Low — comparison is commodity. Advisory OS advantage is that each compared scenario has a full immutable audit trail, which no competitor provides. |

---

### 5. Assumption Management

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Time-series assumption values (per period, with effective_from / effective_to dates). Categorised (revenue_drivers, pricing, costs, growth_rates, headcount, marketing, capital, custom). Versioned. Assumption hash for audit reproducibility. |
| **What it's trying to achieve** | "Which assumptions produced this forecast, and can I prove it?" |
| **Who needs it** | Advisor and investor for governance |
| **Best in class** | **Vena** — Cell-level audit trail shows history of every number change with timestamp + source. One-click version comparison. Template version control. Workflow builder for assumption approval. |
| **How they achieved it** | Cell-level metadata stored alongside values. Versioned templates. Workflow routing for approval. |
| **Runner up** | **Kevin Steel (Inflectiv)** — Miniforecasts with formula logic (`[[AVERAGE6]]`, `[[PREVMONTH]+1]`, `[[SMLASTYEAR]]`). Per-nominal-code forecast formulas. Payroll groups with per-group employer rates. |
| **Current Advisory OS state** | **Working — architecturally strong.** `assumption_values` table with `(key, category, type, value, effective_from, effective_to, version, created_by)`. `resolveAssumptionsForPeriod()` picks the correct assumption for each period. `hashAssumptions()` produces a SHA-256 hash of the sorted assumption set for reproducibility verification. `AssumptionEditor` component exists for manual editing. The `scenario_change_log` table records every proposed/confirmed/rejected change immutably. |
| **Gaps vs competitors** | (1) Only 7 valid assumption keys (`revenue_growth_rate`, `seasonality_factor`, `variable_cost_rate`, `fixed_costs`, `receivables_days`, `payables_days`, `capital_expenditure`) — extremely narrow. Cannot model: specific cost line items, headcount changes, price changes by segment, VAT/tax changes, marketing spend, depreciation schedule. (2) No formula-based assumptions (Kevin Steel's `[[AVERAGE6]]` etc.) — all assumptions are scalar values. (3) No approval workflow for assumption changes before they enter a live scenario (Vena/Planful pattern). (4) AssumptionEditor UI needs review — may be functional but basic. (5) No assumption library ("start from our standard retail model"). |
| **Build recommendation** | **ENHANCE** — Expand the valid assumption key set to 25+. Add formula types ("last 6 month average", "same month last year"). |
| **Priority** | **P1** |
| **Defensibility** | **High** — The combination of time-series assumptions + hash verification + immutable change log is not found in any competitor at this depth. |

---

### 6. Unit Economics (CAC, LTV, Contribution Margin by Segment)

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Per-segment economics: units sold, revenue/unit, variable cost/unit, contribution margin, CAC, LTV, LTV:CAC ratio. Compared across model versions (baseline vs comparison). Persisted to `unit_economics_snapshots`. |
| **What it's trying to achieve** | "Is each product/segment profitable?" — the Mosaic/Cube question for SaaS and product businesses |
| **Who needs it** | Business owner and advisor for pricing decisions |
| **Best in class** | **Mosaic (Bob Finance)** — Metric Builder creates custom unit economics. Pre-built SaaS templates: ARR reporting, headcount planning, SaaS metric benchmarking. CAC and LTV tracked with trend. |
| **Current Advisory OS state** | **Working — strong foundation, underexposed.** `src/lib/scenarios/unit-economics.ts` calculates `calcCAC()`, `calcLTV()`, `calcLTVCACRatio()`, `calcSegmentEconomics()` for multiple segments simultaneously. `compareSegmentEconomics()` computes deltas. `UnitEconomicsTable` component renders it. The data is only populated if `assumption_values` has `segment_*` keys — format: `segment_<name>_units`, `segment_<name>_price`, `segment_<name>_varcost`, etc. This is entirely undocumented in the UI. |
| **Gaps vs competitors** | (1) No UI for entering segment data — user must know to use `segment_*` key convention in AssumptionEditor. (2) LTV:CAC ratio stored but not explained in plain English (a SME owner doesn't know what "3.2x LTV:CAC" means). (3) No segment comparison chart — only a table. (4) No CAC trend over time. |
| **Build recommendation** | **BUILD** — Add dedicated Segment Setup UI. Add plain-English interpretation of LTV:CAC ("your acquisition cost is healthy — for every £1 you spend acquiring a customer, you earn £3.20"). |
| **Priority** | **P2** — Functionally complete but inaccessible without UI improvements |
| **Defensibility** | Medium — CAC/LTV tracking is common in SaaS platforms but rare for UK SME advisory tools |

---

### 7. Scenario Governance (Lock, Versions, Audit Trail)

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Scenario status lifecycle (draft → active → locked → archived). Lock is admin-only, creates a final version snapshot. `scenario_versions` table stores change history. Audit log on every mutation. Assumption hash on model runs for reproducibility. |
| **What it's trying to achieve** | "This is the scenario we presented to the board on 15 March. It cannot be changed retroactively." |
| **Who needs it** | Advisor (governance), investor (trust) |
| **Best in class** | **Vena** — Cell-level audit trail, one-click version comparison, workflow builder for approval before publishing. Drill-save showing value changes over time. |
| **Runner up** | **DataRails** — Audit trails on all mutations. SOC 2 certified. Role-based access controls. |
| **Current Advisory OS state** | **Working — strongest area vs competitors.** Lock endpoint requires admin role. Creates `scenario_versions` row with `assumption_set_snapshot`. `scenario_change_log` is insert-only (no UPDATE/DELETE policies per non-negotiable rule #5). `hashAssumptions()` enables reproducibility verification. `model_versions` table records engine version + assumption hash per run. Full `audit_logs` on all mutations. |
| **Gaps vs competitors** | (1) No multi-step approval workflow before a scenario goes to "active" — one advisor can create and run without second-approval. (2) No version diff UI — the `scenario_versions` table exists but there's no front-end that shows "what changed between version 2 and version 3". (3) `scenario_versions` table created on lock only — intermediate versions not automatically snapshotted between runs. |
| **Build recommendation** | **BUILD** — Add version diff viewer. Consider adding auto-snapshot after every `runModelPipeline` call (currently only on lock). |
| **Priority** | **P2** — Governance infrastructure is excellent but UI surface is thin |
| **Defensibility** | **Very High** — This is the clearest competitive moat. No competitor tracks assumptions + model runs + change log + audit trail at this depth. |

---

### 8. AI Commentary on Scenarios

| Dimension | Assessment |
|-----------|------------|
| **What it does** | After model pipeline runs, `generateAndPersistCommentary()` is called and results stored in `ai_commentary` table. AICommentaryPanel renders on "AI Insights" tab. |
| **What it's trying to achieve** | "Explain what this scenario means in plain English" |
| **Best in class** | **Fathom** — AI Commentary shaped by "goals, strategy, market conditions." Every insight is traceable to a number. Role-appropriate (advisor vs owner). PhD ML team red-teams for hallucinations. DataRails Storyboards turns scenario data into full narrative presentations. |
| **Current Advisory OS state** | **Working — but not deeply examined.** Commentary is generated after pipeline run (`generateAndPersistCommentary` in `src/lib/ai/commentary.ts`). Stored in `ai_commentary` with `confidence_score`. Rendered in AICommentaryPanel. The quality depends entirely on how much business context is passed to the Claude API call — this is where the Semantic Intelligence Layer matters enormously. |
| **Gaps vs competitors** | (1) Commentary generated without Business Context Profile (onboarding data not yet injected into scenario commentary calls). (2) Commentary is post-hoc (after run) — Fathom shows AI insights inline with the chart at the point of interest. (3) No scenario-to-narrative export for board packs (Sprint 8 handles this, but the scenario module doesn't push to board pack directly). (4) ProposalCard shows `interpretation_summary` from Claude, but this is interpretation of the user's request, not insight about the impact. These are different things — both valuable but currently conflated in the UI. |
| **Build recommendation** | **ENHANCE** — Wire Business Context Profile into commentary generation. Add inline chart annotations (finstory.ai pattern). |
| **Priority** | **P1** |
| **Defensibility** | High — when Business Context Profile is fully wired, Grove commentary will be materially better than competitors because it knows the business type, seasonality, and goals. |

---

### 9. Legacy Forecast Engine (src/lib/forecast/)

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Original Sprint 5 implementation — `engine.ts` generates full three-statement forecast, `scenarios.ts` parses NL via Claude, runs scenario, compares scenarios. Stores to `forecasts` and `forecast_scenarios` tables. |
| **Current state** | **Working but diverging.** `src/lib/forecast/engine.ts` is a more complete three-statement model than `src/lib/scenarios/calculations.ts` (has proper Balance Sheet with receivables, payables, fixed assets, long-term debt, retained earnings). `src/lib/forecast/scenarios.ts` has a simpler NL parse prompt (broader category vocabulary: 12 categories vs 7 keys). However the newer `scenario-pipeline.ts` system has better governance (assumption hash, model versions, immutable snapshots) that the legacy engine lacks. |
| **Architectural concern** | **Two parallel engines exist.** `src/lib/forecast/engine.ts` + `src/lib/forecast/scenarios.ts` vs `src/lib/scenarios/` (`calculations.ts`, `scenario-pipeline.ts`, `assumptions.ts`). The `src/app/api/forecast/scenario/route.ts` still exists pointing to the legacy system. This creates confusion about which engine is canonical and could lead to inconsistent model outputs if both remain in production. |
| **Build recommendation** | **CONSOLIDATE** — Merge the Balance Sheet capability of `engine.ts` into `calculations.ts`. Deprecate `src/lib/forecast/engine.ts` and `src/lib/forecast/scenarios.ts` once the new pipeline is feature-complete. Keep the `src/lib/forecast/` namespace for the forecast engine only (no scenarios). |
| **Priority** | **P1 architectural** — technical debt that will compound |

---

## Competitive Feature Matrix — Scenario Planning

| Feature | DataRails | Fathom | Syft | Jirav | Runway | Mosaic | Puzzle | Planful | Vena | Cube | Kevin Steel | Grove (current) |
|---------|-----------|--------|------|-------|--------|--------|--------|---------|------|------|-------------|-----------------|
| NL What-If Engine | ● | ○ | ○ | ○ | ● | ○ | ○ | ○ | ● | ● | ○ | ● |
| Goalseek / Reverse | ○ | ● | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ● | ◐ |
| Three-Statement Forecast | ● | ● | ◐ | ● | ● | ◐ | ○ | ● | ● | ◐ | ● | ◐ |
| Scenario Comparison | ● | ◐ | ○ | ◐ | ● | ◐ | ○ | ● | ● | ◐ | ● | ◐ |
| Driver-Based / Formula Assumptions | ● | ● | ○ | ● | ● | ○ | ○ | ● | ● | ◐ | ● | ○ |
| Seasonality Modelling | ◐ | ● | ○ | ● | ● | ○ | ○ | ◐ | ◐ | ○ | ◐ | ○ |
| Immutable Audit Trail | ◐ | ○ | ○ | ○ | ◐ | ○ | ○ | ● | ● | ● | ○ | ● |
| Confirmation Gate (AI proposal) | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ● |
| Assumption Hash / Reproducibility | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ● |
| Scenario Lock | ○ | ○ | ○ | ○ | ◐ | ○ | ○ | ● | ● | ○ | ○ | ● |
| Unit Economics (CAC/LTV) | ○ | ○ | ○ | ○ | ◐ | ◐ | ● | ○ | ○ | ○ | ○ | ● |
| Scenario-to-Board-Pack | ● | ● | ○ | ● | ● | ● | ○ | ● | ● | ◐ | ● | ◐ |
| Live Xero-Grounded Assumptions | ◐ | ● | ● | ○ | ◐ | ○ | ○ | ○ | ○ | ◐ | ● | ● |
| Business Context in AI Calls | ○ | ◐ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| Multi-Scenario Overlay Chart | ● | ● | ○ | ○ | ● | ○ | ○ | ● | ○ | ○ | ● | ○ |
| UK Tax / VAT Modelling | ○ | ◐ | ◐ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ● | ○ |

● = Full | ◐ = Partial | ○ = Not present

---

## Gap Analysis: What's Missing vs Competitors

### Critical Gaps (block the core value proposition)

**G1. Business Context Profile not injected into scenario AI calls**
The semantic intelligence sprint document explicitly states: "Scenarios: Natural language input gets interpreted with full context. 'What if I hire another fitter?' → Claude knows fitters cost approximately £X based on the staff cost breakdown, and can model the P&L impact accurately." Currently, `buildFinancialContext()` in `interpret-scenario.ts` pulls raw Xero P&L data but does NOT include the business context profile (business type, seasonality pattern, staff structure, key concerns). The system prompt in `buildSystemPrompt()` has no reference to any onboarding data. This is the single biggest quality gap vs Fathom's AI Commentary and DataRails' "knows your business" positioning.

**G2. Only 7 assumption keys in the NL engine**
`VALID_ASSUMPTION_KEYS` in `interpret-scenario.ts` contains only: `revenue_growth_rate`, `seasonality_factor`, `variable_cost_rate`, `fixed_costs`, `receivables_days`, `payables_days`, `capital_expenditure`. A user saying "hire a designer at £45,000" or "increase marketing spend by £5,000/month" or "raise prices 8%" will hit the ceiling of what can be modelled. Jirav's assumption vocabulary covers headcount, salaries, department-level costs, pricing, volume — all separately. Kevin Steel models payroll by group with employer NI and pension.

**G3. Goalseek template gallery uses hardcoded mock data**
The 15 goalseek templates in `goalseek-client.tsx` have hardcoded `currentValues` arrays (e.g., "Current Revenue: £150,000") that are completely fictional. An advisor showing this to a client would immediately lose credibility when the numbers don't match the client's Xero data. This is a demo-blocker.

**G4. No visual P&L preview before confirming AI proposals**
The `ProposalCard` shows the proposed assumption changes as a list with current → new values and reasoning. But the user has no way to see "if I confirm this, here is what the P&L looks like for the next 12 months" before clicking Confirm. Runway shows this preview instantly. DataRails Planning Agent shows a before/after table. This friction reduces trust in the AI and makes confirmation feel like a blind leap.

**G5. No formula-based assumptions (seasonality by month, historical average)**
Kevin Steel's `[[AVERAGE6]]`, `[[PREVMONTH]+1]`, `[[SMLASTYEAR]]` formulas express common forecasting patterns that cannot be expressed with Grove's current scalar assumption values. A business with strong seasonal peaks (e.g., a bridal business) cannot model "January is always 40% of the average monthly revenue" with a single `seasonality_factor` multiplier.

**G6. Balance Sheet not persisted in scenario model snapshots**
`model_snapshots` table columns do not include Balance Sheet line items (receivables, payables, fixed assets, debt, equity). The legacy `engine.ts` computes a proper Balance Sheet but this data is lost in the new pipeline. Advisors and investors cannot see balance sheet position within a scenario without switching to the legacy forecast route.

---

### Significant Gaps (reduce competitiveness vs key rivals)

**G7. No multi-scenario overlay chart**
Compare page is table-only. Runway, DataRails, Fathom, Kevin Steel all show multiple scenario lines on a single chart (typically revenue or net profit). This is the single most compelling visual for an advisor presentation ("here is best case / base case / worst case on one chart").

**G8. No approval workflow for assumption changes**
One advisor can create, modify assumptions, run the model, and lock without a second approver. Vena, Planful, and Jirav have workflow routing (advisor proposes → admin approves → model runs). For institutional use cases (investor reporting), this is a governance gap.

**G9. No UK tax/VAT modelling**
Kevin Steel's platform has a full UK tax engine: Corporation Tax at 25%, VAT quarterly settlement, PAYE/NI/Pension auto-calculation from payroll categories, HMRC payment plan modelling. None of this exists in Grove's scenario engine. For UK SME advisory, this is the difference between a credible forecast and an approximate one. A scenario showing "what if I hire 3 people" should automatically model employer NI (15%) and employer pension (3%) on top of the salary cost.

**G10. No scenario event scheduling**
Fathom has "Forecast Events" — model specific events: "hire 3 people in July", "buy equipment for £50k in September", "sign a lease from October at £8k/month". Grove's time-series assumptions (effective_from / effective_to) provide the data structure for this, but there is no UI for entering a scheduled event with a human-friendly description.

**G11. Scenario-to-Board-Pack link is manual**
The `autoStoreToVault` call in the run route stores scenario output to the Knowledge Vault, but there is no direct "push this scenario to my board pack" action from within the scenario module. Kevin Steel, Fathom, DataRails, and Mosaic all have one-click board pack generation from scenario outputs.

**G12. No inline chart annotations from AI commentary**
finstory.ai and Fathom both annotate charts directly with AI-generated insight callouts positioned at the relevant data point. Grove's AI commentary lives in a separate "AI Insights" tab. A user looking at the ForecastChart has no AI context without switching tabs.

---

### Minor Gaps (quality of life)

**G13. Currency hardcoded as dollar sign in scenario KPI cards**
`scenario-detail-client.tsx` line 173 renders `$` prefix for Revenue, Net Profit, and Closing Cash — this should be `£` for UK businesses (or dynamically driven from `OrgAccountingConfig.base_currency`).

**G14. Duplicate scenario uses `prompt()` (native browser dialog)**
`handleDuplicate()` in `scenario-detail-client.tsx` uses `window.prompt()` for the new scenario name. This is inconsistent with the shadcn/ui component system and breaks on mobile.

**G15. ChatScenarioLauncher has no mode toggle (what-if vs goalseek)**
`scenario-chat-builder.tsx` only sends what-if mode requests (no `mode` field in the fetch body, which defaults to what-if in the `interpretRequestSchema`). Users cannot select goalseek mode from the chat UI even though the AI engine fully supports it.

**G16. Rate limit error not surfaced to user**
The interpret route returns a 429 from `llmLimiter.check()` but the `ScenarioChatBuilder` just shows "Something went wrong." — the rate limit reason is not communicated.

**G17. No maximum forecast horizon warning**
The assumptions engine allows up to 60 months (input `max={60}`) but the confidence score degrades after 12 months with no visual indicator to the user.

---

## Prioritised Recommendations

### P0 — Must Ship (blocks the scenario module's core value)

**P0-1: Inject Business Context Profile into NL interpret calls**
- File: `src/lib/ai/interpret-scenario.ts` → `buildSystemPrompt()`
- Add `businessContext: BusinessContextProfile` to `FinancialContext` type
- Pass from `buildFinancialContext()` which should pull from `business_context_profiles` table
- Enrich the system prompt: "This is a [business_type] business. Key costs include [top expense categories]. [Seasonality pattern]. The owner's primary concern is [primary_goal]."
- Also affects: `src/lib/ai/financial-context.ts` (needs to fetch and include context)
- Without this, the NL engine gives generic advice that ignores what the platform knows about the business

**P0-2: Expand assumption key vocabulary to 25+ keys**
- File: `src/lib/ai/interpret-scenario.ts` → `VALID_ASSUMPTION_KEYS`
- Add: `headcount_change`, `salary_per_head`, `employer_ni_rate`, `employer_pension_rate`, `marketing_spend`, `price_increase_pct`, `new_product_revenue`, `one_off_cost`, `debt_repayment`, `depreciation_monthly`, `capex_schedule`
- File: `src/lib/scenarios/calculations.ts` → `generateFullProjection()` — add handlers for new keys
- File: `src/lib/ai/validate-proposal.ts` — add boundary rules for new keys
- This is the single biggest expansion of what a user can model in plain English

**P0-3: Wire goalseek template gallery to live Xero data**
- File: `src/app/(dashboard)/scenarios/goalseek/goalseek-client.tsx`
- Fetch org's actual KPI values via the KPI API on page load (revenue, margins, headcount, AR days, cash balance)
- Replace hardcoded `currentValues` arrays with live data
- Map template variables to actual metrics (e.g., "Current Revenue" → revenue from last closed month)
- This is a demo-blocker — fictional numbers destroy advisor credibility instantly

**P0-4: Add P&L preview to ProposalCard before confirmation**
- File: `src/components/scenarios/proposal-card.tsx`
- After interpretation succeeds, call a lightweight `/api/scenarios/[id]/preview` endpoint
- Endpoint: run `generateFullProjection()` with proposed changes applied (without persisting)
- Display 3-period summary table (next 3 months: Revenue / Gross Profit / Net Profit / Cash) in the ProposalCard before Confirm/Reject buttons
- This converts the confirmation gate from a blind leap to an informed decision

---

### P1 — Should Ship (competitive parity with Fathom/Runway)

**P1-1: Add mode toggle to ScenarioChatBuilder (what-if vs goalseek)**
- File: `src/components/scenarios/scenario-chat-builder.tsx`
- Add a toggle/tab between "What-if" (forward projection) and "Goalseek" (reverse-engineer target)
- Pass `mode` in the fetch body to `POST /api/scenarios/[id]/interpret`
- Add goalseek-specific placeholder text: "e.g. What revenue do I need to hit 20% net margin?"
- Low effort, high impact — doubles the use cases accessible from the chat UI

**P1-2: Persist Balance Sheet in model_snapshots**
- File: `src/lib/scenarios/snapshots.ts` → `persistModelSnapshots()`
- Add Balance Sheet columns to `model_snapshots` table: `receivables`, `payables`, `net_working_capital`, `closing_debt`, `equity_position`
- File: `src/lib/scenarios/calculations.ts` → `PeriodProjection` type — add BS fields
- File: `src/lib/scenarios/scenario-pipeline.ts` — wire BS calculation into pipeline using logic from `engine.ts`
- File: `src/app/(dashboard)/scenarios/[id]/scenario-detail-client.tsx` — add Balance Sheet tab
- Enables advisors to show three-statement model — currently impossible from the scenario module

**P1-3: Multi-scenario overlay chart on Compare page**
- File: `src/app/(dashboard)/scenarios/compare/compare-client.tsx`
- Replace `ScenarioComparisonTable` (or add alongside) a multi-line Recharts chart
- X-axis: periods. Y-axis: revenue or net profit. Multiple lines (one per scenario, colour-coded)
- Allow up to 5 scenarios on one chart (extend `compareScenarioSchema` to accept `scenarioIds[]`)
- File: `src/app/api/scenarios/compare/route.ts` — extend to handle N scenarios
- This is the board-ready visual every advisor needs

**P1-4: Inline AI annotations on ForecastChart**
- File: `src/components/scenarios/forecast-chart.tsx`
- After model run + commentary generated, fetch AI commentary for the scenario
- Identify the period with largest revenue delta and net profit delta
- Render as a callout annotation at that data point (finstory.ai pattern)
- ~200 tokens per annotation, generated from existing commentary data, no new API call needed

**P1-5: UK Employer NI and Pension auto-calculation**
- File: `src/lib/scenarios/calculations.ts` → `generateFullProjection()`
- When `headcount_change` and `salary_per_head` assumptions are present, auto-calculate:
  - `employer_ni = salary_total * 0.15` (standard UK rate, overridable via `employer_ni_rate` assumption)
  - `employer_pension = salary_total * 0.03` (minimum auto-enrolment, overridable)
  - Add both to `operatingExpenses` projection
- This removes the credibility gap vs Kevin Steel's UK-specific modelling

**P1-6: Version diff viewer UI**
- File: create `src/components/scenarios/scenario-version-diff.tsx`
- Fetch from `GET /api/scenarios/[id]/versions`
- Show side-by-side diff of `assumption_set_snapshot` between selected versions
- Highlight changed assumptions in amber
- Surface on the Assumptions tab within scenario detail

**P1-7: Fix currency symbol ($ → £)**
- File: `src/app/(dashboard)/scenarios/[id]/scenario-detail-client.tsx` lines 173–190
- Replace all hardcoded `$` prefixes with `£` or derive from `OrgAccountingConfig.base_currency`
- This is a minor but trust-destroying error for UK clients

---

### P2 — Nice to Have (differentiators and polish)

**P2-1: Monthly seasonality pattern (12 multipliers)**
- Extend assumption schema: `seasonality_jan` through `seasonality_dec` (values: 0.5 to 2.0 representing multipliers vs average)
- File: `src/lib/scenarios/calculations.ts` → `projectRevenue()` — apply month-specific multiplier
- File: `src/lib/ai/interpret-scenario.ts` — add 12 seasonality keys to valid keys
- Critical for bridal, retail, hospitality, and any seasonal business in the UK SME target market

**P2-2: Scenario event scheduling UI**
- Extend `assumption_values` with an optional `event_label` and `event_type` field ('hire', 'purchase', 'contract', 'lease')
- File: create `src/components/scenarios/scenario-event-timeline.tsx` — visual timeline of events
- Render in the scenario detail header above the tabs
- Users enter human descriptions ("Sign Manchester office lease Oct 2026 at £6,500/month") and AI maps to assumptions

**P2-3: Segment setup UI for unit economics**
- File: create `src/components/scenarios/segment-setup.tsx`
- Guided form for entering segment data: segment name, price/unit, variable cost/unit, units, acquisition spend
- Currently the only way to populate unit economics is to know the `segment_*` key convention in the raw AssumptionEditor — completely inaccessible to non-technical users
- This unlocks the already-built UnitEconomicsTable for real use

**P2-4: Replace prompt() with modal in duplicate flow**
- File: `src/app/(dashboard)/scenarios/[id]/scenario-detail-client.tsx` → `handleDuplicate()`
- Replace `window.prompt()` with a shadcn `<Dialog>` component containing an `<Input>` for the scenario name
- One-line change in terms of logic, but important for UI consistency and mobile compatibility

**P2-5: Surface rate limit error to user**
- File: `src/components/scenarios/scenario-chat-builder.tsx` → `handleSend()`
- Check `res.status === 429` and show: "You're sending requests too quickly. Please wait a moment before trying again."
- Currently shows the generic "Something went wrong" message

**P2-6: Two-step approval workflow for scenario changes**
- Extend scenario status: add `pending_approval` between `draft` and `active`
- File: create `src/app/api/scenarios/[id]/approve/route.ts` (admin+ only)
- When an advisor runs the model, scenario moves to `pending_approval` if org has approval workflow enabled
- Admin must approve before `active`
- Required for institutional use cases (investor reporting)

---

## Architectural Concerns

**ARCH-1: Dual Forecast Engine (critical)**
Two parallel implementations exist for scenario planning. `src/lib/forecast/engine.ts` + `src/lib/forecast/scenarios.ts` (legacy Sprint 5) and `src/lib/scenarios/` (newer Sprint 5 revised). Both persist to different database tables (`forecasts` / `forecast_scenarios` vs `model_snapshots` / `assumption_values`). The legacy engine has a more complete Balance Sheet model. The newer engine has better governance. This divergence will worsen. The `src/app/api/forecast/scenario/route.ts` still serves the legacy path. Action: merge Balance Sheet logic into `calculations.ts`, deprecate the legacy engine, redirect `forecast/scenario` to the new pipeline.

**ARCH-2: ScenarioChatBuilder renders in a 600px fixed-height sidebar**
In `scenario-detail-client.tsx`, the chat panel is rendered at `style={{ height: '600px' }}` in a sidebar beside the tab content. On screens narrower than ~1280px this will cause layout overflow. The chat panel also does not collapse gracefully. On mobile it will be unusable. This needs a responsive design pass before any advisor demo.

**ARCH-3: Assumptions resolved only for `firstForecastPeriod` — not per-period**
In `scenario-pipeline.ts`, `resolveAssumptionsForPeriod()` is called once for the first forecast period, and the resolved assumptions are used for ALL subsequent periods. The assumptions system supports time-varying values (different `effective_from` dates) but the pipeline doesn't re-resolve assumptions for each period in the timeline. This means: if an assumption is set to change in month 3 of the forecast (e.g., a planned hire), it will be applied from month 1. This is a correctness bug in the calculation engine.

**ARCH-4: `generateFullProjection` applies revenue growth as compound on prior period**
In `calculations.ts`, `baseRevenue = projections[projections.length - 1].revenue` — growth compounds on the previous period's projected revenue. This means a 5% monthly growth rate produces ~80% annual growth, which compounds exponentially. For forecasts beyond 12 months this creates unrealistically high projections. The correct approach is to allow switching between: (a) compound growth on base (current), (b) compound growth on trailing actuals, (c) flat rate applied to base period average. This affects the credibility of any forecast beyond 6 months.

**ARCH-5: Business Context Profile is a ghost dependency**
The Semantic Intelligence Layer sprint document defines `BusinessContextProfile` as the mandatory context package for all Claude API calls. The scenario `interpretScenarioRequest` function builds `FinancialContext` from Xero data but has zero connection to `business_context_profiles`. The `SEMANTIC_INTELLIGENCE_LAYER_SPRINT.md` document states this is P0 and "blocks everything." The scenario module is currently shipping without the foundation it was designed to depend on. Every AI output in the scenario module will be generic until this is wired.

---

## Summary Lists

### BUILD LIST (New features to create)

| Feature | Approach | Informed by | Priority |
|---------|----------|-------------|----------|
| Business Context in NL interpret | Fetch `business_context_profiles`, inject into `buildSystemPrompt()` | DataRails, Fathom | P0 |
| P&L Preview before confirmation | Lightweight preview endpoint, 3-period summary in ProposalCard | Runway auto-draft | P0 |
| Goalseek mode toggle in chat UI | Toggle in ScenarioChatBuilder, pass `mode` field | Fathom Goalseek | P1 |
| Multi-scenario overlay chart | N-line Recharts chart on compare page | Runway, DataRails | P1 |
| UK Employer NI/Pension auto-calc | headcount + salary → NI + pension in calculateProjection | Kevin Steel | P1 |
| Version diff viewer | Diff between two `scenario_versions` rows | Vena, DataRails | P1 |
| Segment setup UI | Guided form mapping to `segment_*` assumption keys | Mosaic | P2 |
| Monthly seasonality (12 multipliers) | `seasonality_jan` through `seasonality_dec` assumption keys | Jirav, Kevin Steel | P2 |
| Scenario event timeline | `event_label` field on assumptions, visual timeline component | Fathom Forecast Events | P2 |

### FIX LIST (Bugs and credibility issues)

| Issue | File | Priority |
|-------|------|----------|
| Currency symbol $ → £ | `scenario-detail-client.tsx` lines 173–190 | P1 |
| Goalseek mock data → live Xero data | `goalseek-client.tsx` | P0 |
| Assumptions only resolved for period 1 (correctness bug) | `scenario-pipeline.ts` | P1 |
| Duplicate uses window.prompt() | `scenario-detail-client.tsx` | P2 |
| Rate limit 429 not surfaced to user | `scenario-chat-builder.tsx` | P2 |
| ChatBuilder missing mode field in fetch | `scenario-chat-builder.tsx` | P1 |

### LEVERAGE LIST (Improve by wiring to existing platform features)

| Feature | Currently Exists | Action |
|---------|-----------------|--------|
| Business Context Profile | `business_context_profiles` table, sprint doc | Wire into `buildFinancialContext()` |
| KPI Values | KPI engine | Pre-populate goalseek template `currentValues` |
| Board Pack | Sprint 8 board pack module | Add "Push to Board Pack" button on scenario detail |
| Knowledge Vault | Auto-store already present | Surface stored scenarios in vault with scenario name |
| Audit Log | All mutations log to `audit_logs` | Create scenario-specific audit view on versions tab |

### SKIP LIST (Not for current phase)

| Feature | Reason | Revisit |
|---------|--------|---------|
| Multi-entity scenario consolidation | Single-entity SME MVP first | Phase 2 |
| Excel/CSV scenario import | Build vs buy decision needed | Phase 2 |
| Slack/Teams scenario queries | Phase 2 integration | Phase 2 |
| Two-step approval workflow | Overcomplexity for SME advisors | Phase 2 (institutional tier) |
| Macro scenarios (economy-level) | Runway feature for growth companies | Phase 2 |

---

## Token Budget Reference

| Action | Model | Estimated Tokens | Frequency | Monthly Cost (active user) |
|--------|-------|------------------|-----------|---------------------------|
| NL interpret (what-if) | Sonnet | ~2,500 in + ~800 out | ~10/session | ~£0.20/session |
| NL interpret (goalseek) | Opus | ~3,500 in + ~1,200 out | ~3/session | ~£0.15/session |
| Scenario AI commentary | Sonnet | ~2,000 in + ~600 out | Per model run | ~£0.03/run |
| P&L preview (proposed) | None — deterministic | 0 | Per proposal | £0 |
| Business context injection | +500 tokens to any call | Amortised | Negligible |

---

The scenario planning module is one of Grove's strongest differentiators architecturally — the governance primitives (confirmation token, immutable change log, assumption hash, model versioning, scenario lock) are genuinely ahead of every competitor in this audit. The critical work is not adding new governance — it is closing the three most visible gaps: injecting business context into AI calls so the engine "knows the business," wiring the goalseek gallery to live Xero data, and fixing the per-period assumption resolution bug that quietly undermines model correctness.
