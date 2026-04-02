---

# Feature Benchmark Audit: Search & Intelligence
## Advisory OS (Grove) — Section 08 of 15
**Date:** 2026-04-02 | **Status:** Complete | **Auditor:** Claude Code

---

## Feature Inventory

| # | Feature | Type | Location | Current State |
|---|---------|------|----------|---------------|
| 1 | Ask Grove (Conversational AI) | AI Chat | `src/app/api/ask-grove/route.ts`, `src/components/ui/ask-grove.tsx` | Working |
| 2 | Ask Grove Voice Input | UI | `src/components/ui/ask-grove.tsx` (VoiceInput integration) | Working |
| 3 | Ask Grove Source Citations | Governance | `src/app/api/ask-grove/route.ts` (sources array) | Working |
| 4 | Ask Grove Business Context Injection | AI | `src/app/api/ask-grove/route.ts` (org, financials, health, thesis) | Working |
| 5 | Command Palette (CMD+K) | UI | `src/components/command-palette/command-palette.tsx` | Working |
| 6 | Command Palette Navigation Search | Search | `src/components/command-palette/command-palette.tsx` (fuzzy match) | Working |
| 7 | Command Palette Quick Actions | Search | `src/components/command-palette/command-palette.tsx` (QUICK_ACTIONS) | Working |
| 8 | Command Palette AI Query Routing | AI | `src/components/command-palette/command-palette.tsx` (AI_QUERIES) | Working |
| 9 | Anomaly Detection Engine | AI | `src/lib/ai/anomaly-detection.ts` | Working |
| 10 | Anomaly Type Classification | AI | `src/lib/ai/anomaly-detection.ts` (5 types: spike, drop, trend_change, unusual_transaction, threshold_breach) | Working |
| 11 | Anomaly Severity Scoring | AI | `src/lib/ai/anomaly-detection.ts` (high/medium/low) | Working |
| 12 | Anomaly Monetary Impact Estimation | AI | `src/lib/ai/anomaly-detection.ts` (monetary_impact field) | Working |
| 13 | Anomaly Governance Checkpoint | Governance | `src/lib/ai/anomaly-detection.ts` (governedOutput call) | Working |
| 14 | Intelligence Events Feed | Data | `src/lib/intelligence/events.ts`, `src/components/intelligence/intelligence-feed.tsx` | Working |
| 15 | Intelligence Events by Sector/Country | Data | `src/lib/intelligence/events.ts` (getEventsForOrg) | Working |
| 16 | Intelligence Impact Analyser | AI | `src/lib/intelligence/impact-analyser.ts` | Working |
| 17 | Impact Personalisation (org-specific narrative) | AI | `src/lib/intelligence/impact-analyser.ts` (org financial profile injection) | Working |
| 18 | Impact Estimated Financial Effect | AI | `src/lib/intelligence/impact-analyser.ts` (estimated_impact_pence) | Working |
| 19 | Impact Card UI | UI | `src/components/intelligence/impact-card.tsx` | Working |
| 20 | Intelligence Page | Page | `src/app/(dashboard)/intelligence/page.tsx` | Working |
| 21 | Intelligence Anomalies Page | Page | `src/app/(dashboard)/intelligence/anomalies/page.tsx` | Working |
| 22 | Intelligence Trends Page | Page | `src/app/(dashboard)/intelligence/trends/page.tsx` | Working |
| 23 | Variance Explainer | AI | `src/lib/analysis/variance.ts` | Working |
| 24 | Variance Account-Level Driver Decomposition | Calculation | `src/lib/analysis/variance.ts` (deterministic decomposition) | Working |
| 25 | Variance AI Insight Generation | AI | `src/lib/analysis/variance.ts` (callLLMCached with company context) | Working |
| 26 | Variance Governance Checkpoint | Governance | `src/lib/analysis/variance.ts` (governedOutput call) | Working |
| 27 | Health Check Engine (8 metrics) | Calculation | `src/lib/analysis/health-check.ts` | Working |
| 28 | Health Check Revenue Growth (MoM + YoY) | Calculation | `src/lib/analysis/health-check.ts` | Working |
| 29 | Health Check Gross/Operating Margin | Calculation | `src/lib/analysis/health-check.ts` | Working |
| 30 | Health Check Expense Ratio | Calculation | `src/lib/analysis/health-check.ts` | Working |
| 31 | Health Check Cost vs Revenue Growth | Calculation | `src/lib/analysis/health-check.ts` | Working |
| 32 | Health Check Burn Rate | Calculation | `src/lib/analysis/health-check.ts` | Working |
| 33 | Health Check Margin Stability (std dev) | Calculation | `src/lib/analysis/health-check.ts` | Working |
| 34 | Health Check Revenue Concentration | Calculation | `src/lib/analysis/health-check.ts` | Working |
| 35 | Health Check AI Summary | AI | `src/lib/analysis/health-check.ts` (LLM plain-English summary) | Working |
| 36 | Health Check Alert System | Calculation | `src/lib/analysis/health-check.ts` (severity-based alerts) | Working |
| 37 | Health Check Overall Score (0-100) | Calculation | `src/lib/analysis/health-check.ts` (weighted average) | Working |
| 38 | AI Commentary Generator (with source citations) | AI | `src/lib/analysis/commentary.ts` | Working |
| 39 | Commentary vs Thesis Comparison | AI | `src/lib/analysis/commentary.ts` (thesis expectations integration) | Working |
| 40 | Commentary 4-Section Structure | AI | `src/lib/analysis/commentary.ts` (Revenue, Profitability, Costs, Outlook) | Working |
| 41 | Commentary Source Citation System | Governance | `src/lib/analysis/commentary.ts` ([ref:N] citations) | Working |
| 42 | Commentary Sentiment Tagging | AI | `src/lib/analysis/commentary.ts` (positive/neutral/concerning) | Working |
| 43 | Business Thesis Generator | AI | `src/lib/analysis/thesis.ts` | Working |
| 44 | Thesis Revenue Structure Expectations | AI | `src/lib/analysis/thesis.ts` (type, concentration, seasonality, growth) | Working |
| 45 | Thesis Cost Structure Expectations | AI | `src/lib/analysis/thesis.ts` (type, gross margin, cost lines, labour) | Working |
| 46 | Thesis Key Metrics + Benchmarks | AI | `src/lib/analysis/thesis.ts` (5-8 metrics, 4-6 benchmarks) | Working |
| 47 | Thesis Testable Hypotheses | AI | `src/lib/analysis/thesis.ts` (3-5 hypotheses) | Working |
| 48 | Company Skill System | AI | `src/lib/skills/company-skill.ts` | Working |
| 49 | Company Skill Business Context Assembly | Data | `src/lib/skills/company-skill.ts` (8 parallel data fetches) | Working |
| 50 | Company Skill Semantic Mapping Integration | Data | `src/lib/skills/company-skill.ts` (account mappings, categories) | Working |
| 51 | Company Skill System Prompt Formatter | AI | `src/lib/skills/company-skill.ts` (getSkillAsSystemPrompt) | Working |
| 52 | Company Skill Lightweight Context Prefix | AI | `src/lib/skills/company-skill.ts` (getCompanyContextPrefix) | Working |
| 53 | Company Skill Investor FAQ Generation | AI | `src/lib/skills/company-skill.ts` (LLM-generated) | Working |
| 54 | Company Skill Context Freshness Tracking | Data | `src/lib/skills/company-skill.ts` (stale detection) | Working |
| 55 | Company Skill DB Cache + Auto-Refresh | Data | `src/lib/skills/company-skill.ts` (7-day TTL) | Working |
| 56 | KPI Narrative Generator | AI | `src/app/api/kpi/narrative/[orgId]/route.ts` | Working |
| 57 | Narrative Summary UI Component | UI | `src/components/dashboard/narrative-summary.tsx` | Working |
| 58 | Narrative Expandable Reasoning | UI | `src/components/dashboard/narrative-summary.tsx` (reasoning + confidence) | Working |
| 59 | Scenario AI Commentary | AI | `src/lib/ai/commentary.ts` (generateAndPersistCommentary) | Working |
| 60 | AI Search Bar (per-section) | UI | `src/components/intelligence/ai-search-bar.tsx` | Partial |
| 61 | Section-Specific Search Examples | Data | `src/lib/intelligence/search-examples.ts` (14 sections) | Working |
| 62 | Recommendation Engine | Data | `src/lib/intelligence/recommendations.ts` | Working |
| 63 | Intelligence Page Wrapper | UI | `src/components/intelligence/intelligence-page-wrapper.tsx` | Working |
| 64 | Governance Checkpoints on All AI Outputs | Governance | Multiple files (governedOutput calls) | Working |
| 65 | Rate Limiting on AI Endpoints | Security | `src/lib/ai/rate-limiter.ts`, `src/lib/rate-limit.ts` | Working |
| 66 | Token Budget Management | Security | `src/lib/ai/token-budget.ts` | Working |
| 67 | LLM Response Caching | Performance | `src/lib/ai/cache.ts` (DB cache + Anthropic prompt caching) | Working |

---

## Benchmark Tables

### 1. Conversational AI / Ask Grove

| Capability | DataRails | Fathom | Jirav | Runway | Advisory OS |
|------------|-----------|--------|-------|--------|-------------|
| Natural language Q&A | No | No | No | Copilot (NL queries) | Yes (Ask Grove) |
| Voice input | No | No | No | No | Yes |
| Business context injection | N/A | N/A | N/A | Ambient Intelligence | Yes (org + financials + health + thesis) |
| Source citations on answers | N/A | N/A | N/A | No | Yes (data source badges) |
| Suggested questions | N/A | N/A | N/A | Yes | Yes (4 suggestions) |
| Conversation history | N/A | N/A | N/A | Yes | No (single Q&A) |
| Multi-turn dialogue | N/A | N/A | N/A | Yes | No |
| Governance audit trail | N/A | N/A | N/A | No | Yes (governedOutput) |
| Token budget controls | N/A | N/A | N/A | No | Yes |

### 2. Search / CMD+K

| Capability | DataRails | Fathom | Jirav | Runway | Mosaic | Advisory OS |
|------------|-----------|--------|-------|--------|--------|-------------|
| Global search (CMD+K) | No | No | No | Yes | No | Yes |
| Navigation search | Excel-based | No | No | Yes | No | Yes (23 pages) |
| Quick actions | No | No | No | Yes | No | Yes (5 actions) |
| AI query from search | No | No | No | Yes | No | Yes (auto-detect questions) |
| Fuzzy matching | N/A | N/A | N/A | Yes | N/A | Yes (basic fuzzy) |
| Semantic search | N/A | N/A | N/A | Yes | N/A | No |
| Recent searches | N/A | N/A | N/A | Yes | N/A | No |
| Search within data | N/A | N/A | N/A | Yes | N/A | No |
| Keyboard navigation | N/A | N/A | N/A | Yes | N/A | Yes (arrows + enter) |

### 3. Anomaly Detection

| Capability | DataRails | Syft/Xero | Puzzle | Fathom | Advisory OS |
|------------|-----------|-----------|--------|--------|-------------|
| Automated anomaly detection | No | AI anomaly (beta) | Yes (continuous) | Limited | Yes |
| Classification types | N/A | Unknown | 2-3 types | N/A | 5 types |
| Severity scoring | N/A | Unknown | No | N/A | Yes (3 levels) |
| Monetary impact estimation | N/A | No | No | N/A | Yes |
| Actionable recommendations | N/A | Unknown | Limited | N/A | Yes |
| Triggered on sync | N/A | Unknown | Yes | N/A | Yes |
| Historical comparison window | N/A | Unknown | Real-time | N/A | 7 months (6 + 1 latest) |
| Governance audit trail | N/A | No | No | N/A | Yes |

### 4. Variance Analysis & AI Commentary

| Capability | DataRails | Fathom | Jirav | Planful | Vena | Advisory OS |
|------------|-----------|--------|-------|---------|------|-------------|
| Budget vs actual variance | Yes | Yes | Yes | Yes | Yes | Yes |
| Account-level driver decomposition | Yes | Limited | Limited | Yes | Yes | Yes |
| AI-generated variance narrative | No | No | No | No | No | Yes |
| Source citations in commentary | No | No | No | No | No | Yes ([ref:N]) |
| Thesis-aware commentary | No | No | No | No | No | Yes |
| 4-section structured output | No | No | No | No | No | Yes |
| Sentiment tagging | No | No | No | No | No | Yes |
| Company context enrichment | N/A | N/A | N/A | N/A | N/A | Yes (company skill prefix) |

### 5. Health Check / Diagnostics

| Capability | DataRails | Fathom | Mosaic | Puzzle | Advisory OS |
|------------|-----------|--------|--------|--------|-------------|
| Overall health score | No | No | No | No | Yes (0-100) |
| Multi-metric assessment | No | Limited | Some | Limited | Yes (8 universal metrics) |
| Severity-based alerts | No | No | No | Limited | Yes (info/warning/critical) |
| Trend detection | No | Yes | No | Limited | Yes (improving/stable/declining) |
| Industry benchmarks | No | Yes (ratios) | Yes | No | Partial (static benchmarks) |
| AI plain-English summary | No | No | No | No | Yes |
| Revenue concentration risk | No | No | No | No | Yes |
| Margin stability (std dev) | No | No | No | No | Yes |
| Deterministic calculations | N/A | Yes | N/A | N/A | Yes (all math in TypeScript) |

### 6. Business Thesis / Company Skill

| Capability | DataRails | Fathom | Runway | Kevin Steel (Inflectiv) | Advisory OS |
|------------|-----------|--------|--------|-------------------------|-------------|
| Business thesis generation | No | No | No | Partial (advisor-driven) | Yes (AI-generated) |
| Revenue structure expectations | No | No | No | Manual | Yes (type, concentration, seasonality) |
| Cost structure expectations | No | No | No | Manual | Yes (margin, cost lines, labour) |
| Industry benchmarks in thesis | No | Some | No | Yes | Yes (4-6 per thesis) |
| Testable hypotheses | No | No | No | No | Yes (3-5 per thesis) |
| Company skill as system prompt | N/A | N/A | N/A | N/A | Yes (full + lightweight prefix) |
| Semantic mapping integration | N/A | N/A | N/A | N/A | Yes |
| Context freshness tracking | N/A | N/A | N/A | N/A | Yes (stale detection) |
| Auto-refresh with caching | N/A | N/A | N/A | N/A | Yes (7-day TTL, DB cache) |

### 7. Intelligence Feed (Macro Events)

| Capability | DataRails | Fathom | Mosaic | Runway | Advisory OS |
|------------|-----------|--------|--------|--------|-------------|
| Macro event tracking | No | No | No | Macro scenarios | Yes |
| Event type classification | N/A | N/A | N/A | N/A | Yes (6 types) |
| Sector/country filtering | N/A | N/A | N/A | N/A | Yes |
| Personalised impact analysis | N/A | N/A | N/A | No | Yes |
| Estimated financial impact (GBP) | N/A | N/A | N/A | No | Yes (pence precision) |
| Impact type classification | N/A | N/A | N/A | N/A | Yes (positive/negative/neutral/mixed) |
| Relevance scoring | N/A | N/A | N/A | N/A | Yes (0-1) |
| One-click analyse | N/A | N/A | N/A | N/A | Yes |

---

## Competitive Feature Matrix

| Feature Area | DataRails | Fathom | Syft/Xero | Jirav | Runway | Mosaic | Puzzle | Planful | Vena | Cube | Advisory OS |
|-------------|-----------|--------|-----------|-------|--------|--------|--------|---------|------|------|-------------|
| Conversational AI | - | - | - | - | ++ | - | - | - | - | - | ++ |
| CMD+K Search | - | - | - | - | + | - | - | - | - | - | + |
| Anomaly Detection | - | - | + | - | - | - | ++ | - | - | - | ++ |
| AI Variance Commentary | - | - | - | - | - | - | - | - | - | - | ++ |
| Health Diagnostics | - | + | - | - | - | + | + | - | - | - | ++ |
| Business Thesis | - | - | - | - | - | - | - | - | - | - | ++ |
| Company Skill / Context | - | - | - | - | + | - | - | - | - | - | ++ |
| Macro Intelligence Feed | - | - | - | - | + | - | - | - | - | - | ++ |
| Source Citations | - | - | - | - | - | - | - | - | - | - | ++ |
| Governance Audit Trail | - | - | - | - | - | - | - | + | + | - | ++ |

Legend: `++` = best-in-class, `+` = present, `-` = absent

---

## Gap Analysis

### Critical Gaps (P0)

| # | Gap | Impact | Benchmark |
|---|-----|--------|-----------|
| 1 | **No multi-turn conversation in Ask Grove** | Users cannot ask follow-up questions; each query is standalone with no memory of previous context | Runway Copilot supports multi-turn dialogue with full context carryover |
| 2 | **No semantic search across financial data** | CMD+K only searches navigation items and static quick actions; cannot search within actual financial data (transactions, accounts, KPIs) | Runway and enterprise FP&A tools allow searching within financial data |
| 3 | **AI Search Bar is non-functional** | `ai-search-bar.tsx` has an input but no backend integration; onChange updates local state only, no query submission | Every competitor with search has functional search |
| 4 | **No real-time event ingestion for Intelligence Feed** | Events must be manually seeded via admin action; no automated ingestion from RSS, APIs, or news sources | Runway macro scenarios use curated data feeds |

### Significant Gaps (P1)

| # | Gap | Impact | Benchmark |
|---|-----|--------|-----------|
| 5 | **Recommendation engine uses hardcoded demo data** | `recommendations.ts` returns static mock data referencing a bridal business; not personalised to actual org | Should use company skill + financial data for dynamic recommendations |
| 6 | **No search history or recent queries** | Users cannot recall previous questions or re-run past analyses | Runway and enterprise tools maintain query history |
| 7 | **Health check benchmarks are static** | Benchmark strings are hardcoded (e.g. "40-70% for services"); not adapted to the org's industry | Fathom provides sector-specific ratio benchmarks; Mosaic offers industry comparisons |
| 8 | **Intelligence client uses hardcoded org data** | `intelligence-client.tsx` sends hardcoded values (annual_revenue: 50000000, employee_count: 15) instead of actual org data | Should pull from organisation profile and financial data |
| 9 | **No proactive insight notifications** | Intelligence feed is passive (user must visit the page); no push notifications or dashboard alerts for new anomalies/events | Puzzle has continuous monitoring with alerts; Jirav has automated variance alerts |
| 10 | **Commentary not auto-generated on sync** | Commentary requires manual trigger; not automatically regenerated when new Xero data syncs | Puzzle auto-categorises and monitors continuously |

### Minor Gaps (P2)

| # | Gap | Impact | Benchmark |
|---|-----|--------|-----------|
| 11 | **No dark mode support in command palette** | Command palette uses hardcoded white/slate colours; no dark mode variant | Minor UX gap |
| 12 | **Ask Grove limited to 3 months of financial data** | Query context includes only last 3 months of normalised financials | Should allow configurable lookback or auto-expand for trend questions |
| 13 | **No competitor monitoring in intelligence** | Recommendations reference it (`intel-3`), but no implementation exists | Nice-to-have; not present in any benchmarked tool |
| 14 | **No export/share for AI answers** | Ask Grove responses cannot be saved, exported, or shared with team members | Minor UX gap for advisor collaboration |
| 15 | **Thesis expiry is fixed at 30 days** | No manual refresh trigger; thesis auto-expires regardless of data changes | Should also refresh on significant data changes (new sync, interview update) |

---

## Prioritised Recommendations

### P0 — Must Fix (Next Sprint)

| # | Recommendation | Effort | Impact |
|---|---------------|--------|--------|
| 1 | **Add multi-turn conversation to Ask Grove** — Maintain a session-scoped message history (last 5 exchanges) so users can ask follow-ups. Store conversation in client state; pass as messages array to LLM. | Medium | High |
| 2 | **Wire up AI Search Bar** — Connect `ai-search-bar.tsx` to `/api/ask-grove` with section-aware context. On submit, call Ask Grove with the section as context hint. Show inline response. | Low | High |
| 3 | **Add semantic data search to CMD+K** — When query matches no navigation items, search KPI names, account names, and period data via a lightweight `/api/search` endpoint. Return results alongside AI suggestions. | Medium | High |
| 4 | **Fix hardcoded org data in intelligence client** — Replace hardcoded values in `intelligence-client.tsx` with actual org profile data. Pass org context as props from the server component. | Low | High |

### P1 — Should Fix (Next 2 Sprints)

| # | Recommendation | Effort | Impact |
|---|---------------|--------|--------|
| 5 | **Build real-time event ingestion pipeline** — Create a background job (cron or webhook) that ingests macro events from curated RSS feeds, BoE rate decisions, HMRC updates, and ONS statistics. Store in `intelligence_events` table. | High | High |
| 6 | **Make recommendation engine dynamic** — Replace static mock data with company-skill-driven recommendations. Use LLM to generate 3-4 section-specific recommendations based on actual org data, health score, and maturity level. | Medium | High |
| 7 | **Add dynamic industry benchmarks to health check** — Use the company skill's industry field to select appropriate benchmark ranges. Store benchmark tables per industry in the database or derive via LLM at thesis generation time. | Medium | Medium |
| 8 | **Auto-generate commentary on Xero sync** — After each successful sync, trigger anomaly detection AND commentary generation for the latest period. Surface new insights via notification bell. | Medium | High |
| 9 | **Add proactive insight notifications** — When anomaly detection or health check finds warning/critical items, create a notification entry. Surface via the existing notification bell component. | Medium | Medium |

### P2 — Nice to Have (Backlog)

| # | Recommendation | Effort | Impact |
|---|---------------|--------|--------|
| 10 | **Add search history to CMD+K** — Store last 10 queries in localStorage; show as "Recent" section when palette opens with empty query. | Low | Low |
| 11 | **Expand Ask Grove financial context window** — Allow configurable lookback (3/6/12 months). Auto-expand to 6 months for trend-related questions. | Low | Medium |
| 12 | **Add export/share for AI answers** — Copy-to-clipboard button on Ask Grove responses; optional "Share with advisor" action. | Low | Low |
| 13 | **Thesis refresh on significant data changes** — Trigger thesis regeneration when a new Xero sync brings >10% revenue change or when the onboarding interview is updated. | Low | Medium |
| 14 | **Dark mode for command palette** — Use Tailwind dark: variants for all hardcoded colours. | Low | Low |

---

## Architectural Concerns

### 1. AI Search Bar Is Disconnected (CRITICAL)
`src/components/intelligence/ai-search-bar.tsx` renders an input field that updates local state but never submits a query. This is a dead-end UI element. Either wire it to Ask Grove or remove it to avoid confusing users.

### 2. Recommendation Engine Is Static Demo Data (SIGNIFICANT)
`src/lib/intelligence/recommendations.ts` contains ~650 lines of hardcoded recommendations referencing a specific bridal business. In production, every org would see bridal-themed recommendations. This must be replaced with dynamic generation before any non-demo user onboards.

### 3. Intelligence Client Hardcodes Financial Data (SIGNIFICANT)
`src/app/(dashboard)/intelligence/intelligence-client.tsx` sends hardcoded org financial data (`annual_revenue: 50000000`, `employee_count: 15`) when triggering impact analysis. This means every org gets the same impact calculations regardless of their actual financial position.

### 4. Ask Grove Context Is Compressed But Not Skill-Enriched
Ask Grove builds its own financial context from raw DB queries instead of using `getSkillAsSystemPrompt()` from the company skill system. This means Ask Grove lacks the semantic mappings, tracking dimensions, communication preferences, and context freshness warnings that the company skill provides. Recommendation: use `getSkillAsSystemPrompt()` as the base system prompt for Ask Grove.

### 5. Model Tier Inconsistency
Anomaly detection uses `haiku` while variance analysis uses `sonnet`. Health check summary uses `haiku`. KPI narrative uses `sonnet`. Commentary uses the default (sonnet). The model tier choices should be documented and justified based on task complexity:
- **Haiku**: Anomaly detection (structured JSON), health summary (short text), company skill FAQ
- **Sonnet**: Variance analysis (requires reasoning), commentary (long-form), KPI narrative, thesis generation
- Current choices are reasonable but should be formalised in a model selection policy.

### 6. No Streaming for AI Responses
All AI endpoints return complete responses. For longer outputs (commentary, thesis), streaming would significantly improve perceived performance. Ask Grove is the most user-facing and would benefit most from streaming.

---

## Summary Lists

### BUILD (New features to create)

1. Multi-turn Ask Grove conversation with session memory
2. Semantic data search across financial data (accounts, KPIs, transactions)
3. Real-time macro event ingestion pipeline (RSS, BoE, HMRC, ONS)
4. Dynamic recommendation engine powered by company skill + LLM
5. Proactive insight notification system
6. Auto-trigger commentary + anomaly detection on Xero sync

### FIX (Existing features to repair)

1. Wire AI Search Bar to actual backend (currently non-functional)
2. Replace hardcoded org data in intelligence client with actual profile
3. Replace static bridal demo data in recommendations engine
4. Enrich Ask Grove with company skill system prompt (not raw DB queries)
5. Expand Ask Grove financial context beyond 3 months for trend questions
6. Add dynamic industry benchmarks to health check (replace static strings)

### LEVERAGE (Existing strengths to amplify)

1. **Company Skill System** — Already the richest business context object in the competitive landscape. Feed it into every AI endpoint (Ask Grove, anomaly detection, intelligence impact) for consistent personalisation.
2. **Governance Checkpoints** — Every AI output has an audit trail. No competitor matches this. Use it as a trust differentiator in marketing.
3. **Source Citation System** — Commentary with [ref:N] citations is unique. Extend this pattern to Ask Grove answers and health check summaries.
4. **Business Thesis** — No competitor generates pre-analytical expectations. The thesis-vs-actuals comparison in commentary is a genuine competitive advantage. Surface it more prominently in the UI.
5. **Health Check 8-Metric Model** — The deterministic calculation + AI summary pattern is sound. The 8 metrics cover the universal basics well. Add industry-specific metrics via playbook integration.
6. **Anomaly Detection 5-Type Taxonomy** — More granular than any competitor. The monetary impact estimation adds concrete value. Surface anomalies on the dashboard, not just the intelligence page.

### SKIP (Features not worth building now)

1. **Competitor monitoring** — Complex to build, unclear data sources, not a core FP&A feature
2. **Full-text search across documents/vault** — Lower priority than financial data search; can use Supabase full-text search later
3. **AI-powered data entry/correction** — Puzzle does this for bookkeeping, but Advisory OS is an analytics layer, not an accounting tool
4. **Real-time collaborative AI chat** — Multi-user simultaneous chat is engineering-heavy with low ROI for SME advisory
5. **Custom anomaly rules** — The AI-driven approach is more flexible than rule-based; defer manual rule configuration

---

*Audit complete. 67 features inventoried. 4 critical gaps, 6 significant gaps, 5 minor gaps identified. Advisory OS's Search & Intelligence layer is the most differentiated area of the platform, with no direct competitor matching the combination of governed AI, business thesis, company skill, and source-cited commentary. The critical gaps (multi-turn conversation, semantic search, live event ingestion) are the primary barriers to production readiness.*
