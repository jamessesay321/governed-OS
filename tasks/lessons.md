# Lessons Learned

Reviewed at session start. Updated after every bug, correction, failed build, or schema redesign.

---

## Lesson 1: JavaScript `-0` in currency rounding

**Mistake:** `roundCurrency(-0.001)` returned `-0` instead of `0`.

**Root cause:** `Math.round()` produces `-0` for very small negative numbers close to zero. JavaScript treats `-0 === 0` as `true`, but `JSON.stringify(-0)` returns `"0"` while `Object.is(-0, 0)` returns `false`. This can cause subtle bugs in financial comparisons and display.

**Fix:** Added explicit normalisation: `return result === 0 ? 0 : result;`

**Preventative rule:** Always normalise `-0` to `0` in any currency/financial rounding function. Add test cases for edge values around zero.

---

## Lesson 2: Supabase Database generic format

**Mistake:** Custom `Database` type interface was missing `Relationships`, `Views`, `Functions`, `Enums`, and `CompositeTypes` fields required by Supabase's type system. This caused all query return types to resolve to `never`.

**Root cause:** Supabase's `createServerClient<Database>()` and `createBrowserClient<Database>()` expect the full type structure including `Relationships` on each table and `Views`, `Functions`, `Enums`, `CompositeTypes` on the public schema. Omitting them breaks type inference.

**Fix:** Added all required fields to the Database interface. For unused sections, used `Record<string, never>`.

**Preventative rule:** When manually defining Supabase Database types, always include the full structure: `Tables` (with `Relationships` on each), `Views`, `Functions`, `Enums`, `CompositeTypes`. Prefer generating types with `supabase gen types typescript` when a live database is available.

---

## Lesson 3: shadcn `toast` component deprecated

**Mistake:** Attempted `npx shadcn add toast` which no longer exists.

**Root cause:** shadcn/ui replaced the custom toast component with `sonner` (a third-party toast library) in recent versions.

**Fix:** Used `npx shadcn add sonner` and imported from `sonner` package directly.

**Preventative rule:** When adding shadcn components, check the latest shadcn/ui docs. If a component fails to install, check for renamed or replaced components before debugging further.

---

## Lesson 4: `create-next-app` interactive prompts

**Mistake:** `npx create-next-app` hung during scaffolding because it prompted for React Compiler (a new interactive question).

**Root cause:** CLI tools add new interactive prompts over time. Running them in non-interactive environments (like agent sessions) causes hangs.

**Fix:** Piped `echo "n"` to the command to auto-answer the prompt.

**Preventative rule:** When running scaffolding tools, use `--yes` or equivalent flags to skip prompts. If not available, pipe default answers.

---

## Lesson 5: TypeScript `interface` vs `type` for Supabase Database generics

**Mistake:** All entity types (Organisation, Profile, etc.) were declared as `interface`. When used as `Row` in the Supabase `Database` generic, the `from().select('*')` queries returned `{}` instead of the actual row type.

**Root cause:** TypeScript `interface` declarations don't implicitly satisfy `Record<string, unknown>` because interfaces lack implicit index signatures. Supabase's `GenericTable` requires `Row: Record<string, unknown>`. When the check fails, the type system can't resolve row fields. Type aliases (`type X = { ... }`) DO satisfy `Record<string, unknown>`.

**Fix:** Changed all entity declarations from `interface` to `type` aliases.

**Preventative rule:** Always use `type` aliases (not `interface`) for Supabase row types. Reserve `interface` for extensible contracts.

---

## Lesson 6: `Record<string, never>` vs `{}` in Supabase Database schema

**Mistake:** Used `Views: Record<string, never>` and `Functions: Record<string, never>` for empty Views/Functions in the Database type. This caused `select('*')` to return `{}` for all tables.

**Root cause:** `Record<string, never>` means "every string is a valid key" (with `never` values). Supabase's `GetComputedFields` type checks if each row field name exists in `Schema['Functions']`. Since `Record<string, never>` matches ALL string keys, every field was incorrectly treated as a "computed field" and omitted from `*` results.

**Fix:** Changed to `Views: {}` and `Functions: {}` (empty object — no keys).

**Preventative rule:** Use `{}` (not `Record<string, never>`) for empty sections in Supabase Database types. `Record<string, never>` and `{}` have fundamentally different semantics in TypeScript.

---

## Lesson 7: Don't skip the workflow — even for "quick" features

**Mistake:** Built the entire onboarding flow (welcome page, website scanner, interview wrapper, Xero connect step, completion page — 14 new files, 1500+ lines) without entering PLAN MODE, writing a plan, defining security implications, or writing any tests.

**Root cause:** Prioritised shipping over process. The WORKFLOW_ORCHESTRATION.md explicitly requires plan mode for 3+ step tasks and security review for any new endpoint.

**Fix:** Retroactively added SSRF protection, Zod validation, fixed `as any` casts, added security headers. But these should have been part of the initial build.

**Preventative rule:** For ANY task touching 3+ files or adding a new API endpoint: enter plan mode, define files/security/tests, get approval, then build. No exceptions — the process exists because skipping it creates security debt.

---

## Lesson 8: Server-side fetch needs SSRF protection

**Mistake:** The `/api/onboarding/scan` endpoint accepted arbitrary URLs and fetched them server-side with no validation. This is a Server-Side Request Forgery (SSRF) vulnerability — an attacker could probe internal networks, cloud metadata endpoints (169.254.169.254), or localhost services.

**Root cause:** Focused on the happy path (user enters their business website) without considering adversarial input.

**Fix:** Added `isUrlSafe()` function blocking: non-HTTP protocols, localhost, private IP ranges (10.x, 192.168.x, 172.16-31.x), cloud metadata endpoints, .local/.internal hostnames.

**Preventative rule:** Any endpoint that fetches a user-provided URL MUST validate the URL against an SSRF blocklist before making the request. This is OWASP Top 10 (A10:2021 — Server-Side Request Forgery).

---

## Lesson 9: Never use `as any` — find the right type

**Mistake:** Used `(org as any).has_completed_onboarding` and `{ ... } as any` in Supabase update calls because the generated types didn't include the new columns yet.

**Root cause:** Added columns via SQL migration but didn't update the TypeScript Database types. Instead of fixing the root cause, used `as any` to suppress the error.

**Fix:** Changed to `as Record<string, unknown>` as a safer interim cast. Proper fix is to regenerate Supabase types after migration.

**Preventative rule:** Never use `as any`. If types don't match, either update the type definitions or use `as Record<string, unknown>` with a TODO to regenerate types. `as any` hides real bugs.

---

## Lesson 10: Bank transactions double-count P&L when combined with invoices

**Mistake:** `normaliseTransactions()` aggregated ALL raw_transactions (invoices + bank transactions) into normalised_financials. This caused every revenue and expense line to be counted twice — once from the invoice and once from the bank receipt. Alonuko showed £2.58m revenue and £245k profit when the real figures were £1.3m revenue and a £300k+ loss.

**Root cause:** In Xero's double-entry accounting, an invoice (ACCREC) creates `Dr Receivable / Cr Revenue` with line items on the revenue account. The corresponding bank receipt also has line items referencing the same revenue account codes. Aggregating both doubles every P&L figure.

**Fix:** Filter normalisation to `type IN ('invoice', 'bill')` only. Bank transactions are for cash flow analysis, not P&L. Also added a delete-before-rebuild step to clear stale double-counted data.

**Preventative rule:** For ANY accounting integration (Xero, QBO, etc.), only use accrual-basis documents (invoices/bills) for P&L normalisation. Bank transactions are cash-basis and must be kept separate. Always verify platform numbers against the source system's own P&L report before shipping.

## Lesson 11: Vercel App Router maxDuration must be exported from route files

**Mistake:** Added `maxDuration` to `vercel.json` `functions` config, but Vercel App Router ignores this. Syncs continued to time out at the default limit.

**Root cause:** Next.js App Router routes require `export const maxDuration = N` directly in the route.ts file. The `vercel.json` `functions` key only works for Pages Router API routes.

**Preventative rule:** Always export `maxDuration` from the route file itself for App Router. Never rely on `vercel.json` functions config alone.

## Lesson 12: Xero API where clause must be URL-encoded

**Mistake:** Passed `where=Date>=DateTime(2025,3,1)` as a raw query parameter. Xero silently ignored the unencoded filter and returned ALL records (5000+ invoices).

**Root cause:** Special characters like `>=`, `(`, `)`, `,` in the `where` parameter need URL encoding. Without it, Xero treats the parameter as malformed and ignores it.

**Fix:** Use `encodeURIComponent()` on the where clause value before appending to the URL.

**Preventative rule:** ALWAYS URL-encode query parameters that contain special characters, especially for third-party APIs. Test that filters actually reduce result count — if the number of pages doesn't decrease, the filter isn't working.

## Lesson 13: Don't run full sync inline in OAuth callbacks

**Mistake:** The Xero OAuth callback route ran `runFullSync()` inline before redirecting. For large accounts, this exceeded the function timeout, preventing Xero from connecting at all.

**Root cause:** OAuth callbacks should be fast (token exchange + redirect). Running a 2-5 minute sync pipeline in the callback blocks the redirect and risks timeout.

**Fix:** Callback saves tokens and redirects immediately. User triggers sync via "Sync Now" button on the dedicated sync route (with its own maxDuration).

**Preventative rule:** OAuth callbacks must be lightweight: exchange tokens, store connection, redirect. Never run long-running operations inline. Use a separate route/endpoint for heavy work.

## Lesson 14: Parallel API calls burn shared rate limits 2x faster

**Mistake:** Ran invoice and bank transaction pagination in `Promise.all()`. Both streams made Xero API calls concurrently, hitting the 60-call/min rate limit in half the time, causing 43s pauses that pushed total time past 5 minutes.

**Root cause:** Both streams share the same rate limit tracker but each adds calls independently. 2 parallel streams × 100 calls each = 200 calls, hitting the limit after just 27-28 pages.

**Fix:** Run invoice and bank transaction fetching sequentially. Each finishes its pagination before the next starts, allowing better rate limit window sharing.

**Preventative rule:** When calling a rate-limited API, run paginated fetches SEQUENTIALLY unless the rate limit budget is clearly sufficient for parallel execution. Always calculate: (pages needed × streams) vs (rate limit per window).

---

## Lesson 15: Features without narrative are not features — Narrative Financial Reporting

**Mistake:** Built 11 "features" across multiple sprints (audit log viewer, vault content renderer, cross-references, DrillableNumber, challenge digest, variance drill-down, etc.) — all structurally correct, all passing build — but pages still felt empty because they lacked the NARRATIVE LAYER that makes numbers meaningful.

**Root cause:** Treated features as infrastructure (add a button, add a column, add a link) instead of treating each page as a COMMUNICATION PRODUCT. A table of numbers with a Challenge button is still just a table of numbers. The user — a non-finance business owner — needs the page to TELL THEM what the numbers mean.

**The standard is called "Narrative Financial Reporting":** every financial page must have three layers on every number:
1. **The Figure** — formatted correctly with `formatCurrency()`
2. **The Context** — vs prior period, vs budget, % change, trend direction, margin %
3. **The Narrative** — AI-generated plain English summary explaining "what this means for your business"

**Fix:** Created `.claude/skills/narrative-financial-reporting.md` with the full standard and page-by-page checklist. Every financial page must include: `NarrativeSummary` at top, `DataFreshness` badge, `FinancialTooltip` on terms, `DrillableNumber` on figures, `ChallengeButton`, `CrossRef` links, and contextual comparisons on every number.

**Preventative rule:** Before marking ANY financial page as "done", answer: "Would a non-accountant understand what this page is telling them?" If the answer is no, the page is not done. The Executive Summary page is the benchmark — every other page must match its level of narrative, context, and visual communication. Reference the skill at `.claude/skills/narrative-financial-reporting.md` for the full checklist.

---

## Lesson 16: Agreed features lost across session compactions

**Mistake:** The Semantic Intelligence Layer (Phases B+C) was discussed, agreed upon, and documented in `SEMANTIC_INTELLIGENCE_LAYER_SPRINT.md` during a session. When the context window compacted, the agreement was lost. The user discovered weeks later that something they explicitly approved was never built.

**Root cause:** Session compaction summaries don't preserve every agreed-upon feature with enough specificity. A summary like "discussed semantic intelligence" doesn't capture "Phase B (Semantic Mapping) and Phase C (Business Context Intelligence) are NOT YET BUILT." The todo.md also didn't have these as explicit line items.

**Fix:** Created a persistent Feature Registry (`tasks/feature-registry.md`) that tracks every agreed feature with status, date, and verification criteria. Added a mandatory session-start audit that reads the registry and flags overdue items. Added a pre-compaction capture step. Created `.claude/skills/task-tracker.md` with the full protocol.

**Preventative rule:** The MOMENT a user agrees to build something, add it to `/tasks/feature-registry.md` with status `agreed`. Never rely on conversation context alone. The registry survives compactions; conversation memory doesn't. Run `bash scripts/audit-features.sh` to verify built features still exist.

---

## Lesson 17: OTHERINCOME classification miss and encoding accounting standards

**Mistake:** Xero's OTHERINCOME account class was initially unhandled in financial aggregation, causing "other income" (e.g. interest received, sundry income) to be silently dropped from P&L reports. Revenue was understated and the income statement didn't reconcile with Xero's own reports. Additionally, AI prompts and calculation engines referenced a flat 25% Corporation Tax rate instead of the marginal relief system (19% small profits, marginal relief band, 25% main rate).

**Root cause:** Two gaps: (1) The Xero account class taxonomy wasn't fully enumerated — OTHERINCOME, DIRECTCOSTS, OVERHEADS are valid classes that differ from the generic REVENUE/EXPENSE used in most tutorials. (2) UK Corporation Tax is not a flat rate — the marginal relief system (FY2023+) means effective rates range from 19% to 25% depending on profit level. Using a flat rate miscalculates tax provisions for companies in the £50k-£250k profit band.

**Fix:** Added OTHERINCOME handling to all aggregation paths (scenario pipeline, forecast engine, financial aggregation). Built `uk-tax.ts` with proper marginal relief calculation. Updated scenario and forecast engines to use `calculateCorporationTax()` with annualised profit banding. Added FRS 102/105, ACCA/ICAEW, and ISA 570 references to all AI system prompts.

**Preventative rule:** (1) When integrating with any accounting platform, enumerate ALL account classes from the API documentation — do not assume a generic REVENUE/EXPENSE/ASSET/LIABILITY taxonomy. Test with real client data that includes edge-case classes. (2) Always encode UK tax rules as deterministic functions with proper banding, not flat rates. Reference HMRC publications for current rates and thresholds. (3) All AI system prompts for financial analysis must reference the applicable accounting framework (FRS 102/105), practitioner body methodology (ACCA/ICAEW), and audit standards (ISA 570) — generic "financial analysis" prompts produce generic output that doesn't meet UK compliance expectations.

---

## Lesson 18: Invoice contacts ≠ business clients — understand the business model before counting

**Mistake:** Counted 590 unique Xero invoice contact names as "confirmed clients" for Alonuko in 2025. The actual number from the Confirmed Clients spreadsheet is 146. The error was 4x overcount.

**Root cause:** Three compounding failures:
1. **No business model understanding applied.** Alonuko is luxury bridal — each bride generates 3-5 invoices (consultation, deposit, balance payments, alterations). Counting invoice contacts = counting transactions, not customers.
2. **No cross-reference with operational data.** Monday.com has the authoritative confirmed clients list. The platform should never report client counts from Xero alone without cross-referencing operational systems.
3. **Revenue recognition not applied.** Reported £1.82M from invoice totals (which includes VAT, deposits that are liabilities not revenue, and voided invoices). The correct P&L revenue is £1.43M — a £390K overstatement.

**Key data points that should have been sanity-checked:**
- AOV from confirmed clients spreadsheet: £8,634 (not the ~£3K implied by 590 clients on £1.8M)
- MTO vs Bespoke split: 129 MTO at £8,110 AOV vs 13 Bespoke at £16,398 AOV
- Deposit % collected: 70.8% (£892K of £1.26M proforma value)
- Wedding dates span 2025-2027 — deposits received ≠ revenue recognised

**Preventative rule:** (1) NEVER report client counts from accounting data alone. Always cross-reference with operational/CRM source (Monday.com, HubSpot, Shopify). (2) For any business with deferred revenue (deposits, subscriptions, retainers), distinguish between "invoiced amount" and "recognised revenue". (3) Before reporting any financial metric, ask: "Does this match the business model?" — if AOV looks wrong for the industry, the count is probably wrong. (4) Apply FRS 102 Section 23 (Revenue Recognition) — revenue for made-to-order goods is recognised on delivery, not on deposit.

**Generalised pattern:** This applies to ANY service/made-to-order business: law firms (retainers ≠ revenue), construction (stage payments), SaaS (annual upfront ≠ monthly revenue), events (ticket deposits). Always ask: "When does this business recognise revenue?"

---

## Lesson 19: Understand debt structure before financial health assessment

**Mistake:** Presented P&L figures without analysing the debt structure. Alonuko has 13 debt facilities totalling £511K outstanding, with £55.7K/month in repayments (46.6% of monthly revenue) and £257K in annual interest (17.9% of revenue). This fundamentally changes the financial health picture from "loss-making" to "structurally drowning in debt service costs."

**Root cause:** The platform has no debt/loan tracking capability. All debt appears as generic "Interest Expense" line items in the P&L with no visibility into: which lenders, what rates, when they mature, what the monthly cash drain is, or which are MCAs vs term loans vs government schemes.

**Key insight:** 69% of monthly repayments (£38K/month) go to Merchant Cash Advances (MCAs) which are the most expensive form of debt. The Shopify/YouLend loan alone has a £186K balance. The BBL (Bounce Back Loan) at £233/month is the only "good" debt. A refinance strategy to consolidate MCA debt into a single term loan could save £150K+/year.

**Preventative rule:** (1) For ANY business with debt, always build the full debt schedule before presenting P&L analysis. Interest expense alone tells you nothing — you need balance, rate, term, and type. (2) Classify debt: GOOD (low rate, long term, productive), OKAY (moderate, manageable), BAD (high rate, short term, MCA). (3) Always calculate debt service coverage ratio (DSCR) = operating profit / total debt service. Below 1.0 means the business cannot service its debt from operations. (4) MCAs are NEVER "good" debt regardless of what the user thinks — they have effective APRs of 30-100%+. Flag them prominently.

---

## Lesson 20: NEVER claim a feature is done without visually verifying it in the browser

**Mistake:** Told James that Balance Sheet, Cash Flow, and COGS fixes were "done" based solely on the build passing. When James asked "have you gone into the website to check yourself?" — the answer was no. The build passing means zero about whether data actually renders. In this case:
- The BS sync had a UUID vs code mismatch (0 rows returned despite API succeeding)
- COGS classification required a re-sync to take effect
- The "done" claim wasted James's time and eroded trust

**Root cause:** Treating `npm run build` success as proof of correctness. A build only checks TypeScript compilation — it says nothing about runtime data flow, API response parsing, database queries returning results, or UI rendering real content.

**Preventative rule:**
1. After ANY feature change, **open the actual page in the browser** using Chrome/Preview tools and take a screenshot
2. Verify the page shows **real data, not empty states or loading spinners**
3. If data depends on a sync or API call, trigger it and wait for completion before checking
4. Only tell the user "done" AFTER you have visually confirmed the output yourself
5. This is NON-NEGOTIABLE — no exceptions, no shortcuts. If you can't verify it visually, say "built but not yet verified" instead of "done"

---

## Lesson 21: Xero API returns UUIDs in Trial Balance, not account codes

**Mistake:** The Trial Balance parser assumed `Attributes[0].Value` contained the Xero account code (e.g. "600"). It actually contains the Xero account UUID (e.g. "bc2e66f4-5037-49fe-9cc5-84f0be2f55e0"). The lookup map was keyed by code, so every account lookup failed silently and 0 BS rows were written.

**Root cause:** Assumed the Xero API structure without checking the actual response. The debug logs clearly showed 0 results but the first version didn't log the raw response to diagnose why.

**Preventative rule:** (1) When integrating with any external API, always log a sample of the raw response on first call to verify assumptions about the data shape. (2) For Xero specifically: `chart_of_accounts.xero_account_id` stores the UUID — always build lookup maps by UUID, not just by code. (3) When a function returns 0 results, add temporary debug logging to see what the API actually sent before assuming the logic is wrong.

---

### Lesson 22: Use Management Accounts as Classification Authority
**Date:** 2026-04-09
**Mistake:** Built a 27-category taxonomy, auto-mapper, and semantic P&L engine — but the income statement still showed 4 flat Xero classes. Never compared our output against the client's actual management accounts.
**Root cause:** Infrastructure was built in isolation without validating against the real-world output (the accountant's management accounts). Features were "done" when code was written, not when output matched reality.
**Rule:** Before shipping any financial presentation feature, compare its output against the client's management accounts. The accountant has already solved the classification problem — use their work as the answer key. When infrastructure exists but isn't wired to UI, it's not built — it's inventory.
