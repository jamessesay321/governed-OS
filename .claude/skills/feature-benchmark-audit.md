---
name: feature-benchmark-audit
description: Systematic feature-by-feature audit of Advisory OS against 10 best-in-class FP&A platforms. Use this skill whenever James asks to benchmark, audit, or compare any Advisory OS feature, page, section, or module against competitors. Also trigger when he asks about best-in-class approaches for any specific capability (e.g. "how should we build the graph view", "what's the best approach to variance analysis", "audit the dashboard"), when he wants to evaluate build-vs-leverage decisions, or when assessing whether a feature should use Claude API, Claude Finance, or an existing tool. Works in sections — can audit a single feature, a full page, or an entire module. Every audit produces a structured benchmark table with clear build recommendations.
---

# Feature Benchmark Audit

This skill produces a rigorous, functionality-focused benchmark of Advisory OS features against the 10 best-in-class FP&A platforms. The output is a structured assessment that directly informs build decisions for Claude Code.

## Why this audit matters

Advisory OS has deep competitive research, but it's not being systematically applied feature-by-feature during the build. This skill closes that gap. Every feature gets benchmarked before code is written or rewritten, answering: what does best-in-class look like, and what's the smartest way to achieve it?

## The 10 benchmark competitors

Always audit against these platforms (adjust if a feature is irrelevant to a specific competitor):

1. **DataRails** — Excel-native FP&A, strong consolidation
2. **Runway** — Modern UI, scenario planning, driver-based models
3. **Fathom HQ** — Xero/QBO reporting, advisor-friendly
4. **Syft Analytics** — Multi-entity reporting, Xero integration
5. **Jirav** — Workforce planning, driver-based forecasting
6. **Mosaic** — Strategic finance, real-time metrics
7. **Cube** — Spreadsheet-native, API-first FP&A
8. **Planful** — Enterprise CPM, structured planning
9. **Vena** — Excel + cloud hybrid, budgeting workflows
10. **Abacum** — Real-time reporting, collaboration

Plus two additional evaluation columns:
- **Claude Finance** (claude.ai with financial data) — what can the user achieve just by talking to Claude with their data?
- **Existing tools** (Slack, Notion, Google Sheets, Xero native, etc.) — can we orchestrate rather than build?

## How to scope the audit

When James specifies a section, audit EVERY discrete feature within it. A "feature" is any action a user can take or any data display they interact with. Be granular — a dashboard page might contain 15+ features (each widget type, each filter, each drill-down, each export option).

### Feature inventory approach

Before auditing, first produce a **complete feature inventory** of the section being audited:

```
SECTION: [e.g. Dashboard]
─────────────────────────
1. Revenue summary widget
2. Expense breakdown widget
3. Cash flow trend chart
4. KPI cards (individual metrics)
5. Date range selector
6. Filter by category/department
7. Drill-down from summary to transactions
8. Widget drag-and-drop reposition
9. Widget resize
10. Cross-filter between widgets
11. Export dashboard as PDF
12. Share dashboard link
13. Add custom widget
14. Widget colour coding by status
15. Annotation/comment on data point
```

James should confirm the inventory before the detailed audit begins. This prevents missing features.

## The benchmark table structure

For EACH feature, produce this assessment:

### Feature: [Name]

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Plain-English description of the capability |
| **What it's trying to achieve** | The user outcome / job-to-be-done |
| **Who needs it** | Business owner / Advisor / Investor / All |
| **Best in class** | Which competitor does this best, and specifically how |
| **How they achieved it** | Technical/UX approach (not just "good UI" — what makes it work) |
| **Runner up** | Second-best implementation and what's different |
| **Current Advisory OS state** | What exists today (working / partial / broken / missing) |
| **AI opportunity** | Can AI meaningfully improve this beyond traditional implementation? How? |
| **Non-finance user test** | Would a business owner with no finance background understand and use this without help? Rate 1-5 and explain |
| **Claude Finance alternative** | Can a user achieve this by talking to Claude with their Xero data? Better or worse than building it? |
| **Leverage existing tools?** | Can we orchestrate Notion/Sheets/Slack/Xero native features instead of building? |
| **Token efficiency** | If using Claude API: estimated token cost per use, frequency of use, caching opportunities |
| **Build recommendation** | One of: BUILD (custom), WRAP (Claude API with governed UI), LEVERAGE (existing tool), SKIP (not needed for MVP) |
| **Priority** | P0 (demo-critical) / P1 (launch) / P2 (post-launch) / P3 (later) |
| **Defensibility** | Does this feature contribute to the governance moat? How? |

## Evaluation principles

When assessing each dimension, apply these lenses:

**Functionality over aesthetics.** Don't say "Runway has a clean UI." Say "Runway lets users drag a slider to adjust growth rate and immediately see the P&L impact across 12 months with the changed cells highlighted in amber — this works because it eliminates the feedback loop between assumption and outcome."

**Be specific about mechanisms.** "Fathom does this well" is useless. "Fathom auto-generates a variance commentary paragraph comparing actual vs budget with materiality thresholds — they highlight variances >10% and suppress immaterial ones, which prevents information overload for non-finance users" is useful.

**Challenge the build assumption.** For every feature, genuinely ask: does Advisory OS need to build this, or is it better delivered by Claude Finance directly, or by linking to an existing tool? The default should be "don't build unless there's a governance or integration reason to."

**Token cost matters.** If a feature calls Claude API, estimate: how many tokens per call, how often will users trigger it, can we cache the result, can we use Haiku instead of Sonnet/Opus for this specific task?

**The non-finance user is the tiebreaker.** When two approaches are equivalent, the one that's more intuitive to a business owner who doesn't know what EBITDA stands for wins.

## Output format for Claude Code

After the benchmark tables, produce a summary that Claude Code can act on:

```markdown
## BUILD LIST (features to implement or rebuild)
- [Feature]: [Specific approach informed by best-in-class analysis]

## WRAP LIST (Claude API features needing governed UI)  
- [Feature]: [What the API call does] → [What the UI shell needs to provide]

## LEVERAGE LIST (use existing tools)
- [Feature]: [Which tool] → [How to integrate/link]

## SKIP LIST (not for MVP)
- [Feature]: [Why skip] → [When to revisit]

## ARCHITECTURE NOTES
- Any shared components, data primitives, or patterns identified across features
- Token optimisation opportunities (batching, caching, model routing)
```

## Working in sections

This audit will produce 100+ feature assessments across the full platform. Work in sections matching the platform's page/module structure. Suggested section order (adapt as needed):

1. Dashboard (widgets, layout, filters, drill-down)
2. KPI Engine (metrics, variance, trends, alerts)
3. Financial Statements (P&L, Balance Sheet, Cash Flow)
4. Scenario Planning (models, assumptions, comparison)
5. Forecasting (projections, drivers, what-if)
6. Reporting / Board Pack (generation, templates, export)
7. Knowledge Vault (documents, search, AI Q&A)
8. Onboarding (interview, data connection, setup)
9. Collaboration (sharing, comments, version control)
10. Advisor Portal (client management, multi-entity)
11. Investor Portal (VDR, engagement, analytics)
12. Search & Navigation (command palette, AI routing)
13. Settings & Administration (RBAC, audit trails, config)
14. Automations & Workflows (triggers, approvals, notifications)
15. Graph / Chart Builder (visualization, customization)

Each section audit should be a self-contained document that feeds into the master audit.

## Research methodology

For each section:

1. **Web search** the top 3-4 competitors most relevant to that feature area
2. **Fetch** their product pages, documentation, and demo videos where available
3. **Cross-reference** with the existing FPA_COMPETITIVE_AUDIT.md findings
4. **Identify patterns** — what do the best implementations have in common?
5. **Test against Claude Finance** — can the user achieve this outcome by uploading their data to Claude and asking?

## Key reference documents

Read these before starting any audit section:
- `CLAUDE.md` — current build state and architecture
- `docs/FPA_COMPETITIVE_AUDIT.md` — existing competitive analysis
- `DEMO_SPRINT_SPEC.md` — current sprint scope and priorities
