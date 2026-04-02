# FEATURE BENCHMARK AUDIT FRAMEWORK
## Advisory OS — Systematic Best-in-Class Assessment

**Status:** Pre-build audit directive  
**Owner:** James  
**Scope:** Every page, section, feature, and user action across the entire platform  
**Estimated features:** 100–200+  

---

## The Problem

We have deep competitive research (FPA_COMPETITIVE_AUDIT.md, competitor screenshots, LinkedIn analysis), but it's not being systematically applied at the feature level during the build. The result: features like the graph builder get built to a standard that's below what a user can achieve by simply talking to Claude Finance with their data uploaded. That's unacceptable.

**The graph builder is the catalyst for this audit.** It's not dynamic enough. A user can paste their financial data into Claude and get better, more customisable visualisations through conversation than our purpose-built graph builder provides. If that's true for the graph builder, it's probably true for other features too. We need to find every instance of this before writing more code.

## The Core Questions

For every single feature on the platform, answer:

1. **What does best-in-class look like?** Not "Runway is good" — what specifically do they do, how does it work, why does it work?

2. **Can AI do this better than a static build?** Would a Claude API call with the right prompt and the user's data produce a better, more personalised result than a pre-built UI component?

3. **Can the user just use Claude Finance directly?** If someone uploads their Xero data to claude.ai and asks "show me my revenue trend with a forecast" — is that result better than what we've built? If yes, why are we building it?

4. **Can we leverage an existing tool instead?** Does Xero already do this? Can Google Sheets handle it? Is there a Slack integration that solves it? Don't build what you can orchestrate.

5. **Is this the best use of tokens?** Every Claude API call costs money. Is this feature worth the token spend? Can we cache it? Can we use Haiku instead of Sonnet? Can we batch calls?

6. **Will a non-finance person actually use this?** Our target user is a business owner turning over £1m–£20m who probably doesn't know what working capital means. If the feature requires financial literacy to operate, it fails the test.

7. **Does this feature strengthen the governance moat?** If a competitor can replicate this feature in a weekend with Claude Code (as Kevin Steel demonstrated with Inflectiv Intelligence — 143 commits in 24 days), it's not defensible. Features that leverage our governed infrastructure (audit trails, role-based access, multi-party workflows, data lineage) are defensible.

## The Process

### Step 1: Feature Inventory

Before auditing anything, produce a complete inventory of every feature on every page. A "feature" is any of:
- A data display (widget, chart, table, metric card)
- A user action (button, filter, sort, search, export, share)
- A navigation element (menu, tab, breadcrumb, command palette)
- A workflow step (approval, notification, version save)
- An AI-generated output (narrative, recommendation, alert, score)
- A data input (form field, inline edit, assumption entry, file upload)
- An integration touchpoint (Xero sync, email, Slack notification)

Group features by page/section. The inventory itself is deliverable #1.

### Step 2: Section-by-Section Audit

Work through one section at a time. For each section:

**Research phase:**
- Web search the 3–4 most relevant competitors for that feature area
- Fetch their product pages, help docs, and demo content
- Cross-reference with FPA_COMPETITIVE_AUDIT.md
- Test the equivalent task in Claude Finance (claude.ai with financial data)

**Assessment phase:**
For each feature, complete the benchmark table (see SKILL.md for full table structure). The critical columns are:

| Column | What to write |
|--------|--------------|
| Best in class | Name the competitor. Describe the specific mechanism, not the vibe |
| How they achieved it | Technical/UX approach — what makes it actually work |
| AI opportunity | Can Claude API produce a better, more dynamic result? |
| Non-finance user test | Score 1–5 with explanation. Would a plumber understand this? |
| Claude Finance alternative | Test it. Paste equivalent data into Claude. Compare the result |
| Leverage existing tools? | Xero native, Google Sheets, Notion, Slack — can we orchestrate? |
| Token efficiency | Tokens per call × frequency × cacheability |
| Build recommendation | BUILD / WRAP / LEVERAGE / SKIP |

**Output phase:**
Produce four lists:
1. **BUILD** — features we must build custom, informed by best-in-class
2. **WRAP** — features where Claude API does the work and we build the governed UI shell
3. **LEVERAGE** — features where we integrate/link to existing tools
4. **SKIP** — features that aren't needed for MVP (with timeline for revisit)

### Step 3: Architecture Extraction

After auditing multiple sections, identify cross-cutting patterns:
- Shared components appearing across features (DrillableNumber, CommentThread, AuditBadge)
- Token optimisation opportunities (batch calls, cache layers, model routing — Haiku for simple, Sonnet for complex)
- Governance primitives that make features defensible
- UX patterns that the best competitors share

### Step 4: Update Build Spec

Feed audit findings back into CLAUDE.md and DEMO_SPRINT_SPEC.md. Every feature in the build spec should reference its benchmark assessment. No feature gets built without a completed audit row.

## The 10 Competitors

| # | Platform | Primary strength | Most relevant for |
|---|----------|-----------------|-------------------|
| 1 | DataRails | Excel-native consolidation | Data handling, import/export |
| 2 | Runway | Driver-based models, modern UI | Scenario planning, forecasting |
| 3 | Fathom HQ | Advisor reporting, Xero-native | Reporting, KPIs, board packs |
| 4 | Syft Analytics | Multi-entity, Xero integration | Financial statements, multi-company |
| 5 | Jirav | Workforce planning, drivers | Forecasting, headcount modelling |
| 6 | Mosaic | Real-time strategic finance | Dashboard, real-time metrics |
| 7 | Cube | API-first, spreadsheet-native | Data architecture, flexibility |
| 8 | Planful | Enterprise CPM | Budgeting, approval workflows |
| 9 | Vena | Excel + cloud hybrid | Familiar UX, templates |
| 10 | Abacum | Real-time collab reporting | Collaboration, commenting |

**Plus:**
- **Claude Finance** — what can a user achieve by uploading data to claude.ai?
- **Existing tools** — Xero native, Google Sheets, Notion, Slack integrations

## Section Order (suggested)

This can be done in any order. James may choose to start with the most broken areas or the demo-critical sections.

| # | Section | Est. features | Priority |
|---|---------|--------------|----------|
| 1 | Dashboard & Widgets | 15–25 | Demo-critical |
| 2 | KPI Engine & Variance | 10–15 | Demo-critical |
| 3 | Financial Statements | 10–15 | Demo-critical |
| 4 | Graph / Chart Builder | 10–15 | Broken — audit first |
| 5 | Scenario Planning | 10–15 | Key differentiator |
| 6 | Forecasting & Drivers | 10–15 | Core value |
| 7 | Board Pack / Reporting | 10–15 | Advisor value |
| 8 | Search & Command Palette | 5–10 | UX multiplier |
| 9 | Onboarding Flow | 10–15 | First impression |
| 10 | Collaboration Layer | 10–15 | Platform primitive |
| 11 | Knowledge Vault | 5–10 | Differentiator |
| 12 | Advisor Portal | 10–15 | GTM critical |
| 13 | Investor Portal / VDR | 10–15 | Revenue unlock |
| 14 | Settings & Admin | 5–10 | Governance |
| 15 | Automations & Workflows | 5–10 | Phase 2 scoping |

**Total estimated: 130–215 features**

## What "Best in Class" Actually Means

This audit is about **functionality**, not aesthetics. When documenting how a competitor achieves something, describe the mechanism:

**Bad:** "Runway has a nice scenario comparison view."

**Good:** "Runway displays scenarios side-by-side in a synced-scroll layout. Each column is a scenario. Changed cells are highlighted in amber with the delta shown as both absolute value and percentage. Users can toggle between showing the raw values or showing only the variance. The comparison updates in real time as assumption sliders are adjusted. This works because it eliminates cognitive load — the user never has to hold two numbers in their head and calculate the difference."

**Bad:** "Fathom has good KPI tracking."

**Good:** "Fathom auto-generates a traffic-light KPI card for each metric based on configurable thresholds. Green/amber/red is determined by comparing actual vs. target with materiality bands (e.g., >5% variance = amber, >15% = red). The card shows a sparkline trend (12 months), the current period value, the variance, and a one-sentence AI-generated commentary. Clicking the card drills into a full-page trend view with the ability to overlay budget, forecast, and prior year. This works for non-finance users because the traffic light system requires zero financial knowledge — red means bad, green means good."

## Claude Code Integration

This audit framework should be referenced in CLAUDE.md. Add the following directive:

```markdown
## Pre-Build Audit Requirement

Before building or rebuilding any feature, check if a Feature Benchmark Audit 
has been completed for that feature. If not, flag it.

Audit documents are stored in: /docs/audits/[section-name]-audit.md

Each feature in the build spec should have a corresponding audit row with a 
clear BUILD / WRAP / LEVERAGE / SKIP recommendation. Features marked WRAP 
should use Claude API with governed UI. Features marked LEVERAGE should 
integrate existing tools rather than building custom.

Reference: FEATURE_BENCHMARK_AUDIT_FRAMEWORK.md
```

## Success Criteria

This audit is complete when:
- [ ] Every page in Advisory OS has a feature inventory
- [ ] Every feature has a completed benchmark table
- [ ] Every feature has a BUILD / WRAP / LEVERAGE / SKIP recommendation
- [ ] The graph builder specifically has been audited and a decision made
- [ ] Token cost estimates exist for every WRAP feature
- [ ] Non-finance user scores exist for every feature
- [ ] Claude Finance has been tested as an alternative for every feature
- [ ] Findings are integrated into CLAUDE.md and the build spec
- [ ] Cross-cutting architecture patterns are documented
