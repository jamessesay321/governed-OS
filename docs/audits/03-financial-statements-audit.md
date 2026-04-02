# Feature Benchmark Audit: Financial Statements
## Advisory OS — Section 3 of 15
**Date:** 2026-04-01 | **Status:** Complete | **Auditor:** Claude Code

---

## Feature Inventory

| # | Feature | Type | Current State |
|---|---------|------|---------------|
| 1 | P&L / Income Statement Display | Data display | Working |
| 2 | Semantic P&L (25-Category Taxonomy) | Calculation engine | Working |
| 3 | Balance Sheet Display | Data display | Working |
| 4 | Cash Flow Statement | Data display | Partial |
| 5 | AI Narrative on Financials | AI output | Working |
| 6 | Period Comparison (MoM / YoY) | Data display | Working |
| 7 | Budget vs Actual on Statements | Data display | Partial |
| 8 | Drill to Transactions | Navigation | Partial |
| 9 | Category Grouping & Subtotals | Data display | Working |
| 10 | Margin Calculations (Gross/Net/Operating) | Calculation | Working |
| 11 | Account Mapping Review / Confirmation | Workflow | Working |
| 12 | Export / PDF Generation | User action | Partial |
| 13 | Multi-Period Column View | Data display | Missing |
| 14 | Consolidated Statements (Multi-Entity) | Calculation | Missing |

---

## Benchmark Tables

### 1. P&L / Income Statement Display

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Displays the Profit & Loss statement with revenue, cost of sales, gross profit, operating expenses, and net profit rows. Period-specific data from Xero. |
| **What it's trying to achieve** | "Show me how much I made and where the money went" |
| **Who needs it** | All |
| **Best in class** | **Fathom HQ** — P&L presented in two modes: (1) Summary view — 5-8 rows showing major categories with subtotals and margins, fully collapsed, colour-coded by variance direction. (2) Detailed view — full chart of accounts grouped by category with expand/collapse per section. Each number is clickable → drills to transactions. Headers show margin % alongside absolute values. The mechanism: default is summary view (for business owners), toggle to detailed (for accountants). This single toggle handles the non-finance vs finance user split. |
| **How they achieved it** | Hierarchical data structure: Section → Category → Account → Transaction. Collapse level stored per user. Summary = collapse to Section. Detailed = expand to Account. Click account → fetch transactions from Xero API. |
| **Runner up** | **Syft Analytics** — Clean P&L with comparative columns (budget, prior year, forecast) visible by default. Each cell has a sparkline tooltip showing 12-month trend on hover. Very information-dense but still readable. |
| **Current Advisory OS state** | **Working** — `income-statement/page.tsx` renders P&L using `buildPnL()` or `buildSemanticPnL()`. Shows sections with rows (accountId, code, name, amount). Uses semantic P&L when mappings exist, giving category labels. Missing: summary/detail toggle, comparative columns, hover sparklines. |
| **AI opportunity** | Medium — AI narrative already generated separately. Could add per-section AI annotations: "Operating expenses are 12% of revenue — healthy for your industry." |
| **Non-finance user test** | **3/5** — The P&L structure is inherently financial. Summary mode with plain-English section names ("What you earned", "Cost of doing the work", "What's left after direct costs", "Running costs", "Your actual profit") would make it 4/5. |
| **Claude Finance alternative** | Claude can reformat a P&L into any structure conversationally and explain every line. But the persistent, consistently-formatted statement with drill-down is what accountants and advisors expect. |
| **Leverage existing tools?** | Xero has its own P&L view. Advisory OS adds: semantic categorisation, AI narrative, governed access. |
| **Token efficiency** | Zero tokens for display. ~1500 tokens if adding per-section AI annotations. |
| **Build recommendation** | **BUILD** — Add summary/detail toggle (Fathom pattern). Add plain-English section headers for summary mode. |
| **Priority** | **P0** — Demo-critical |
| **Defensibility** | **High** — 25-category semantic taxonomy means our P&L grouping is more meaningful than any competitor using Xero's 4 account classes. This is a genuine structural advantage. |

---

### 2. Semantic P&L (25-Category Taxonomy)

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Groups accounts into 25 meaningful categories (revenue, other_income, cost_of_sales, employee_costs, rent_and_occupancy, marketing, technology, professional_fees, etc.) instead of Xero's 4 broad classes (REVENUE, DIRECTCOSTS, EXPENSE, OVERHEADS). Each category has metadata: pnlSection, affectsGrossMargin, isStaffRelated, isDiscretionary. |
| **What it's trying to achieve** | "Don't just tell me I spent £50k on 'expenses' — tell me £22k was staff, £8k was rent, £5k was marketing..." |
| **Who needs it** | All — this is the foundation that makes every other feature more useful |
| **Best in class** | **DataRails** — Custom chart of accounts mapping with dimension tagging. Every account gets mapped to a company-specific hierarchy. But DataRails requires manual setup by a finance professional. Advisory OS's auto-mapping + AI classification is more accessible. No competitor has a standardised 25-category taxonomy with semantic metadata. |
| **How they achieved it** | DataRails: manual mapping during implementation (4-6 week onboarding). Fathom: uses Xero's native categories. Jirav: driver-based model requires account mapping to drivers. |
| **Runner up** | **Puzzle** — AI-powered categorisation (90-95% automated). Closest to Advisory OS's approach but limited to bookkeeping categories, not analytical categories. |
| **Current Advisory OS state** | **Working** — `taxonomy.ts` defines 25 `StandardCategory` values with `CATEGORY_META`. `account-mapper.ts` auto-maps via heuristics + AI. `buildSemanticPnL()` uses mappings for sub-category grouping. Mapping review UI at `staging/staging-client.tsx`. Mapping history with immutable audit trail. This is a genuine differentiator. |
| **AI opportunity** | **Very High** — Every AI feature on the platform benefits from semantic categories. Variance explanations become "employee costs up £4k" instead of "expenses up £4k". Health scores incorporate discretionary vs non-discretionary spend. Forecasts can model categories independently. |
| **Non-finance user test** | **4/5** — "Employee Costs", "Rent & Occupancy", "Marketing" are universally understood. Much better than Xero's "EXPENSE" and "OVERHEADS". |
| **Claude Finance alternative** | Claude can categorise accounts on the fly from a chart of accounts. But persistent, governed categorisation with audit trail and confirmation workflow is what advisors need. |
| **Leverage existing tools?** | No — this is proprietary infrastructure. |
| **Token efficiency** | ~500 tokens for initial auto-mapping per account × once. Zero ongoing. |
| **Build recommendation** | **BUILD** — Already complete. This is the crown jewel. Ensure all downstream features consume it. |
| **Priority** | **P0** — Foundation for everything |
| **Defensibility** | **Very High** — Standardised taxonomy + auto-mapping + confirmation workflow + audit trail + metadata (discretionary, staff-related, affects-gross-margin) = compounding moat. Every month of usage improves mapping accuracy. |

---

### 3. Balance Sheet Display

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Displays assets, liabilities, and equity with category groupings |
| **What it's trying to achieve** | "What do I own, what do I owe, and what's left?" |
| **Who needs it** | Advisor primarily, sophisticated business owner |
| **Best in class** | **Fathom** — Balance sheet with period-over-period comparison. Each section (current assets, non-current assets, current liabilities, non-current liabilities, equity) is collapsible. Key ratios displayed inline: current ratio shown next to current assets/liabilities, debt-to-equity shown next to respective sections. The mechanism: ratios are contextual annotations, not separate KPIs — they appear where they're relevant. |
| **How they achieved it** | Balance sheet renderer with section templates. Each section has optional ratio annotations defined in config. Ratios calculated deterministically from section totals. |
| **Runner up** | **Syft** — Balance sheet with waterfall visualisation option: shows how balance sheet changed from period A to period B as a waterfall. Unique and effective for explaining movements. |
| **Current Advisory OS state** | **Working** — `balance-sheet/page.tsx` and client component exist. Semantic taxonomy includes balance sheet categories (bank_and_cash, accounts_receivable, fixed_assets, accounts_payable, equity, etc.). Missing: inline ratio annotations, period comparison, movement waterfall. |
| **AI opportunity** | Medium — AI can flag balance sheet concerns: "Your accounts receivable is growing faster than revenue — you might have a collections problem." |
| **Non-finance user test** | **2/5** — Balance sheets are inherently confusing for non-finance users. Need heavy plain-English annotation: "What your business owns (£420k)" instead of "Total Assets". |
| **Claude Finance alternative** | Claude explains balance sheets beautifully conversationally. The structured display with drill-down adds consistency for reporting. |
| **Leverage existing tools?** | Xero has its own balance sheet. Advisory OS adds semantic grouping + AI annotation. |
| **Token efficiency** | ~500 tokens for AI balance sheet commentary |
| **Build recommendation** | **BUILD** — Add inline ratio annotations (Fathom), plain-English section headers, period comparison columns. |
| **Priority** | **P1** — Important for advisors, less critical for demo |
| **Defensibility** | Medium — Semantic categorisation helps but balance sheet display is commodity. |

---

### 4. Cash Flow Statement

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Displays operating, investing, and financing cash flows |
| **What it's trying to achieve** | "Where did cash actually come from and go to?" |
| **Who needs it** | All — cash flow is the #1 concern for SMEs |
| **Best in class** | **Syft (now Xero Analytics)** — Cash Flow Manager: (1) Current cash position prominently displayed (2) Forecast with confidence bands up to 180 days (3) Predicted bill/invoice payments based on historical payment behaviour (4) "Test a decision" feature: toggle a planned purchase on/off and see impact on cash position. The mechanism: ML model trained on historical payment patterns predicts when each outstanding invoice/bill will be paid. Confidence bands widen over time. |
| **How they achieved it** | Payment pattern analysis: for each customer/supplier, calculate average days-to-pay from historical transactions. Apply to outstanding receivables/payables to predict cash timing. Monte Carlo simulation for confidence bands. |
| **Runner up** | **Fathom** — Three-way forecast means cash flow is derived from P&L and balance sheet forecasts. Integrated, not standalone. Visual cash inflows/outflows chart. |
| **Current Advisory OS state** | **Partial** — `cash-flow/page.tsx` and client exist. Cash flow scenarios in `scenarios/cash-flow-chart.tsx`. Missing: payment prediction model, confidence bands, "test a decision" feature. |
| **AI opportunity** | **Very High** — AI can narrate cash flow: "You have £45k in the bank. Based on outstanding invoices and bills, you'll dip to £12k in 3 weeks before recovering to £38k by month end. The risk: if Acme Ltd pays late again (they've averaged 52 days vs 30-day terms), you'll hit £5k." |
| **Non-finance user test** | **5/5** — Every business owner understands "money in the bank." Cash flow is the most accessible financial concept. |
| **Claude Finance alternative** | Claude can analyse cash flow from data but can't predict payment timing from historical patterns. The ML prediction layer is platform value. |
| **Leverage existing tools?** | **Xero/Syft** — Xero Analytics now has Cash Flow Manager with prediction. Consider leveraging Xero's prediction and adding Advisory OS's AI narrative layer on top. |
| **Token efficiency** | ~1000 tokens for AI cash flow narrative × weekly |
| **Build recommendation** | **BUILD** — Cash flow display with AI narrative. **LEVERAGE** Xero Analytics for payment prediction rather than building own ML model. |
| **Priority** | **P0** — Cash flow is the #1 SME concern. Demo-critical. |
| **Defensibility** | Medium for the display, High for the AI narrative + governed forecast vs actual tracking. |

---

### 5. AI Narrative on Financials

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Claude API generates a 2-4 sentence narrative summary contextualised for the current financial statement |
| **What it's trying to achieve** | "Explain these numbers to me like I'm not an accountant" |
| **Who needs it** | All — hero feature for non-finance users |
| **Best in class** | **Fathom AI Commentary** — Recently launched. "Shaped by goals, strategy, market conditions." Key mechanism: commentary is not generic — it references the user's specific targets, industry context, and recent changes. Every number cited is linked back to source data. PhD ML team red-teams for hallucination reduction. |
| **How they achieved it** | Multi-step pipeline: (1) Extract key metrics from financial data (2) Compare against targets/budgets/prior periods (3) Identify top 3-5 notable items (4) Generate narrative with inline data references (5) Validate all cited numbers against source. |
| **Runner up** | **DataRails Storyboards** — Goes beyond commentary into full presentation generation. 2 clicks: data → narrative → slides. |
| **Current Advisory OS state** | **Working** — `/api/narrative/[orgId]` generates narrative using Claude with company skill context + semantic P&L data. Returns narrative + reasoning + confidence. Temperature 0.3. Token tracking. Already competitive. |
| **AI opportunity** | This IS the AI feature. Enhancement: reference specific accounts by name, include budget variance context, adapt tone to user's communication preferences (from company skill). |
| **Non-finance user test** | **5/5** — Plain English. The most accessible feature. |
| **Claude Finance alternative** | Claude generates equivalent narratives from uploaded data. Advisory OS advantage: automatic generation on sync, persistent history, governed context accumulation. |
| **Leverage existing tools?** | No — core AI value |
| **Token efficiency** | ~2000 tokens per narrative (1500 input + 500 output) × once per sync × cacheable = ~£0.003/narrative |
| **Build recommendation** | **BUILD** — Already strong. Enhance with budget context, named account references, communication preference adaptation. |
| **Priority** | **P0** |
| **Defensibility** | **Very High** — Narrative quality scales with company knowledge depth (semantic mappings, interview data, historical context). Compounding moat. |

---

### 6. Period Comparison (MoM / YoY)

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Show financial statement with comparison columns: current period vs prior month, vs same month last year, vs budget |
| **What it's trying to achieve** | "Is this month better or worse than last month / last year?" |
| **Who needs it** | All |
| **Best in class** | **Syft** — Financial statements default to showing three columns: Current Period | Prior Period | Variance. Each variance cell is colour-coded. Users can configure which comparison appears (prior month, same-month-prior-year, budget, forecast). Multiple comparisons can be shown simultaneously (up to 4 columns). The mechanism: a column picker dropdown above the statement lets users add/remove comparison periods. |
| **How they achieved it** | Statement renderer accepts an array of periods. Each period fetches from the same data source. Variance calculated client-side for instant toggle. |
| **Runner up** | **Fathom** — Period comparison built into report builder. Drag a "comparison" element to add prior year / budget / forecast alongside any financial statement. |
| **Current Advisory OS state** | **Working** — Dashboard P&L builds current + previous period for narrative comparison. Income statement page shows single period. Missing: multi-column comparison view, column picker, variance colouring. |
| **AI opportunity** | Low — deterministic comparison |
| **Non-finance user test** | **4/5** — Side-by-side comparison with red/green variance is intuitive. |
| **Claude Finance alternative** | Claude can compare periods conversationally but the visual side-by-side table is faster for scanning. |
| **Leverage existing tools?** | Xero has basic period comparison but limited to two periods. |
| **Token efficiency** | Zero tokens |
| **Build recommendation** | **BUILD** — Multi-column comparison with configurable periods and variance colouring. Standard feature, well-understood pattern. |
| **Priority** | **P1** — Important for advisor credibility |
| **Defensibility** | Low — standard feature |

---

### 7. Budget vs Actual on Statements

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Show budget alongside actual figures on the P&L, with variance column |
| **What it's trying to achieve** | "Am I on track against what I planned?" |
| **Who needs it** | Advisor, sophisticated business owner |
| **Best in class** | **DataRails** — Budget vs actual is the default P&L view. Each row shows: Budget | Actual | Variance £ | Variance %. Rows where variance > materiality threshold are highlighted. Click any variance → drill down by dimension. The mechanism: budget data loaded from Excel or manual input, automatically aligned with actuals by account/category. |
| **How they achieved it** | Budget table with same account structure as actuals. JOIN on account_id + period. Variance calculated at display time. Materiality threshold applied as row highlighting filter. |
| **Runner up** | **Fathom** — Forecast vs actual in the three-way forecast view. |
| **Current Advisory OS state** | **Partial** — Budget pages exist (`budget/page.tsx`, `budget/edit/budget-edit-client.tsx`). Variance engine compares budget to actual. Missing: integrated budget column directly on the P&L statement view (currently separate pages). |
| **AI opportunity** | High — AI can summarise: "You're £15k under budget overall. Most of the saving is from the hire you postponed (£8k). Marketing is £3k over due to the Q1 campaign." |
| **Non-finance user test** | **3/5** — "Budget vs actual" is understood conceptually but the table format needs colour coding and AI explanation to be actionable. |
| **Claude Finance alternative** | Claude can compare budget to actual and explain gaps. Advisory OS adds: who set the budget, when it was approved, tracked changes over time. |
| **Leverage existing tools?** | Xero has basic budget tracking. |
| **Token efficiency** | ~800 tokens for AI budget variance summary |
| **Build recommendation** | **BUILD** — Merge budget column into P&L display. Connect to existing variance engine. |
| **Priority** | **P1** |
| **Defensibility** | Medium — Budget governance (approval workflow, version history) adds moat. |

---

### 8. Drill to Transactions

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Click any line item on a financial statement → see the individual Xero transactions that compose it |
| **What it's trying to achieve** | "This number seems wrong — show me what's in it" |
| **Who needs it** | Advisor, accountant, power user |
| **Best in class** | **DataRails** — Click any number → "Drill-Down List" shows all contributing transactions with: date, description, amount, source document reference, counterparty. Export to Excel for further analysis. The mechanism: every displayed number has a hidden `transaction_ids[]` array. Click triggers a fetch of those transactions from the source system. |
| **How they achieved it** | Aggregation preserves transaction references. Stored in `amount_sources` table linking aggregated values to source transaction IDs. Fetch from accounting system via API on drill. |
| **Runner up** | **Fathom** — Click account → see transactions from Xero. Direct Xero API call with account filter + date range. |
| **Current Advisory OS state** | **Partial** — Normalised financials store Xero data with account references. P&L rows show accounts. Missing: click-to-transaction UI, Xero transaction-level drill-down. Drill-down pages exist (`drill-down/page.tsx` in variance) but not wired from financial statements. |
| **AI opportunity** | Medium — AI can annotate interesting transactions: "The largest transaction this month was £12,400 to Smith & Co — this is 45% of your total subcontractor costs." |
| **Non-finance user test** | **3/5** — Transaction lists are detailed. Need filtering and sorting to be useful for non-technical users. |
| **Claude Finance alternative** | Claude can list transactions but can't link to Xero source documents. The platform's deep linking to Xero is the value-add. |
| **Leverage existing tools?** | **Xero** — Deep link to Xero for the actual invoice/bill document. Don't rebuild transaction views — link to source. |
| **Token efficiency** | Zero tokens for drill-down. ~300 tokens if adding AI annotations. |
| **Build recommendation** | **BUILD** — Click-to-drill from P&L rows to transaction list. Include Xero deep links for source documents. |
| **Priority** | **P1** — Important for advisor trust ("I can verify any number") |
| **Defensibility** | **High** — Transaction-level audit trail + Xero deep linking + governed access = governance moat. |

---

### 9. Category Grouping & Subtotals

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Groups P&L accounts into meaningful categories with subtotals (Gross Profit, Operating Profit, Net Profit) |
| **What it's trying to achieve** | Standard financial statement structure that any accountant recognises |
| **Who needs it** | All |
| **Best in class** | **Fathom** — Standard UK/AU/US P&L structure with customisable grouping. Users can create custom groups and reorder sections. Key subtotals always visible: Revenue, Gross Profit, EBITDA, Operating Profit, Net Profit. Each subtotal shows both absolute value and margin %. |
| **How they achieved it** | Account-to-group mapping configurable per org. Default grouping based on Xero account classes. Custom groups stored in user config. |
| **Runner up** | **Advisory OS** — The 25-category semantic taxonomy actually provides better grouping than most competitors because it goes beyond Xero's 4 classes while maintaining a standard structure. |
| **Current Advisory OS state** | **Working** — `buildSemanticPnL()` groups by 25 categories into sections: revenue, other_income, cost_of_sales, operating_expenses, tax. Returns subtotals: grossProfit, operatingProfit, netProfit. `CATEGORY_META` provides section assignment and human-readable labels. Already better than most competitors. |
| **AI opportunity** | Low — deterministic grouping |
| **Non-finance user test** | **4/5** — Standard structure. Human-readable category labels (from taxonomy) help significantly. |
| **Claude Finance alternative** | Claude can group accounts but Advisory OS's persistent, governed categorisation is more reliable for reporting. |
| **Leverage existing tools?** | No |
| **Token efficiency** | Zero tokens |
| **Build recommendation** | **BUILD** — Already working and strong. Ensure all views use semantic P&L when mappings available. |
| **Priority** | **P0** — Already complete |
| **Defensibility** | **Very High** — 25-category taxonomy is a structural differentiator. |

---

### 10. Margin Calculations

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Calculates and displays Gross Margin %, Operating Margin %, Net Margin % alongside absolute values |
| **What it's trying to achieve** | "What percentage of revenue am I keeping at each level?" |
| **Who needs it** | All |
| **Best in class** | **Fathom** — Margins displayed inline on the P&L next to each subtotal. Historical margin trend visible as a mini-chart on hover. Margin comparison against target/benchmark with traffic light. |
| **How they achieved it** | Margin = subtotal / revenue × 100. Displayed as a secondary value on subtotal rows. Hover triggers sparkline render from KPI history. |
| **Current Advisory OS state** | **Working** — `buildSemanticPnL()` returns grossProfit, operatingProfit, netProfit. Margin % can be calculated. Missing: inline margin display on the statement, margin trend sparklines. |
| **AI opportunity** | Medium — AI can contextualise margins: "Your 42% gross margin is in the top quartile for UK plumbing businesses." |
| **Non-finance user test** | **3/5** — Percentages are understood. Need context ("42% is good for your industry") to be meaningful. |
| **Claude Finance alternative** | Claude explains margins better conversationally. The inline display wins for scanning. |
| **Leverage existing tools?** | No |
| **Token efficiency** | Zero tokens for calculation. ~200 tokens for context. |
| **Build recommendation** | **BUILD** — Add inline margin % on subtotal rows. Low effort, high impact. |
| **Priority** | **P0** — Quick win |
| **Defensibility** | Low — standard calculation |

---

### 11. Account Mapping Review / Confirmation

| Dimension | Assessment |
|-----------|------------|
| **What it does** | UI for reviewing, confirming, and overriding AI-suggested account-to-category mappings |
| **What it's trying to achieve** | "The AI mapped my accounts — let me verify it got them right" |
| **Who needs it** | Advisor, accountant |
| **Best in class** | **Cube** — "Intelligent Mapping" using plain language rules → structured dimensions. AI-suggested with human review. Batch operations for efficiency. |
| **How they achieved it** | Mapping table with AI-suggested category, confidence score, "accept" / "reject" / "override" actions per row. Batch accept for high-confidence items. |
| **Current Advisory OS state** | **Working** — `staging/staging-client.tsx` has full mapping review UI: summary cards, CategorySelect dropdown grouped by P&L section, per-account confirm, bulk "Confirm All", category override, AI reasoning expandable, low-confidence highlighting, suggestions panel. Immutable audit trail via `account_mapping_history`. This is strong. |
| **AI opportunity** | Medium — AI reasoning already shown. Could add: "I'm 95% confident this is correct because 'Sage Payroll' always maps to employee_costs." |
| **Non-finance user test** | **2/5** — Account mapping is inherently technical. But the traffic-light confidence display helps. |
| **Claude Finance alternative** | Claude could do the mapping conversationally but lacks the batch review UI. |
| **Leverage existing tools?** | No |
| **Token efficiency** | ~100 tokens per mapping suggestion × number of accounts (typically 30-100) × once at onboarding |
| **Build recommendation** | **BUILD** — Already complete and strong. |
| **Priority** | **P0** — Already complete |
| **Defensibility** | **Very High** — Confirmed mappings with audit trail = institutional knowledge capture. |

---

### 12. Export / PDF Generation

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Export financial statements as PDF, Excel, or printable format |
| **What it's trying to achieve** | "I need to send this to my accountant / bank / investor" |
| **Who needs it** | All |
| **Best in class** | **Fathom** — PDF export with brand customisation (logo, colours, cover page). Financial statements formatted for print quality. AI commentary included. Charts rendered as high-res images. Multiple format options: PDF, web link, scheduled email. |
| **How they achieved it** | Server-side PDF rendering (Puppeteer or similar). Brand config stored per org. Chart → PNG conversion server-side. Template engine for consistent formatting. |
| **Runner up** | **DataRails** — Auto-generates PowerPoint from any dashboard or financial statement. One-click board-ready presentation. |
| **Current Advisory OS state** | **Partial** — Board Pack PDF generation exists (Sprint 8 complete). Financial statement-specific PDF export may not be wired. |
| **AI opportunity** | Low — PDF generation is deterministic |
| **Non-finance user test** | **5/5** — "Download as PDF" is universally understood |
| **Claude Finance alternative** | Claude can format data but can't generate branded PDFs. Platform wins. |
| **Leverage existing tools?** | Use existing PDF generation from Sprint 8 board pack system. |
| **Token efficiency** | Zero tokens |
| **Build recommendation** | **LEVERAGE** — Extend existing board pack PDF system to support standalone financial statement export. |
| **Priority** | **P2** — Nice-to-have, not demo-critical |
| **Defensibility** | Low — standard feature |

---

### 13. Multi-Period Column View

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Display 6-12 months of P&L data side-by-side in a wide table format |
| **What it's trying to achieve** | "Show me the full year so I can spot seasonal patterns" |
| **Who needs it** | Advisor, accountant |
| **Best in class** | **Fathom** — 12-month P&L in a scrollable table. Each column is a month. Rows are accounts. Totals and margins at bottom. Conditional formatting: heatmap colouring based on value magnitude. Export to Excel preserves formatting. |
| **How they achieved it** | Horizontal scrollable table with fixed first column (account names). Each column fetches from the same period API. Client-side rendering with virtualisation for large account lists. |
| **Runner up** | **DataRails** — Similar but with aggregation toggle (monthly → quarterly → annual) that reflows the columns. |
| **Current Advisory OS state** | **Missing** — Financial statements show single period or two-period comparison. No 12-month wide view. |
| **AI opportunity** | Medium — AI can annotate seasonal patterns: "Revenue spikes every March (year-end rush for your clients) and dips every August (holiday season)." |
| **Non-finance user test** | **3/5** — Wide tables are overwhelming. But with heatmap colouring, patterns become visual. |
| **Claude Finance alternative** | Claude can produce tabular data but the interactive scrollable table with heatmap is better for pattern spotting. |
| **Leverage existing tools?** | Google Sheets is genuinely good for this — export 12-month data to Sheets. |
| **Token efficiency** | ~400 tokens for seasonal pattern AI annotation |
| **Build recommendation** | **BUILD** for advisor view. **LEVERAGE** Google Sheets export for accountants who want to manipulate data. |
| **Priority** | **P2** — Not demo-critical |
| **Defensibility** | Low — standard table |

---

### 14. Consolidated Statements (Multi-Entity)

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Combine financial statements from multiple Xero orgs into one consolidated view |
| **What it's trying to achieve** | "I have 3 companies — show me the group picture" |
| **Who needs it** | Advisor managing multiple clients, group businesses |
| **Best in class** | **Syft** — Multi-entity consolidation with intercompany eliminations, multi-currency, customisable group structures. Now built into Xero directly. |
| **How they achieved it** | Entity group definitions with parent/child relationships. Intercompany transaction matching and elimination rules. Currency conversion at period-end rates. |
| **Runner up** | **Fathom** — Consolidated reporting across client portfolio for advisor practices. |
| **Current Advisory OS state** | **Missing** — Single-org only. Multi-tenancy exists but no cross-org consolidation. |
| **AI opportunity** | Low — consolidation logic is deterministic |
| **Non-finance user test** | **2/5** — Consolidation is an advanced accounting concept |
| **Claude Finance alternative** | Claude could consolidate uploaded data conversationally. |
| **Leverage existing tools?** | **Xero/Syft** — Consolidation is now in Xero via Syft. Use their output rather than rebuilding. |
| **Token efficiency** | Zero tokens |
| **Build recommendation** | **SKIP** — Phase 2 feature. Leverage Xero/Syft consolidation. |
| **Priority** | **P3** |
| **Defensibility** | Low until we have multi-entity governance layer |

---

## Summary Lists

### BUILD LIST

| Feature | Approach | Informed by | Priority |
|---------|----------|-------------|----------|
| P&L Summary/Detail Toggle | Fathom pattern: default summary for owners, toggle to detail for accountants | Fathom | P0 |
| Plain-English Section Headers | "What you earned" instead of "Revenue" in summary mode | Advisory OS original | P0 |
| Inline Margin % | Show margin % next to each subtotal row on P&L | Fathom | P0 |
| Cash Flow Display + AI Narrative | Cash flow statement with AI narration of position and outlook | Syft, Fathom | P0 |
| Multi-Column Period Comparison | Current + Prior + Budget columns with variance colouring | Syft | P1 |
| Transaction Drill-Down | Click P&L row → transaction list with Xero deep links | DataRails | P1 |
| Budget Column on P&L | Integrate budget data directly on income statement view | DataRails | P1 |
| Balance Sheet Enhancement | Inline ratio annotations, plain-English headers | Fathom | P1 |
| 12-Month Wide View | Scrollable multi-month P&L with heatmap colouring | Fathom | P2 |

### WRAP LIST

| Feature | Shell needed | AI work | Token cost |
|---------|-------------|---------|------------|
| Financial Narrative | Text block above each statement | Period narrative generation | ~2000 tokens × Sonnet |
| Cash Flow Narrative | Cash position summary with outlook | Predict and explain cash trajectory | ~1000 tokens × Sonnet |
| Per-Section Annotations | Expandable below each P&L section | Context-aware section commentary | ~300 tokens/section × Haiku |

### LEVERAGE LIST

| Feature | Alternative | Action |
|---------|------------|--------|
| Statement PDF Export | Existing Board Pack PDF system (Sprint 8) | Extend board pack templates |
| Cash Flow Prediction | Xero Analytics Cash Flow Manager | API-pull prediction data |
| Google Sheets Export | Google Sheets API | Export 12-month data for accountant manipulation |

### SKIP LIST

| Feature | Reason | Revisit |
|---------|--------|---------|
| Multi-Entity Consolidation | Xero/Syft handles this. Not needed for single-entity MVP. | Phase 2 (Advisor Portal) |
| Custom Account Grouping | 25-category taxonomy covers 95% of needs | Phase 2 |
| Statement Version History | Board pack versioning exists | Phase 2 |

### ARCHITECTURE NOTES

1. **Semantic P&L as Default** — Every financial statement view should use `buildSemanticPnL()` when account mappings exist, falling back to `buildPnL()` when they don't. This is already partially implemented but should be consistent across all views.

2. **Statement Renderer Component** — Build a shared `<FinancialStatement>` component that handles: summary/detail toggle, comparison columns, variance colouring, click-to-drill, margin display. Used by P&L, Balance Sheet, and Cash Flow views.

3. **Token Strategy for Narratives** — Pre-generate narratives on Xero sync, store in DB. Dashboard load fetches cached narrative. Re-generate only when data changes. Estimated monthly cost per org: ~£0.10 for all statement narratives.

4. **The Semantic Advantage** — Advisory OS's 25-category taxonomy is a genuine structural advantage over every competitor audited. Fathom uses Xero's native categories. DataRails requires manual mapping. Advisory OS auto-maps + confirms = best of both worlds. This advantage compounds: better categorisation → better AI narratives → better variance explanations → better health scores → better forecasts.
