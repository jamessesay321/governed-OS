# Xero Data Reconciliation Skill

## Purpose
When a company provides management accounts, year-end accounts, or a business plan alongside their Xero data, use this skill to verify the platform's interpretation of the Xero data is correct. The platform MUST show numbers that match reality — never hallucinate profitability.

## When to Use
- A company provides management accounts (monthly/quarterly) from their accountant
- Year-end statutory accounts are uploaded (Companies House filings)
- A business plan with financial projections is shared
- The platform's P&L or KPI numbers don't match expected reality
- A new Xero connection is established and needs verification

## Reconciliation Process

### Step 1: Extract Reference Numbers from Source Documents

From the management accounts / statutory accounts, extract:

| Metric | Where to Find |
|--------|---------------|
| **Revenue** | P&L "Turnover" or "Sales" line |
| **Cost of Sales** | P&L "Cost of Sales" total (includes direct labour, materials, stock movements) |
| **Gross Profit** | Revenue - COGS |
| **Operating Expenses** | P&L "Administrative expenses" or detailed expense breakdown |
| **Operating Profit/Loss** | Gross Profit - Operating Expenses |
| **Interest Charges** | P&L "Interest payable and similar expenses" |
| **Net Profit/Loss** | Bottom line after all charges |
| **Deferred Income** | Balance sheet current liabilities (critical for service/deposit businesses) |
| **Stock/WIP** | Balance sheet current assets — and stock MOVEMENT in COGS |
| **Cumulative Losses** | Balance sheet "Retained earnings" (negative = accumulated losses) |
| **Net Assets/Liabilities** | Balance sheet total (negative = net liabilities) |

### Step 2: Compare Against Platform Numbers

Open the platform dashboard and compare:

| Platform Metric | Expected Source | Common Discrepancy |
|----------------|-----------------|-------------------|
| Total Revenue | Should match statutory "Turnover" for the same period | Inflated if bank transactions double-count invoices |
| Gross Margin % | Should match management accounts gross margin | Wrong if stock/WIP movements excluded from COGS |
| Net Profit | Should match statutory "Loss/Profit before tax" | Wrong if interest charges missing or revenue double-counted |
| Operating Margin | Should match management accounts operating margin | Wrong if expense categories misclassified |

### Step 3: Diagnose Root Causes

Check these common issues in order of impact:

#### Issue 1: Double-Counting (Bank Transactions + Invoices)
**Symptom:** Revenue is roughly 2x what management accounts show.
**Cause:** The `normaliseTransactions()` function includes both invoices AND bank transactions. In Xero's double-entry system, an invoice creates `Dr Receivable / Cr Revenue`, and the bank receipt creates `Dr Bank / Cr Receivable`. If both have line items referencing the same revenue account code, revenue gets counted twice.
**Fix:** Filter normalisation to `type IN ('invoice', 'bill')` only. Bank transactions are for cash flow, not P&L.
**Verification:** After fix, re-run sync. Revenue should halve to match management accounts.

#### Issue 2: Deferred Income Classified as Revenue
**Symptom:** Revenue is higher than management accounts even after fixing double-counting. Common in businesses that collect deposits (bridal, construction, SaaS annual prepayments).
**Cause:** Deposit accounts in Xero may be classified with `Class: REVENUE` instead of `Class: LIABILITY`.
**How to Check:** Query `chart_of_accounts` for accounts containing "deferred", "deposit", "prepaid" — verify their `class` field.
**Fix:** Either fix the classification in Xero, or create account_mappings to override the Xero class.
**Key Question to Ask:** "Does the business collect significant deposits or prepayments before delivering the service/product?"

#### Issue 3: Stock/WIP Movements Missing from COGS
**Symptom:** Gross margin is much higher than management accounts show. COGS only includes direct costs, not stock movements.
**Cause:** Opening/closing stock and WIP are balance sheet accounts (Class: ASSET). The P&L calculation skips them. But the real COGS includes the movement: `Opening Stock - Closing Stock`.
**How to Check:** Compare platform COGS against management accounts COGS. Look for stock-related accounts in `chart_of_accounts` with Class: ASSET.
**Fix:** The stock movement needs to be calculated from Trial Balance data and included in the P&L. This requires comparing the opening and closing balance of stock accounts and adding the net movement to COGS.
**Key Question to Ask:** "Does the business hold physical stock, work-in-progress, or raw materials?"

#### Issue 4: Interest/Financing Charges Missing
**Symptom:** Net loss is smaller than management accounts show.
**Cause:** Interest accounts may be classified under a class that doesn't map to EXPENSE/OVERHEADS.
**How to Check:** Query `chart_of_accounts` for accounts containing "interest", "loan", "finance charge".
**Fix:** Ensure these accounts are classified as EXPENSE class, or create account_mappings.
**Key Question to Ask:** "Does the business have loans, credit facilities, or other debt with interest charges?"

#### Issue 5: Period Mismatch
**Symptom:** Numbers are in the right ballpark but don't match exactly.
**Cause:** The platform's "12 months" may span a different period than the management accounts' financial year.
**How to Check:** Verify the platform's period selector matches the management accounts' period.
**Fix:** Ensure the platform clearly shows the financial year (e.g., "FY 2024: Jan-Dec 2024") rather than a rolling 12-month window.

### Step 4: Industry-Specific Checks

#### Fashion / Luxury / Manufacturing
- [ ] Stock of raw materials movement included in COGS?
- [ ] Work-in-progress movement included in COGS?
- [ ] Finished goods stock movement included in COGS?
- [ ] Embroidery/subcontractor costs classified as DIRECTCOSTS?
- [ ] Trunk show / pop-up expenses classified correctly (marketing vs COGS)?
- [ ] Multiple currency transactions converting correctly to GBP?

#### SaaS / Subscription
- [ ] Annual prepayments deferred correctly (not all recognised upfront)?
- [ ] MRR/ARR calculated from recognised revenue, not cash received?
- [ ] Hosting/infrastructure costs in COGS, not operating expenses?

#### Professional Services
- [ ] Revenue recognised on completion/milestone, not on invoice date?
- [ ] WIP (unbilled time) tracked but not counted as revenue?
- [ ] Contractor costs in COGS, not operating expenses?

#### Construction / Project-Based
- [ ] Stage-of-completion revenue recognition?
- [ ] Retention amounts excluded from current revenue?
- [ ] Sub-contractor costs in COGS?

### Step 5: Apply Fixes and Verify

1. Make code/data fixes
2. Re-run Xero sync (triggers normalisation)
3. Compare platform numbers against management accounts
4. Document any remaining discrepancies and their causes
5. Store findings in the company's business context profile

### Step 6: Document for Future Sessions

After reconciliation, update the company's business context with:
- Revenue recognition method (cash vs accrual, deposit handling)
- Known Xero classification issues and mappings applied
- Stock/WIP treatment
- Debt and interest structure
- Financial year end date
- Key contacts (accountant firm, CFO)

## Questions to Ask When Data Doesn't Match

1. "What is the company's financial year end?" (not always Dec)
2. "Does the business collect deposits or prepayments?"
3. "Does the business hold physical stock or work-in-progress?"
4. "What debt facilities does the business have?"
5. "Who prepared these management accounts?" (accountant vs internal)
6. "Are there any year-end journal adjustments the accountant makes that aren't in the monthly Xero data?" (depreciation, accruals, provisions)

## Lessons Learned

### Alonuko (Fashion/Luxury Bridal) — April 2026
- **Root cause:** Bank transactions AND invoices both normalised into P&L, causing double-counted revenue (~£2.58m shown vs £1.3m real)
- **Secondary issue:** £647k+ deferred income (bride deposits) — needs investigation after double-counting fix
- **Stock/WIP:** £115k stock + £35k WIP at year end — movements may need P&L inclusion
- **Interest:** £222k interest in 2025 — verify classification
- **Fix applied:** `normaliseTransactions()` now filters to `type IN ('invoice', 'bill')` only
- **Company has never been profitable:** cumulative losses of £1.2m+, net liabilities of £935k
