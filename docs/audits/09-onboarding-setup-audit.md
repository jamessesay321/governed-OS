# Feature Benchmark Audit 09 — Onboarding & Setup
## Advisory OS (Grove) — Section 09 of 15
**Date:** 2026-04-02 | **Status:** Complete | **Auditor:** Claude Code

---

## Feature Inventory

| # | Feature | Type | Location | Current State |
|---|---------|------|----------|---------------|
| 1 | Two-path choice screen (Demo vs Full Setup) | UX | `src/components/onboarding/welcome-client.tsx` | Working |
| 2 | Business website scan (SSRF-protected) | AI | `src/app/api/onboarding/scan/route.ts` | Working |
| 3 | Scan result feedback UI (animated, contextual) | UX | `src/components/onboarding/welcome-client.tsx` | Working |
| 4 | Demo collection form (industry, team, revenue range) | UX | `src/components/onboarding/demo-collection-client.tsx` | Working |
| 5 | Demo data generation — financials (12 months) | Data | `src/lib/demo/generate-demo-data.ts` | Working |
| 6 | Demo data generation — KPIs | Data | `src/lib/demo/generate-demo-data.ts` | Working |
| 7 | Demo data generation — budgets | Data | `src/lib/demo/generate-demo-data.ts` | Working |
| 8 | Demo data generation — business profile via LLM | AI | `src/lib/demo/generate-demo-data.ts` | Working |
| 9 | Demo API endpoint with Zod validation | API | `src/app/api/onboarding/demo/route.ts` | Working |
| 10 | Demo-to-full upgrade path | API | `src/app/api/onboarding/upgrade/route.ts` | Working (stub) |
| 11 | Xero OAuth connect initiation (CSRF state) | Auth | `src/app/api/xero/connect/route.ts` | Working |
| 12 | Xero OAuth callback (code exchange) | Auth | `src/app/api/xero/callback/route.ts` | Working |
| 13 | Encrypted token storage (AES) | Security | `src/lib/xero/tokens.ts`, `src/lib/xero/crypto.ts` | Working |
| 14 | Auto-sync on connect (1-click flow) | Integration | `src/app/api/xero/callback/route.ts` → `runFullSync` | Working |
| 15 | Org accounting config pull (FY end, currency, VAT) | Integration | `src/lib/xero/org-config.ts` | Working |
| 16 | Onboarding-aware OAuth redirect | UX | `src/app/api/xero/callback/route.ts` | Working |
| 17 | AI interview — 4-stage conversational engine | AI | `src/lib/interview/engine.ts` | Working |
| 18 | AI interview — stage prompt system | AI | `src/lib/interview/prompts.ts` | Working |
| 19 | AI interview — financial context injection | AI | `src/lib/interview/engine.ts` → `loadFinancialContext` | Working |
| 20 | AI interview — business scan context injection | AI | `src/lib/interview/engine.ts` → `loadBusinessScan` | Working |
| 21 | AI interview — opening message generation | AI | `src/lib/interview/engine.ts` → `generateOpeningMessage` | Working |
| 22 | AI interview — stage transition detection (`[STAGE_COMPLETE]`) | AI | `src/lib/interview/engine.ts` | Working |
| 23 | AI interview — skip stage | Workflow | `src/lib/interview/engine.ts` → `skipStage` | Working |
| 24 | AI interview — message persistence | Persistence | `interview_messages` table | Working |
| 25 | AI interview — resume in-progress session | UX | `src/app/(onboarding)/welcome/interview/page.tsx` | Working |
| 26 | Interview completion — profile extraction | AI | `src/lib/interview/engine.ts` → `extractBusinessProfile` | Working |
| 27 | Interview completion — structured JSON profile | Data | `business_context_profiles` table | Working |
| 28 | Interview completion — KPI/dashboard/playbook recommendations | AI | `src/lib/interview/recommendations.ts` | Working |
| 29 | Interview completion — blueprint matching | AI | `src/lib/interview/blueprint-matcher.ts` | Working |
| 30 | Interview completion — Knowledge Vault auto-store | Integration | `src/app/api/interview/[orgId]/complete/route.ts` | Working |
| 31 | Interview profile API (GET) | API | `src/app/api/interview/[orgId]/profile/route.ts` | Working |
| 32 | Interview status API (GET) | API | `src/app/api/interview/[orgId]/status/route.ts` | Working |
| 33 | Account mapping — AI auto-map (Haiku, governed) | AI | `src/lib/staging/account-mapper.ts` → `autoMapAccounts` | Working |
| 34 | Account mapping — blueprint apply (3 blueprints) | Data | `src/lib/staging/account-mapper.ts` → `applyBlueprintMappings` | Partial |
| 35 | Account mapping — immutable audit history | Governance | `account_mapping_history` table | Working |
| 36 | Account mapping — confidence scores + reasoning | AI | `src/lib/staging/account-mapper.ts` | Working |
| 37 | Staging pipeline — transaction staging | Data | `src/lib/staging/pipeline.ts` | Working |
| 38 | Staging pipeline — cross-source matching | Data | `src/lib/staging/pipeline.ts` | Working |
| 39 | Onboarding progress indicator (3-step) | UX | `src/components/onboarding/onboarding-progress.tsx` | Working |
| 40 | Onboarding layout (auth guard + completion redirect) | UX | `src/app/(onboarding)/layout.tsx` | Working |
| 41 | Connect page (Xero status aware) | UX | `src/components/onboarding/onboarding-connect-client.tsx` | Working |
| 42 | Complete page (setup summary + agent activity) | UX | `src/components/onboarding/onboarding-complete-client.tsx` | Working |
| 43 | Onboarding complete API (marks flag) | API | `src/app/api/onboarding/complete/route.ts` | Working |
| 44 | Onboarding skip API | API | `src/app/api/onboarding/skip/route.ts` | Working |
| 45 | Setup agent activity display (hardcoded) | UX | `src/components/onboarding/onboarding-complete-client.tsx` | Stub |
| 46 | Activation roadmap preview | UX | `src/components/onboarding/onboarding-complete-client.tsx` | Partial |
| 47 | Celebration animation | UX | `src/components/ui/celebration.tsx` | Working |
| 48 | Step skippable at every stage | UX | All interview + connect pages | Working |
| 49 | Deterministic seeded random for demo data | Data | `src/lib/demo/generate-demo-data.ts` | Working |
| 50 | Industry cost profiles (10 industries) | Data | `src/lib/demo/generate-demo-data.ts` | Working |

---

## Benchmark Tables

### 1. Two-Path Onboarding (Demo vs Full Setup)

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Presents two clear paths on the welcome screen: "Explore with sample data" (~2 min demo) vs "Set up with your real data" (recommended full flow). Each card shows time estimate, feature list, and a distinct CTA. |
| **What it's trying to achieve** | Remove the "I have to connect my accounting software to see anything" barrier. Let skeptical users see value before committing to the full setup. |
| **Who needs it** | New signups evaluating Grove before committing; advisors building a demo for a client; users not yet on Xero. |
| **Best in class** | **Fathom HQ** — 14-day free trial with pre-loaded sample company data. No connection required to see a live dashboard. The sample data is high quality: a real-looking tech company with 24 months of financials, full KPI suite, and scenario comparisons. Users can immediately click into any KPI, drill down into chart of accounts, and build a report — without touching their real data. Time to first value: under 60 seconds. The trial conversion is driven by "Ah, my data would look this good." |
| **Runner up** | **Mosaic** — "Start free" with guided product tour before requiring data connection. Runway also uses this pattern: interactive sandbox from first login. |
| **Current Advisory OS state** | **Working — structurally sound, execution needs polish.** The two-path card UI is clean and clearly differentiated. The demo path collects company name + industry (required) plus optional team size, revenue range, website, and social URL. The full setup path shows a business scan form before routing to Xero connect. Both cards show estimated time and a feature list. The "Recommended" badge on Full Setup path is appropriate. The free tier offer ("1 month free on any plan") is a solid conversion hook. |
| **Gaps vs competitors** | (1) Demo path requires form input (company name + industry) before generating anything — Fathom shows data immediately with zero friction. (2) No sample company pre-loaded for instant exploration without any input. (3) The "included free with every account" grid at the bottom of the choice screen lists items that are not live (e.g., "Free AI Stack Audit") — this risks destroying credibility if users look for them. (4) No preview/teaser of what the dashboard looks like before choosing a path. (5) The full setup path shows business scan before Xero connect — but the step order in `onboarding-connect-client.tsx` sends users to `/welcome/interview` after connect, not back to the scan, which can create confusion about whether the scan data was used. (6) No A/B test or funnel analytics capability built in. |
| **Time to first value** | Demo path: ~90 seconds (form fill + generation). Full path: ~15 minutes minimum. Competitors average 60 seconds for demo, 5–10 minutes for full. |
| **Non-finance user test** | **4/5** — Two-card layout is intuitive. The "~2 min" and "~15 min" badges are exactly the right cues. Drop: path confusion between welcome scan and the connect/interview step order. |
| **Build recommendation** | **FIX** — Add a pre-loaded "no input required" instant demo option as a third micro-option ("See a live example" with one click). Fix the step order confusion. Audit the free-tier claims for accuracy. |
| **Priority** | **P1** — High impact on conversion and first impressions. |
| **Defensibility** | Low on demo path (table stakes). High on full path (governed setup with immutable audit trail is unique). |

---

### 2. Business Scan (Website Intelligence)

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Takes a website URL and/or plain-text description, fetches the homepage (SSRF-protected), strips HTML, passes up to 8,000 characters to Claude Sonnet, and extracts 13 structured fields: company name, industry, business type, target market, products/services, value proposition, estimated stage, estimated team size, key differentiators, potential challenges, suggested KPIs, suggested modules, and conversation starters. Stored on `organisations.business_scan`. Injected into both the interview prompt and the interview opening message. |
| **What it's trying to achieve** | Eliminate the "cold start" interview problem. Instead of asking "what does your business do?" as question 1, the AI opens with specific, pre-researched context: "I can see you're building a SaaS platform for legal teams — your homepage mentions document automation. Tell me about the subscription model..." |
| **Who needs it** | All users taking the full setup path. Primarily benefits the AI interview quality. |
| **Best in class** | No direct competitor has a pre-interview website scan as part of onboarding. **Kevin Steel (Inflectiv Intelligence)** comes closest with his "smart template" approach that pre-populates assumptions from company data. **DataRails** has an onboarding wizard that asks for industry/segment to configure the platform, but no AI scan. The closest pattern in adjacent SaaS: **Clearbit Enrichment** / **Apollo.io** for lead enrichment — auto-populate company data from website URL. |
| **Current Advisory OS state** | **Working — genuinely differentiated.** The SSRF protection is correct (blocks localhost, private IPs, AWS metadata endpoint). The 10-second timeout prevents hangs. HTML stripping and 8,000-character truncation are sensible. The 13-field output schema is well-designed, particularly `conversation_starters` (personalised questions for the AI to ask). Scan result shown to user with company name, business type, and industry before routing to next step — good confidence signal. Graceful fallback on scan error (continues to interview without scan). |
| **Gaps vs competitors** | (1) Scan is triggered only on the full setup path, not on the demo path — but the demo path also accepts a `websiteUrl` field that is passed to `generateAllDemoData` but is NOT used in `generateDemoProfile` unless the LLM call succeeds. The `INDUSTRY_TEMPLATES` fallback ignores website content entirely, so the demo path's website field has no real effect when LLM fails. (2) No retry or re-scan capability — if the scan fails at onboarding, users cannot re-trigger it later from Settings. (3) `conversation_starters` are extracted from the scan but there is no verification that the interview engine actually uses them in subsequent questions (the `formatBusinessScan` function formats them as "Suggested Questions" in the system prompt, but the AI is not explicitly instructed to use them as question 1, 2, 3). (4) The scan uses `claude-sonnet-4-20250514` directly via `new Anthropic()` rather than through the `callLLM` wrapper — this bypasses the governance checkpoint (`governedOutput`), unlike account mapping and recommendations which both call `governedOutput`. (5) No data freshness — scan is run once at onboarding and never updated, so if the business pivots, the profile becomes stale. |
| **AI opportunity** | High — the scan is already differentiated. The gap is using scan results more aggressively downstream: pre-populating the benchmark stage of the interview with industry-specific KPI suggestions, pre-configuring the dashboard template, and persisting the scan as a Knowledge Vault entry. |
| **Non-finance user test** | **4/5** — The animated scanning state (three pulsing dots: "Analysing products and services", "Identifying industry", "Tailoring questions") is excellent UX. The success confirmation showing company name + business type + industry is credible. |
| **Build recommendation** | **ENHANCE** — Route scan through `callLLMWithUsage` + `governedOutput` for audit trail consistency. Use scan data in demo path LLM generation. Add re-scan capability in Settings. Verify `conversation_starters` are prioritised in the opening message instruction. |
| **Priority** | **P1** — Already differentiated; governance gap is a compliance risk. |
| **Defensibility** | **High** — No competitor runs pre-interview website intelligence at this level of structure. Combined with financial context injection, this creates a personalised advisor experience that DataRails and Fathom cannot replicate without significant AI investment. |

---

### 3. AI Interview Engine (4-Stage Conversational Onboarding)

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Four-stage conversational interview driven by Claude: Stage 1 — Business Model Confirmation (confirms what the numbers show, explores revenue model, seasonality, key clients, stage). Stage 2 — Goals & Priorities (12-month goals, biggest challenges, success definition). Stage 3 — Contextual Enrichment (team structure, customer concentration, competitive positioning, risk tolerance). Stage 4 — Benchmarking Baseline (target margins, growth rate, burn tolerance, runway requirements, custom KPIs). Stage transitions detected via `[STAGE_COMPLETE]` token in AI response. Conversation persisted to `interview_messages`. Financial context (12 months of Xero data) and business scan injected into every stage's system prompt. On completion, transcript extracted to structured `BusinessContextProfile` JSON (22 fields). Recommendations generated for KPIs, dashboard template, and playbook modules. Blueprint matched by industry. Auto-stored to Knowledge Vault. |
| **What it's trying to achieve** | Replace generic onboarding forms with a senior-advisor conversation that extracts the business context needed to make every downstream platform output genuinely personalised. |
| **Who needs it** | All users on the full setup path (primary). Can be re-done post-onboarding for profile updates. |
| **Best in class** | No FP&A competitor has a conversational AI onboarding interview. The closest pattern is **Notion AI** onboarding (adaptive setup questions), **Intercom** onboarding (branching questions based on role), and **Clay** (AI research on contact before outreach). In FP&A, **Fathom HQ** has a structured setup wizard (not conversational) but does manually ask for goals and KPI preferences. **DataRails** has a 4–6 week implementation process with a human consultant — the AI interview is effectively automating what a consultant does in the first discovery call. |
| **Current Advisory OS state** | **Working — genuinely category-defining.** The 4-stage prompt design is excellent: each stage has a specific goal, references financial data, and enforces style rules (no em dashes, 2–4 paragraphs, UK currency). The dual context injection (financial summary + business scan) means the AI opens with specific, grounded observations. Stage transition detection via text token is simple but effective. Resume capability (in-progress interview reloads on refresh). Skip at any stage preserves progress. |
| **Gaps vs competitors** | (1) The interview is placed AFTER the Xero connect step in the connect page (`onboarding-connect-client.tsx` routes to `/welcome/interview` after connect) but is shown BEFORE the connect step in the progress indicator (Step 1: Business Profile, Step 2: Connect Xero). This contradiction in step order is architecturally confused — in `welcome-client.tsx` the full setup path goes: scan → `/welcome/connect`, while the connect page routes to `/welcome/interview`. The intended order is not clear from the code. (2) The `STAGE_COMPLETE` detection is a text string match — fragile if the model appends extra text before the token. No structured output or function calling is used. (3) No progress bar within the interview itself — users don't know how far through the 4 stages they are (the progress indicator shows overall onboarding steps, not interview stage progress). (4) No in-interview edit capability — if the AI misunderstands an answer, users cannot go back and correct stage 1 without restarting. (5) No confidence-gated profile extraction — if the interview was skipped or very short, `extractBusinessProfile` is called on minimal messages and may produce low-quality results. (6) The interview stage system prompts do not enforce a minimum exchange count before allowing `[STAGE_COMPLETE]` — the AI could theoretically mark a stage complete after 1 exchange if it decides it has enough information. (7) The `temperature: 0.5` for the main conversation and `0.1` for extraction is appropriate, but `callLLMConversation` doesn't appear to specify a model — it defaults to whatever the LLM wrapper's default is, which should be verified against `claude-sonnet-4-6` per CLAUDE.md. (8) Business profile fields like `team_size` (expected as `number | null`) may not type-check correctly as the extraction prompt describes it as "number or null" but the JSON output from Claude may produce a string like "5-10 people" which would fail silently. |
| **AI opportunity** | Very High — The interview is the primary mechanism for filling the Semantic Intelligence Layer. Better profile completeness directly improves every downstream AI output (scenarios, KPI commentary, narrative). Priority enhancements: enforce minimum exchanges per stage, add in-interview progress indicator, add profile completeness score on completion. |
| **Non-finance user test** | **4/5** — The conversational format is excellent for non-finance users. The advisory tone (warm, references specific numbers, short sentences) is well-crafted. Drop: no stage progress visibility within the chat, no "you're on step 2 of 4" indicator. |
| **Token efficiency** | Stage prompts: ~1,500–2,500 tokens each (financial summary + scan context + instructions). Conversation history grows with each message. Estimated per-interview cost: ~£0.03–£0.08 for a full 4-stage conversation using Sonnet. Profile extraction: additional ~£0.01–£0.02. Recommendations (Haiku): ~£0.002. Total per onboarding: ~£0.04–£0.10. Very acceptable. |
| **Build recommendation** | **ENHANCE** — Fix step order confusion. Add per-stage progress indicator inside chat. Enforce minimum 2–3 exchanges per stage before allowing `[STAGE_COMPLETE]`. Add structured output / JSON mode to stage prompts to remove fragility. Validate `team_size` extraction type. |
| **Priority** | **P0** — This is the Semantic Intelligence Layer feed. Every platform output that is "personalised to this business" depends on interview quality. |
| **Defensibility** | **Very High** — No FP&A competitor has this. Combined with financial context injection and the governed extraction pipeline, this is a structural moat. DataRails charges for 4–6 weeks of human implementation. Grove does it in 10 minutes with AI. |

---

### 4. Demo Data Generation

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Generates a complete dataset for demo mode: 14-account chart of accounts (revenue, COGS, expenses, overheads); 12 months of normalised financial line items with seasonal variation, growth trend, and ±10% randomness seeded by `orgId + companyName`; 8 KPI types per month (revenue, margins, cash runway, burn rate, growth); budget lines at 105% revenue / 95% cost of actuals; a business profile description via LLM (with industry template fallback). Uses deterministic seeded random so the same inputs always produce the same data. 10 industry cost profiles map percentage splits across revenue and 6 cost categories. Revenue ranges scale from £30k/year (pre-revenue) to £15M/year (10M+). |
| **What it's trying to achieve** | Let users see a working, credible dashboard in under 2 minutes without connecting any real data. The data should feel realistic for their industry, not generic. |
| **Who needs it** | New signups evaluating Grove; advisors building client demonstrations; sales demos. |
| **Best in class** | **Fathom HQ** — Pre-loaded "Mountain Pine Furniture" sample company with 24 months of real-looking data. Includes variance against budget, multiple KPIs, narrative commentary. The sample company is a manufacturing business — specific enough to feel real. **Runway** — Interactive sandbox from first login with a SaaS company model, showing MRR, ARR, headcount plan, and runway chart. Updating any assumption immediately cascades through the full model in real-time. **DataRails** — No public demo mode; requires sales conversation first. |
| **Current Advisory OS state** | **Working — good foundations, some credibility gaps.** The deterministic seeding approach is smart: same user always sees the same data (consistency builds trust). Industry cost profiles are well-researched (technology at 20% COGS vs retail at 55% COGS is accurate). The seasonal factor array `[0.90, 0.88, 0.95, 1.0, 1.02, 0.92, 0.85, 0.88, 1.0, 1.08, 1.15, 1.10]` is reasonable for a generic business. LLM-generated business profiles with industry template fallback is a nice touch. The loading state with 6 progressive steps is excellent UX. |
| **Gaps vs competitors** | (1) No demo scenario data generated — the demo path creates financial data and KPIs but the `generateAllDemoData` function does not appear to create any scenario records, meaning the Scenarios module would be empty in demo mode. (2) No playbook module content — similarly, the playbook appears empty. (3) No knowledge vault entries pre-seeded for demo. (4) The `cash_runway` KPI is generated as a random value (`3 + rand() * 9 months`) rather than being calculated from the generated financial data — this means runway could show 11 months while the P&L shows healthy profitability, which is confusing. (5) Company name is used in financial data generation but NOT in the chart of accounts names — all demo companies get generic account names ("Sales Revenue", "Staff Costs") regardless of industry. A technology company should show "SaaS Subscription Revenue", not "Sales Revenue". (6) The demo path upgrade flow (`/api/onboarding/upgrade`) resets `has_completed_onboarding` to false and `onboarding_mode` to 'full' — but does not clear the demo financial data. Users upgrading from demo to full would see demo data alongside (or replaced by) real Xero data, which needs careful handling. (7) The `generateDemoProfile` LLM call uses `callLLM` but the `INDUSTRY_TEMPLATES` fallback is hardcoded with fixed text that may not match the company name the user provided — users named "Acme Ltd" would get profile text referencing "A technology company" with no mention of their actual name. |
| **AI opportunity** | High — Use the scan result (from the demo path's optional website URL field) to personalise the LLM profile generation. Generate one scenario ("Revenue Growth 15%") automatically in demo mode. Pre-seed 3 Knowledge Vault entries with industry-specific insights. |
| **Non-finance user test** | **4/5** — The 6-step loading animation with checkmarks is one of the best moments in the onboarding. The data quality is credible enough. Drop: the cash_runway miscalculation and the generic account names reduce credibility for users who notice. |
| **Build recommendation** | **FIX** — Calculate `cash_runway` from actual generated data. Generate one default scenario in demo mode. Personalise chart of accounts names by industry. Fix the demo upgrade flow to either archive or clear demo data. Use website scan results in demo profile generation. |
| **Priority** | **P1** — Demo mode is a conversion-critical path. Credibility issues directly reduce sign-up-to-paid conversion. |
| **Defensibility** | Medium — The deterministic industry-specific generation is a better pattern than generic demo data. The main differentiator is industry cost profiles + LLM personalisation. |

---

### 5. Xero OAuth Connection Flow

| Dimension | Assessment |
|-----------|------------|
| **What it does** | GET `/api/xero/connect` generates a CSRF state (base64url-encoded JSON with `orgId` + `nonce`), validates Xero credentials are configured, and redirects to Xero's consent URL. GET `/api/xero/callback` validates state, exchanges code for tokens, fetches tenant connections, stores encrypted tokens (`AES` encryption via `crypto.ts`), pulls org accounting config (financial year end, base currency, VAT scheme), auto-triggers `runFullSync`, then redirects to `/welcome/connect?success=true&tenant=...` if still in onboarding. |
| **What it's trying to achieve** | Frictionless 3-click Xero connection: click Connect → authorise on Xero → return to Grove with data already syncing. No manual setup required. |
| **Who needs it** | All users on the full setup path; returning users reconnecting after token expiry. |
| **Best in class** | **Fathom HQ** — described in reviews as "2-click Xero setup". Standard OAuth flow but with immediate data availability. Fathom also handles multi-tenant Xero (multiple organisations under one Xero login) with a tenant picker. **Syft Analytics** (now Xero-native) has the closest integration: connection is part of the Xero interface itself. |
| **Current Advisory OS state** | **Working — security-correct, UX good.** CSRF prevention via state nonce is correct. AES token encryption at rest is appropriate. Auto-sync on callback is the right pattern ("1-click flow" as documented in comments). The onboarding-aware redirect (back to `/welcome/connect` if `has_completed_onboarding` is false) is a thoughtful touch. Org accounting config pull (financial year end, base currency, VAT) is excellent — this feeds the Semantic Intelligence Layer with the correct fiscal year boundaries. The error routing for missing credentials, insufficient role, and unexpected errors is clean. |
| **Gaps vs competitors** | (1) No multi-tenant picker — the callback always picks `connections[0]` (first Xero organisation). If a user has multiple Xero organisations, they cannot choose which one to connect. (2) No connection health check on the connect page — the connect page checks `xero_connections` for existence but does not verify the token is still valid. A user with an expired, revoked, or broken connection would see "Xero Connected" incorrectly. (3) No token refresh displayed to user — the connect page shows the tenant name from the database but if the sync is still running, users are not informed. (4) No scopes displayed — users are not shown what data Grove will access during the OAuth consent (this is typically handled on the Xero consent screen, but Grove has no pre-consent explanation of data scope beyond the privacy message). (5) The `sync_warning` parameter in the callback redirect is passed as a URL param but the connect page (`onboarding-connect-client.tsx`) does not read or display it — sync errors during onboarding are silently swallowed. (6) The callback redirects to `/xero?${params}` for post-onboarding reconnects, which is correct, but if `has_completed_onboarding` throws an exception on the column-not-existing check, it defaults to the non-onboarding redirect — meaning users mid-onboarding could be sent to the wrong page. |
| **Non-finance user test** | **4/5** — "Your data stays private" messaging with shield icon is well-positioned. The 3-step "how it works" list is clear. The connect button is prominent. Drop: no indication of what data is being accessed; no multi-tenant support. |
| **Build recommendation** | **FIX** — Add multi-tenant picker when `connections.length > 1`. Display `sync_warning` on the connect page. Add connection health check (token validity) before showing "Xero Connected". Add pre-consent data scope explanation. |
| **Priority** | **P1** — Multi-tenant gap will block enterprise and accounting practice users who have multiple Xero organisations. |
| **Defensibility** | Low (table stakes). The differentiator is the auto-sync + org config pull in one callback, combined with encrypted storage — but the multi-tenant gap is a functional blocker. |

---

### 6. Account Mapping (AI-Governed Semantic Layer)

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Takes Xero chart of accounts entries (code, name, type, class), passes them to Claude Haiku with the unified taxonomy context (STANDARD_CATEGORIES), returns JSON array of `{code, category, confidence, reasoning}`. Upserts to `account_mappings` table with `ai_suggested: true`, `ai_confidence`, `ai_reasoning`, `user_confirmed: false`. Every mapping change (auto, manual, blueprint, bulk_confirm) is logged to immutable `account_mapping_history` with `previous_category`, `new_category`, `change_source`, `confidence`, `reasoning`. Governance checkpoint via `governedOutput`. Three hardcoded blueprints: `saas`, `ecommerce`, `professional-services`. Heuristic fallback via `classToDefaultCategory` if LLM fails. |
| **What it's trying to achieve** | Ensure every Xero account is correctly categorised into the platform's standard taxonomy before any financial calculation runs, with full auditability of how mappings were determined and changed. |
| **Who needs it** | Auto-triggered during `runFullSync` (post-Xero connect). Can be manually applied via blueprint. |
| **Best in class** | **DataRails** — "Mapping & Normalisation" layer described as a core feature: maps ERP accounts to a normalised structure, handles multiple charts of accounts across entities. Uses a combination of rules-based and ML-driven mapping. The key advantage: human-in-the-loop review screen showing confidence scores, with one-click approval or override. **Fathom HQ** — Maps Xero P&L to its own internal category structure (Operating Revenue, COGS, Operating Expenses, etc.) with a visual mapping review screen. Users can override any mapping and see the effect on financial statements immediately. |
| **Current Advisory OS state** | **Working — governance layer is best-in-class.** The immutable history table with `change_source` is more auditable than any competitor. The `governedOutput` checkpoint creates an audit trail that would satisfy SOC 2 requirements. The heuristic fallback prevents silent failure. The Haiku model choice for mapping is cost-efficient and appropriate (this is a classification task, not a reasoning task). |
| **Gaps vs competitors** | (1) Only 3 blueprints (`saas`, `ecommerce`, `professional-services`) — the 10-industry demo generator has broader coverage. Users in hospitality, construction, healthcare, education, fashion, and "other" fall through to pure LLM mapping with no blueprint safety net. (2) No user-facing mapping review UI described in the audit scope — the `account_mappings` table and `account_mapping_history` table are well-structured, but there is no UI in the onboarding flow showing users their mappings for review or approval. `user_confirmed` is stored but never set to `true` during onboarding. (3) The blueprint `applyBlueprintMappings` function has only account codes `200–730` which may not match the actual Xero chart of accounts for a real client (Xero account codes are user-configurable and typically follow a 4-digit NZ/AU/UK convention like 1000–9999, not 200–730). (4) The `getAccountMappings` function queries `source_account_code` (ascending) but the `account_mappings` table insert uses `account_id` not `code` — this column name mismatch may cause silent errors. (5) No bulk re-mapping trigger if the user notices incorrect mappings — there is no `POST /api/onboarding/remap` or equivalent. |
| **Non-finance user test** | **N/A** — This is invisible to users during onboarding (runs as part of sync). The "Mapped 47 Xero accounts to platform categories" message on the complete page is the only user-facing signal — and this is hardcoded ("47 accounts") rather than reflecting the actual mapped count. |
| **Build recommendation** | **BUILD** — Create an account mapping review screen (post-Xero connect, pre-interview) showing the AI's suggested mappings with confidence scores and a "Confirm all / Edit individually" flow. Expand blueprints to 7+ industries. Fix the hardcoded account code ranges in blueprints. Fix the column name mismatch. Show real mapped count on the complete page. |
| **Priority** | **P1** — Mapping correctness is the foundation of the Semantic Intelligence Layer. Silent incorrect mappings corrupt all downstream KPI calculations. |
| **Defensibility** | **Very High** — The immutable audit trail with `change_source`, `confidence`, `reasoning`, and `governedOutput` is architecturally ahead of all 10 competitors. DataRails has review screens but no immutable history. Fathom has overrides but no audit trail of mapping changes. |

---

### 7. Onboarding Step Flow and Navigation Architecture

| Dimension | Assessment |
|-----------|------------|
| **What it does** | The onboarding layout (`layout.tsx`) guards all pages under `/(onboarding)`, checks `has_completed_onboarding`, and redirects to `/dashboard` if already done. A 3-step progress indicator (`Business Profile` → `Connect Xero` → `Dashboard`) is shown on interview, connect, and complete pages. Each page has a skip option. The intended full-setup flow is: `/welcome` → scan → `/welcome/connect` (Xero) → `/welcome/interview` → `/welcome/complete` → `/dashboard`. The intended demo flow is: `/welcome` → `/welcome/demo` → `/dashboard`. |
| **What it's trying to achieve** | Guide users from signup to first dashboard view in the shortest credible time, with clear progress visibility and escape hatches at every step. |
| **Best in class** | **Fathom HQ** — Linear wizard with 4 steps, visual progress bar, estimated time per step. Step names match what the user expects to do. Can go back to any step. Step completion is immediate (e.g., clicking "Connect Xero" and completing OAuth counts as step done, no confirmation screen required). **Mosaic** — Checklist-style setup ("6 steps to get started") that persists on the dashboard as a sidebar widget until all steps are complete. Users can complete steps in any order. Progress percentage shown. |
| **Current Advisory OS state** | **Partial — structural confusion between intended and actual flow.** The welcome page's full setup path routes to `/welcome/connect` (skipping the interview), but the `OnboardingConnectClient` routes to `/welcome/interview` AFTER connect — meaning the actual order is: scan → connect → interview. However, the `OnboardingProgress` indicator on the interview page shows "Step 1: Business Profile" as the current step, with "Connect Xero" as step 2. This means users are told they're on step 1 (Business Profile) but they already completed what the UI labels step 2 (Connect Xero). The step labels and the actual routing sequence are inverted. |
| **Gaps vs competitors** | (1) Step order inversion: the progress indicator says "1: Business Profile → 2: Connect Xero" but the actual flow is connect → interview. This is the single most significant UX bug in the onboarding. (2) No "go back" from the connect page to the scan form — the back button on the connect page routes to `/welcome/interview`, not to the scan form. (3) The complete page shows hardcoded "Mapped 47 Xero accounts" and "Generated budget baselines from 12 months of data" — these are static strings, not live results. If Xero was not connected (user skipped), these lines still show as completed checkmarks. (4) The `OnboardingProgress` step 3 is labelled "Dashboard" with description "Explore your command centre" — this is not a step a user takes, it is a destination. It should be renamed to "Review setup" or similar. (5) No progress persistence across browser sessions — if a user starts onboarding and closes the browser, the progress indicator resets, though the database state correctly resumes the interview. (6) The onboarding layout's fallback for the `has_completed_onboarding` column check (`catch → proceed with onboarding`) means a database error silently keeps users in onboarding instead of showing an error. |
| **Build recommendation** | **FIX** — Reverse the step order in the progress indicator to match the actual routing sequence (1: Connect Xero → 2: Business Profile → 3: Dashboard). OR fix the routing to match the indicator (scan → interview → connect → complete). Either is acceptable; the inconsistency must be resolved. Fix hardcoded complete page signals to use real data. Rename Step 3. |
| **Priority** | **P0** — Step order confusion is a first-session trust issue. Users who notice the mismatch will lose confidence in the platform's coherence. |

---

## Competitive Feature Matrix

| Capability | Grove | Fathom HQ | DataRails | Runway | Mosaic | Kevin Steel |
|-----------|-------|-----------|-----------|--------|--------|-------------|
| Two-path onboarding (demo + real) | YES | Partial (trial only) | NO | YES | YES | NO |
| Pre-loaded demo data (zero input) | NO | YES | NO | YES | YES | NO |
| Website scan before interview | YES | NO | NO | NO | NO | NO |
| Conversational AI interview | YES | NO | NO | NO | NO | NO |
| Financial context injection into interview | YES | NO | NO | NO | NO | NO |
| Structured profile extraction (22 fields) | YES | NO | NO | NO | NO | NO |
| KPI recommendation from interview | YES | NO | NO | NO | NO | NO |
| Dashboard template recommendation | YES | NO | NO | NO | NO | NO |
| Blueprint matching by industry | YES | NO | NO | NO | NO | NO |
| Xero OAuth (standard) | YES | YES | NO | NO | NO | YES |
| Auto-sync on connect (1-click) | YES | YES | NO | N/A | N/A | Partial |
| Org accounting config pull (FY/VAT) | YES | Partial | NO | N/A | N/A | NO |
| Multi-tenant Xero picker | NO | YES | NO | N/A | N/A | NO |
| AI account mapping with confidence scores | YES | NO | Partial | N/A | N/A | NO |
| Immutable account mapping history | YES | NO | NO | N/A | N/A | NO |
| Industry cost profiles for demo data | YES | NO | NO | NO | NO | NO |
| Demo-to-full upgrade path (API) | YES | N/A | N/A | YES | YES | N/A |
| Onboarding complete redirect guard | YES | YES | N/A | YES | YES | YES |
| Interview resume on refresh | YES | N/A | N/A | N/A | N/A | N/A |
| Pre-consent data scope explanation | NO | Partial | N/A | N/A | N/A | NO |
| Mapping review UI (user-facing) | NO | YES | YES | N/A | N/A | NO |
| Setup checklist persists to dashboard | NO | NO | NO | YES | YES | NO |

---

## Gap Analysis

### Critical Gaps (P0 — Fix Before Any External Demo)

**GAP-C1: Step Order Inversion in Progress Indicator**
The `OnboardingProgress` component labels Step 1 as "Business Profile" and Step 2 as "Connect Xero", but the actual routing sequence delivers Connect Xero before Business Profile. Users who complete the Xero connect and are then shown "You're on step 1: Business Profile" will be confused. This is the highest-trust-risk bug in the platform.
- Location: `src/components/onboarding/onboarding-progress.tsx`, `src/components/onboarding/onboarding-connect-client.tsx`, `src/app/(onboarding)/welcome/page.tsx`
- Fix: Align the progress indicator step order with the actual routing sequence. Decision required: should the correct order be Connect → Interview, or Interview → Connect? Both are defensible, but Connect → Interview is preferred because it lets the interview reference real financial data from the very first question.

**GAP-C2: Complete Page Shows Hardcoded Agent Activity**
The "Your Setup Agent is configuring your platform" section on the complete page shows three hardcoded strings: "Mapped 47 Xero accounts", "Generated budget baselines from 12 months of data", "Data quality score: 82/100". These are static regardless of whether Xero was connected, how many accounts were actually mapped, or what the real data quality score is. If Xero was skipped, this still shows as completed — actively misleading the user.
- Location: `src/components/onboarding/onboarding-complete-client.tsx` lines 131–143
- Fix: Replace with real values from the sync result. Pass `syncResult` through the complete flow, or fetch from API on load. If Xero not connected, show pending state.

**GAP-C3: `[STAGE_COMPLETE]` Token Detection is Fragile**
The stage transition mechanism relies on a string match `response.includes('[STAGE_COMPLETE]')`. If the model outputs the token mid-sentence, wraps it in punctuation, or emits it with a lowercase variation, the stage will not advance. There is no minimum exchange enforcement — a highly efficient AI response after one user message could trigger `[STAGE_COMPLETE]`, producing a 1-exchange interview stage which yields insufficient profile data.
- Location: `src/lib/interview/engine.ts` lines 56–65
- Fix: Use Claude's JSON mode or structured output for stage responses. Include a `stage_complete: boolean` field in the JSON envelope. Enforce `min_exchanges: 3` per stage before allowing completion.

---

### Significant Gaps (P1 — Fix Before General Availability)

**GAP-S1: No Zero-Input Demo Option**
All competitors with demo modes (Fathom, Runway, Mosaic) show data immediately with zero friction. Grove's demo requires company name + industry before generating anything. While this produces better-personalised data, it adds a friction step that will reduce conversion for users who just want to "look around." A pre-loaded "Grove Demo Company" with all 10 industries pre-generated would let users bypass this.
- Impact: Demo conversion rate.
- Fix: Pre-generate one demo dataset per industry and serve it as a "Quick preview" option with a single button click.

**GAP-S2: No Multi-Tenant Xero Picker**
`connections[0]` is used in the callback with no user choice. Any accounting practice connecting on behalf of a client, or any business owner with multiple Xero organisations (e.g., multiple companies), is silently connected to the wrong organisation.
- Location: `src/app/api/xero/callback/route.ts` line 107
- Fix: If `connections.length > 1`, redirect to a tenant picker page before storing tokens.

**GAP-S3: No Account Mapping Review UI**
The AI maps accounts automatically, but users have no way to see, verify, or correct these mappings during onboarding. `user_confirmed` is stored as `false` for all auto-mapped accounts, but there is no UI to set it to `true`. This means the platform always operates on unconfirmed mappings. In accounting, a miscategorised account (e.g., a director loan mapped to "revenue") can corrupt every financial statement.
- Impact: Data integrity and advisor trust.
- Fix: Add a post-connect mapping review screen (before the interview) showing all AI-suggested mappings with confidence scores, colour-coded: green (confidence > 0.8), amber (0.5–0.8), red (< 0.5). Bulk confirm or individually edit. This is what Fathom and DataRails both do.

**GAP-S4: Scan Does Not Route Through Governance Checkpoint**
The website scan in `/api/onboarding/scan/route.ts` calls `new Anthropic()` directly, bypassing the `callLLMWithUsage` wrapper and the `governedOutput` audit trail. This is inconsistent with account mapping (which correctly calls `governedOutput`) and with CLAUDE.md's requirement that all AI outputs be auditable.
- Location: `src/app/api/onboarding/scan/route.ts` line 115
- Fix: Replace with `callLLMWithUsage` and call `governedOutput` after successful scan.

**GAP-S5: Blueprint Coverage Only 3 of 10 Industries**
`applyBlueprintMappings` only covers `saas`, `ecommerce`, and `professional-services`. The demo generator supports 10 industries. Users in construction, hospitality, healthcare, education, fashion, and "other" have no blueprint safety net if LLM mapping fails.
- Location: `src/lib/staging/account-mapper.ts` lines 272–306
- Fix: Add blueprints for hospitality, construction, healthcare, education. These are high-volume SME sectors in the UK advisory market.

**GAP-S6: Demo Data Missing Scenarios and Playbook Content**
Demo mode generates financials, KPIs, and budgets — but not scenarios or playbook module content. A new user exploring demo mode would open the Scenarios tab and see an empty state, which undermines the "fully working dashboard" promise on the welcome screen.
- Location: `src/lib/demo/generate-demo-data.ts` → `generateAllDemoData`
- Fix: Generate one default scenario ("Revenue Growth 15%") and pre-populate one playbook module ("Financial Health Check") with demo results.

**GAP-S7: `sync_warning` Silently Dropped in Onboarding Redirect**
When Xero sync completes with errors, `sync_warning` is set as a URL parameter, but the onboarding redirect goes to `/welcome/connect?success=true&tenant=...` without the warning parameter. Users are shown a green "Xero Connected" success state even if sync failed.
- Location: `src/app/api/xero/callback/route.ts` lines 148–177
- Fix: Include `sync_warning` in the onboarding redirect URL and display it on the connect page.

**GAP-S8: Interview Step Order Ambiguity in Full Setup Path**
The welcome page's full-setup path goes `scan → /welcome/connect`, and the connect page then routes to `/welcome/interview`. This means the intended flow is scan → connect → interview. However, interview access without Xero data is also valid (financialContext returns null gracefully), and the progress indicator shows interview as step 1. The flow should be documented and enforced architecturally.
- Fix: Make the intended step order canonical. Either: (A) welcome → scan → interview → connect → complete, or (B) welcome → scan → connect → interview → complete. Option B is better because the interview is more valuable with real financial data.

---

### Minor Gaps (P2 — Quality of Life Improvements)

**GAP-M1: No Per-Stage Progress Indicator in Interview Chat**
Users see the 3-step onboarding progress bar but no indicator of which of the 4 interview stages they are on. A "Stage 2 of 4: Goals & Priorities" badge would reduce drop-off.

**GAP-M2: Demo Upgrade Flow Does Not Clear Demo Data**
`/api/onboarding/upgrade` resets `onboarding_mode` to 'full' and re-opens onboarding, but does not archive or flag demo financial data. After Xero connect, real data and demo data will coexist in `normalised_financials` with different sources. Filtering logic must be verified.

**GAP-M3: `cash_runway` Demo KPI is Random, Not Calculated**
The demo KPI for `cash_runway` is `3 + rand() * 9 months` rather than being calculated from the generated closing cash balance divided by monthly burn. This can produce contradictory signals (high cash runway alongside a loss-making P&L).

**GAP-M4: No Re-Scan Capability in Settings**
Once onboarding is complete, there is no way to re-scan the website or update the business scan data. If the business pivots, the `organisations.business_scan` becomes stale and the AI interview context remains incorrect.

**GAP-M5: Generic Chart of Accounts Names in Demo**
All demo companies get identical account names regardless of industry. "Sales Revenue" for a SaaS company should be "SaaS Subscription Revenue". This is a minor credibility issue but matters for advisors using demo mode with clients.

**GAP-M6: `team_size` Type Inconsistency**
The interview extraction prompt describes `team_size` as "number or null" but Claude may return it as a string in ambiguous cases ("around 10"). Downstream use of `profile.team_size` as a number would fail silently.

**GAP-M7: Hardcoded "1 month free on any plan" on Welcome Screen**
The full setup card promises "1 month free on any plan" as a benefit. If this is not a real offer, it is a misleading claim that could create legal/commercial issues at scale.

---

## Prioritised Recommendations

### P0 — Fix Immediately

| ID | Action | File(s) | Effort | Impact |
|----|--------|---------|--------|--------|
| R-P0-01 | Fix step order inversion: align progress indicator with actual routing (Connect first, Interview second) | `onboarding-progress.tsx`, `onboarding-connect-client.tsx`, `welcome-client.tsx` | S | Very High |
| R-P0-02 | Replace hardcoded complete page agent activity with real data (actual mapped count, real data quality score, conditional on Xero connection status) | `onboarding-complete-client.tsx`, add API call or prop passing | M | High |
| R-P0-03 | Replace `[STAGE_COMPLETE]` string detection with structured JSON output from Claude (use `response_format: { type: "json_object" }` or add `stage_complete: boolean` to stage prompt output schema) | `engine.ts`, all stage prompts | M | High |

### P1 — Fix Before General Availability

| ID | Action | File(s) | Effort | Impact |
|----|--------|---------|--------|--------|
| R-P1-01 | Add multi-tenant Xero picker when `connections.length > 1` | `xero/callback/route.ts` + new `welcome/xero-picker/page.tsx` | M | High |
| R-P1-02 | Build account mapping review screen post-connect (show AI suggestions + confidence + bulk confirm) | New page + `account-mapper.ts` + `verifyMapping` endpoint | L | Very High |
| R-P1-03 | Route website scan through `callLLMWithUsage` + `governedOutput` for audit trail consistency | `onboarding/scan/route.ts` | S | Medium |
| R-P1-04 | Expand `applyBlueprintMappings` to cover hospitality, construction, healthcare, education | `account-mapper.ts` | M | Medium |
| R-P1-05 | Generate default scenario + playbook content in `generateAllDemoData` | `generate-demo-data.ts` | M | High |
| R-P1-06 | Pass `sync_warning` through onboarding redirect and display on connect page | `xero/callback/route.ts`, `onboarding-connect-client.tsx` | S | Medium |
| R-P1-07 | Add zero-input demo option ("Quick Preview" with pre-generated data) | `welcome-client.tsx`, new pre-seed script | L | High |
| R-P1-08 | Enforce minimum exchange count (3) per interview stage before `[STAGE_COMPLETE]` is accepted | `engine.ts`, stage prompts | S | Medium |

### P2 — Quality Improvements

| ID | Action | File(s) | Effort | Impact |
|----|--------|---------|--------|--------|
| R-P2-01 | Add per-stage progress indicator inside interview chat (Stage 2 of 4) | `onboarding-interview-client.tsx`, `InterviewChat` component | S | Medium |
| R-P2-02 | Calculate `cash_runway` from actual generated financial data | `generate-demo-data.ts` | S | Low |
| R-P2-03 | Personalise demo chart of accounts names by industry | `generate-demo-data.ts` | S | Low |
| R-P2-04 | Add re-scan capability in Settings → Business Profile section | New settings endpoint + `onboarding/scan/route.ts` | M | Medium |
| R-P2-05 | Archive/flag demo data when upgrading to full setup | `onboarding/upgrade/route.ts` | S | Medium |
| R-P2-06 | Fix `team_size` extraction type validation (coerce to number in `extractBusinessProfile`) | `engine.ts` | S | Low |
| R-P2-07 | Audit the "1 month free on any plan" claim on welcome screen for accuracy | `welcome-client.tsx` | XS | Medium |
| R-P2-08 | Use website scan in demo profile generation (pass scan to `generateDemoProfile`) | `generate-demo-data.ts`, `onboarding/demo/route.ts` | S | Medium |
| R-P2-09 | Add connection health check (token validity) to connect page | `onboarding-connect-client.tsx`, new `/api/xero/status` endpoint check | S | Medium |

---

## Architectural Concerns

### AC-01: Interview Flow Is Not Architecturally Canonical

The intended onboarding path for full setup is nowhere explicitly documented in code. The routing is assembled from three separate components (`welcome-client.tsx` → `onboarding-connect-client.tsx` → back to interview) using `router.push` chains. There is no state machine, no flow configuration, and no single source of truth for "what order do steps happen in." This makes the step order inversion (GAP-C1) invisible to developers adding new steps. Any future sprint adding a step (e.g., a mapping review step) must manually update 3+ files.

**Recommendation:** Define the onboarding step sequence as a single configuration object (e.g., `ONBOARDING_STEPS: string[]`) consumed by both the routing logic and the progress indicator. This eliminates the possibility of step order divergence.

### AC-02: `has_completed_onboarding` and `onboarding_mode` Are Schema Instabilities

Both fields are accessed with `as any` casts and wrapped in try/catch blocks across layout, interview, connect, and complete pages. The comment "Column may not exist yet" appears 7 times across the onboarding codebase. This suggests these columns were added after the initial schema and the code has not been cleaned up to use typed schema queries. This creates silent bugs (failed database reads return undefined, which the catch block treats as "column doesn't exist" rather than a real error).

**Recommendation:** Migrate to typed Supabase client with explicit schema types for `organisations`. Remove all `as any` casts on these fields. Add a schema migration test that verifies the columns exist.

### AC-03: Demo Data and Real Data Coexist Without Clear Partition

Both demo and real financial data are stored in `normalised_financials` with a `source` field (`'demo'` vs `'xero'`). The account mapping system and KPI engine do not appear to filter by `source`. After a demo-to-full upgrade, real Xero data and demo data would both be present. The KPI engine would aggregate both unless filtered. This could produce financial KPIs that are a blend of fictional and real data.

**Recommendation:** Add `is_demo: boolean` flag to `normalised_financials`. On upgrade (`/api/onboarding/upgrade`), archive all `is_demo = true` records (soft delete or move to a shadow table). Ensure all KPI and financial queries filter `is_demo = false` in production mode.

### AC-04: Website Scan and Demo Profile Use Different LLM Call Patterns

The scan uses `new Anthropic()` directly (bypassing wrapper + governance). The demo profile uses `callLLM` (wrapper, no governance). Account mapping uses `callLLMWithUsage` + `governedOutput` (wrapper + governance). Interview uses `callLLMConversation` (wrapper, no individual governance per message). This inconsistency means the audit trail for AI outputs during onboarding is partial. For a platform whose primary differentiator is "institutional governance," the onboarding AI calls should be the most governed, not the least.

**Recommendation:** All AI calls during onboarding should use `callLLMWithUsage` + `governedOutput`. The scan and demo profile calls should be updated first (P1-03 above). Interview messages are too frequent to individually checkpoint — instead, checkpoint the completed profile extraction and recommendation generation, which already happens.

### AC-05: Blueprint Account Code Ranges Are Disconnected From Real Xero Account Codes

The three blueprints in `applyBlueprintMappings` use account codes `200–730`. Real Xero UK chart of accounts typically uses codes in the `1000–9999` range (Revenue: 4000–4999, Expenses: 6000–7999, etc.). The demo data generator also uses `200–730`. This means:
(a) Blueprint mappings will never match a real client's Xero accounts (the `accountByCode` map will always return `undefined` for real accounts).
(b) Demo accounts at codes `200–730` will succeed in mapping, but real accounts at `4000+` will not.

**Recommendation:** Replace hardcoded blueprint account codes with account name pattern matching (regex against account names) or Xero account type/class matching. The `autoMapAccounts` function already handles real accounts correctly via LLM; the blueprint path should be removed or limited to the demo dataset.

---

## Summary Lists

### BUILD

Items that need to be created from scratch:

1. **Zero-input demo option** — Pre-generate one dataset per industry, serve via single-click "Quick Preview" button with no form required. (R-P1-07)
2. **Account mapping review screen** — Post-connect, pre-interview page showing AI mapping suggestions with confidence colours, bulk confirm, individual edit. Maps directly to `user_confirmed` flag. (R-P1-02)
3. **Multi-tenant Xero picker page** — New page at `/welcome/xero-picker` shown when callback returns more than one Xero organisation. (R-P1-01)
4. **Onboarding step sequence configuration object** — Single source of truth for step order, consumed by both routing and progress indicator. (AC-01)
5. **Demo scenario and playbook seed** — Generate one default scenario and one playbook health check in `generateAllDemoData`. (R-P1-05)
6. **Re-scan endpoint and Settings UI** — Allow users to re-run website scan post-onboarding from Settings → Business Profile. (R-P2-04)

### FIX

Items that exist but have bugs, inconsistencies, or governance gaps:

1. **Step order inversion** — Align progress indicator with actual routing sequence. (R-P0-01, GAP-C1)
2. **Hardcoded complete page agent activity** — Replace with real sync data; make conditional on Xero connection status. (R-P0-02, GAP-C2)
3. **`[STAGE_COMPLETE]` fragility** — Replace with structured JSON output or explicit boolean field. Enforce minimum exchange count. (R-P0-03, GAP-C3)
4. **`sync_warning` silently dropped** — Include in onboarding redirect and display on connect page. (R-P1-06, GAP-S7)
5. **Blueprint account code ranges** — Blueprints use codes that do not match real Xero accounts; replace with class/type matching. (AC-05)
6. **Demo `cash_runway` miscalculation** — Calculate from actual closing cash balance, not random. (R-P2-02, GAP-M3)
7. **Demo upgrade data partition** — Archive demo data on upgrade; prevent KPI engine blending demo + real data. (R-P2-05, AC-03)
8. **`team_size` type coercion** — Force numeric extraction in `extractBusinessProfile`. (R-P2-06, GAP-M6)
9. **`has_completed_onboarding` `as any` casts** — Migrate to typed schema; remove silent catch blocks. (AC-02)
10. **Scan governance bypass** — Route scan through `callLLMWithUsage` + `governedOutput`. (R-P1-03, GAP-S4)

### LEVERAGE

Items that are already competitive and should be promoted / extended:

1. **AI interview with dual context injection** — The combination of financial context (12 months of Xero data) + website scan in every stage prompt is genuinely differentiated. No competitor does this. Promote it explicitly in marketing copy and make the opening message's personalisation more visible to the user.
2. **Immutable account mapping history** — The `account_mapping_history` table with `change_source`, `confidence`, `reasoning`, and governance checkpoint is ahead of DataRails and Fathom. Once the mapping review UI is built, this becomes a visible trust signal.
3. **Deterministic seeded demo data** — Same input always produces the same output. This is not just a technical convenience — it means demos given to the same prospect are consistent, and advisors can rehearse a demo without surprises.
4. **Structured profile extraction (22 fields)** — The `BusinessContextProfile` schema is well-designed. The 22 fields map directly to downstream platform features: targets feed the KPI engine, goals feed the scenario planner, risk tolerance feeds the playbook module prioritisation. This is the foundation of the Semantic Intelligence Layer.
5. **Auto-sync on Xero callback** — The 1-click "connect and sync immediately" pattern is correct. The org accounting config pull (financial year end, base currency) in the same callback is a differentiated detail that no competitor does automatically.
6. **Interview resume capability** — In-progress interviews persist to `interview_messages` and reload on refresh. Users can start an interview on mobile, resume on desktop. This is better than any competitor's wizard-style onboarding.
7. **Blueprint matching + KPI/dashboard recommendations** — The recommendations engine (Haiku model, governed output, validated against defined lists) is a lightweight but powerful personalisation layer. The output (KPI list, dashboard template, playbook modules) directly configures the platform for the user. Extend this to also set default KPI targets using `suggested_target` values.

### SKIP

Items that competitors have but Grove should not prioritise for this phase:

1. **Excel-native onboarding (DataRails pattern)** — Grove's target user is not an Excel-resident finance professional. The conversational AI interview is the correct replacement.
2. **Onboarding video walkthrough / certification course (Fathom pattern)** — Fathom's "self-paced certification course" is appropriate for accountants learning a new reporting tool. Grove's onboarding should be zero-learning-curve by design (AI does the explaining).
3. **Multi-source data connection wizard at onboarding** — DataRails connects to 200+ sources at setup. Grove's Xero-first approach is correct for the UK SME advisory market. Adding Shopify, HubSpot, etc. as onboarding steps adds complexity without proportional value at this stage.
4. **White-label onboarding for advisor portal** — Important for Phase 2 (multi-entity advisor portal) but not required for single-business MVP. The current onboarding is "Grove-branded" which is appropriate for now.
5. **NPS or satisfaction survey at end of onboarding** — Common in enterprise SaaS but premature at current scale. Adds friction at a critical conversion moment.

---

*End of Feature Benchmark Audit 09 — Onboarding & Setup*
*Next audit: 10 — Integrations & Data Sources*
