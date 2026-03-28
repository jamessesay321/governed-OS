# FP&A INTEGRATION LANDSCAPE REPORT
## Advisory OS / Grove Build Reference | March 2026

> **Purpose:** Deep analysis of how the top 10 FP&A competitors handle integrations, which unified API providers serve the space, and recommendations for Grove's integration architecture.

---

## 1. FP&A COMPETITOR INTEGRATION MATRIX

| Company | Integration Count | Approach | Accounting Platforms Supported | Unified API / iPaaS Used | HRIS / Payroll | CRM / Billing |
|---------|------------------|----------|-------------------------------|--------------------------|----------------|---------------|
| **DataRails** | 200+ (400+ for FinanceOS) | Custom-built + iPaaS (Celigo) | Xero, QuickBooks Online, QuickBooks Desktop, NetSuite, Sage Intacct | Celigo iPaaS for custom connections; bulk are custom-built | ADP, BambooHR, Gusto, Paychex | Salesforce, HubSpot, Stripe |
| **Fathom** | 6 direct | Custom-built (direct API) | Xero, QuickBooks Online, QuickBooks Desktop, MYOB, Sage, FreeAgent | None identified - all native | None native | None native |
| **Syft** | ~10 direct | Custom-built (now Xero-owned) | Xero (primary), QuickBooks, FreshBooks | None - native integrations | Gusto | Stripe, Square, Shopify |
| **Jirav** | ~15 direct | Custom-built (direct API) | QuickBooks Online, QuickBooks Desktop, Xero, NetSuite, Sage Intacct | None identified - all native | Gusto, BambooHR, Paylocity, ADP, Paychex, UKG, Justworks, TriNet | Google Sheets |
| **Runway** | 750+ | Hybrid: Fivetran (ETL) + Merge.dev (unified API) + custom first-party | QuickBooks Online, Xero, NetSuite, Sage Intacct (via Merge + Fivetran) | **Merge.dev** (HRIS, QBO, Xero); **Fivetran** (broad data/ERP) | Rippling, Deel, Gusto, HiBob, BambooHR, ADP (via Merge) | Salesforce, HubSpot, Stripe, Pipedrive |
| **Mosaic (Bob Finance)** | 30+ pre-built | Custom-built connectors | QuickBooks Online, Xero, NetSuite, Sage Intacct | None identified - pre-built connectors | ADP, Gusto, Rippling, BambooHR (enhanced by HiBob acquisition) | Salesforce, HubSpot, Stripe, Chargebee |
| **Puzzle** | ~15 direct | Custom-built (direct API, API-first) | None traditional (accounting IS the product) | **Plaid** (banking connections) | Gusto, Rippling, Deel | Stripe, Bill.com |
| **Planful** | Hundreds (via Boomi) | iPaaS: **Boomi AtomSphere** + custom APIs | NetSuite, SAP, Oracle, Sage Intacct, Microsoft Dynamics | **Boomi** (iPaaS for ERP/GL connections) | Workday, ADP, various via Boomi | Salesforce via Boomi |
| **Vena** | 20+ pre-built + unlimited via Fabric | Microsoft ecosystem: Power Automate + Microsoft Fabric connectors | QuickBooks, Xero, Sage Intacct, NetSuite, SAP, Microsoft Dynamics 365 F&O, Acumatica | **Microsoft Fabric** (6 pre-built connectors); **Power Automate** (iPaaS); Acterys write-back engine | Workday, ADP (via Fabric/API) | Salesforce (via API) |
| **Cube** | ~20 direct | Custom-built connectors + open API | QuickBooks, Xero, NetSuite, Sage 50/100/300, Sage Intacct | None identified - custom-built | ADP, Workday, Gusto | HubSpot, Salesforce, Chargebee, Zuora |

---

## 2. INTEGRATION APPROACH ANALYSIS

### Pattern 1: Direct Custom-Built Integrations (Most Common)
**Used by:** Fathom, Syft, Jirav, Mosaic, Puzzle, Cube

This is the dominant approach in the SMB/mid-market FP&A space. Companies build direct API connections to each accounting platform individually.

**Advantages:**
- Full control over data mapping and sync logic
- No per-connection fees to third-party providers
- Deeper integration possible (custom fields, metadata)
- No dependency on external provider uptime/changes

**Disadvantages:**
- Expensive to build and maintain (each integration = 1-4 weeks dev time)
- Must track API changes across every platform independently
- Slow to add new platforms
- Each integration is a separate codebase to maintain

**Key observation:** Companies using this approach typically support 5-30 integrations and focus narrowly on the most popular accounting platforms (QuickBooks Online, Xero, NetSuite, Sage Intacct).

### Pattern 2: Unified API Provider (Emerging)
**Used by:** Runway (Merge.dev), Puzzle (Plaid for banking)

Runway is the clearest example of a company leveraging unified APIs to rapidly scale integration count. By partnering with Merge.dev (for HRIS/accounting) and Fivetran (for broad ETL), Runway claims 750+ integrations while likely maintaining only a handful of first-party connections.

**Advantages:**
- Massive integration count with minimal engineering investment
- New integrations added automatically as the provider expands
- Standardized data models across platforms
- Faster time to market

**Disadvantages:**
- Per-connection costs ($50-65/linked account with Merge)
- Less control over data depth and mapping
- Dependency on third-party provider reliability
- May not support advanced features of each platform

### Pattern 3: iPaaS / Middleware Platform
**Used by:** Planful (Boomi), Vena (Microsoft Fabric/Power Automate), DataRails (Celigo)

Enterprise-focused FP&A tools leverage integration platforms as a service to connect to enterprise ERP systems.

**Advantages:**
- Enterprise-grade reliability and security
- Pre-built connectors for major ERPs (SAP, Oracle, Dynamics)
- Bi-directional data flow support
- Customer IT teams can manage connections

**Disadvantages:**
- High cost (enterprise iPaaS starts at $10K+/year)
- Complex for SMBs to configure
- Overkill for simple accounting connections
- Requires technical implementation support

---

## 3. ACCOUNTING PLATFORM COVERAGE BY COMPETITOR

| Accounting Platform | DataRails | Fathom | Syft | Jirav | Runway | Mosaic | Puzzle | Planful | Vena | Cube |
|-------------------|-----------|--------|------|-------|--------|--------|--------|---------|------|------|
| QuickBooks Online | Y | Y | Y | Y | Y | Y | N | Y | Y | Y |
| QuickBooks Desktop | Y | Y | N | Y | N | N | N | N | N | N |
| Xero | Y | Y | Y | Y | Y | Y | N | N | Y | Y |
| NetSuite | Y | N | N | Y | Y | Y | N | Y | Y | Y |
| Sage Intacct | Y | N | N | Y | Y | Y | N | Y | Y | Y |
| Sage 50/200 | N | Y | N | N | N | N | N | N | N | Y |
| Sage Business Cloud | N | Y | N | N | N | N | N | N | N | N |
| MYOB | N | Y | N | N | N | N | N | N | N | N |
| FreeAgent | N | Y | N | N | N | N | N | N | N | N |
| FreshBooks | N | N | Y | N | N | N | N | N | N | N |
| Microsoft Dynamics | N | N | N | N | N | N | N | N | Y | N |
| SAP | N | N | N | N | N | N | N | Y | Y | N |
| Oracle | N | N | N | N | N | N | N | Y | N | N |
| Excel/CSV Import | Y | Y | Y | Y | Y | Y | N | Y | Y | Y |

**Key UK-market insight:** For Grove's UK SME target:
- **Xero** is the dominant platform (9/10 competitors support it)
- **QuickBooks Online** is universal (9/10 support it)
- **Sage** variants (50, 200, Business Cloud, Intacct) have fragmented support
- **FreeAgent** (popular UK micro-business tool, HMRC Making Tax Digital compatible) is only supported by Fathom
- **MYOB** is only relevant for Australian market (Fathom's heritage)

---

## 4. UNIFIED API PROVIDER COMPARISON

### Codat (Accounting-Focused Unified API)
**Website:** codat.io
**Founded:** 2017, London, UK
**Focus:** Financial data for lending, payments, and commerce platforms
**Supported platforms:** 30+ (Xero, QuickBooks Online, QuickBooks Desktop, Sage 50, Sage 200, Sage Intacct, Sage Business Accounting, NetSuite, FreshBooks, FreeAgent, Wave, MYOB, Microsoft Dynamics 365, KashFlow, Pandle, Zoho Books, ClearBooks, Exact)

**Pricing:**
- Free tier for development/testing
- Platform fee (annual) + per linked account (variable)
- Industry estimates: ~$50-65 per linked account
- Custom pricing - must speak to sales
- Not publicly listed

**Strengths for Grove:**
- UK-headquartered, strong UK accounting platform coverage
- Supports FreeAgent, KashFlow, Pandle (UK-specific platforms)
- Purpose-built for accounting data normalization
- Standardized data model for chart of accounts, P&L, balance sheet
- Banking integrations included
- Strong in fintech/lending space (proven at scale)

**Weaknesses:**
- No HRIS, CRM, or non-financial integrations
- Per-connection pricing can scale expensively
- Less deep than custom integrations for advanced features

### Merge.dev (Broad Unified API)
**Website:** merge.dev
**Focus:** Broad B2B integration across HR, accounting, CRM, ticketing, ATS, file storage
**Supported platforms:** 180+ across all categories; accounting includes QuickBooks, Xero, NetSuite, Sage Intacct, FreshBooks, and others
**Notable customer:** Runway (FP&A platform)

**Pricing:**
- Launch plan: First 3 linked accounts free
- Base plan: $650/month for up to 10 production linked accounts
- Additional accounts: $65 per linked account
- Enterprise plans: Custom (contract-based, annual)

**Strengths for Grove:**
- Already proven in FP&A space (Runway uses it)
- Covers accounting + HRIS + CRM in one provider
- Would give Grove broad integration count quickly
- Good developer documentation

**Weaknesses:**
- $650/month base is significant for early-stage
- $65 per linked account adds up fast with growing users
- Accounting coverage less deep than Codat
- Less UK-specific platform coverage
- Accounting is not their primary focus

### Rutter (Commerce Unified API)
**Website:** rutter.com
**Focus:** Commerce, accounting, and payment platforms for B2B financial products
**Supported platforms:** 60+ (accounting, commerce, payments, ads)

**Pricing:**
- Free plan with limited features
- Enterprise: ~$56K/year (contract-based)
- Per-connected-business model

**Strengths for Grove:**
- Strong commerce + accounting combination
- Good for e-commerce focused SMBs
- Normalized data model

**Weaknesses:**
- Very expensive for early-stage
- Commerce focus is tangential to Grove's core use case
- Less relevant for service businesses (Grove's initial target)
- Limited HRIS/payroll coverage

### Plaid (Banking Unified API)
**Website:** plaid.com
**Focus:** Banking connections, financial data, identity verification
**Coverage:** 12,000+ financial institutions globally

**Pricing:**
- Sandbox: Free
- Pay as You Go: $0.50-2.00 per successful link
- Growth: Starting at $100/month with volume discounts
- Scale: Starting at $500/month with custom solutions
- Volume discounts at 10K+ connections (30-50% reduction)

**Strengths for Grove:**
- Industry standard for banking connections
- Massive institution coverage
- Real-time balance and transaction data
- UK coverage through Open Banking

**Weaknesses:**
- Banking only - does not cover accounting software
- Identity verification adds cost
- Reconnection costs can increase effective per-user price by 40-60%
- Complementary to (not replacement for) accounting API

### Railz / FIS Accounting Data as a Service (Accounting + Banking Unified API)
**Website:** railz.ai
**Focus:** Accounting + banking + commerce data for financial institutions
**Status:** Acquired by FIS, rebranded as "Accounting Data as a Service"
**Supported platforms:** Xero, QuickBooks, Sage, FreshBooks, Wave, Zoho Books, Shopify, Square + banking via Plaid

**Pricing:**
- Free: Up to 5 lifetime connected businesses
- Pay As You Go: Per connected business/month, custom pricing
- Enterprise: Custom pricing with tax benchmarking analytics

**Strengths for Grove:**
- Combines accounting + banking in one API (unique)
- Normalized financial data model
- Tax benchmarking analytics (relevant for UK advisory)
- Free tier for development
- Acquired by FIS adds enterprise credibility

**Weaknesses:**
- Smaller integration coverage than Codat
- Less proven in FP&A use cases
- FIS acquisition may shift product direction toward enterprise banking
- No HRIS/CRM coverage

---

## 5. WHICH UNIFIED API PROVIDERS ARE USED IN FP&A?

Based on research, unified API adoption in FP&A is still **early stage**:

| Provider | Used By (FP&A) | Category |
|----------|----------------|----------|
| **Merge.dev** | Runway | HRIS + Accounting |
| **Fivetran** | Runway | ETL / Data warehouse |
| **Plaid** | Puzzle | Banking |
| **Boomi** | Planful | iPaaS / ERP |
| **Microsoft Fabric** | Vena | iPaaS / Microsoft ecosystem |
| **Celigo** | DataRails | iPaaS |
| **Codat** | Not identified in any of the 10 | Accounting |
| **Railz** | Not identified in any of the 10 | Accounting + Banking |
| **Rutter** | Not identified in any of the 10 | Commerce + Accounting |

**Critical finding:** Most FP&A companies (7 out of 10) still build custom integrations. Only Runway has adopted a unified API strategy at scale. The enterprise players (Planful, Vena) use iPaaS platforms. Codat, despite being the most accounting-focused unified API, is not used by any of the 10 FP&A competitors researched -- it is primarily adopted by lending, payments, and banking platforms.

---

## 6. UNIFIED API PROVIDER PRICING COMPARISON

| Provider | Free Tier | Base Cost | Per-Connection Cost | Annual Cost (50 connections) | Annual Cost (200 connections) | Best For |
|----------|-----------|-----------|--------------------|-----------------------------|-------------------------------|----------|
| **Codat** | Dev/test only | Platform fee (custom) | ~$50-65/linked account | ~$30K-40K est. | ~$100K-130K est. | Accounting-focused fintech |
| **Merge.dev** | 3 free accounts | $650/month ($7,800/yr) | $65/linked account | ~$10,400/yr | ~$20,150/yr | Broad B2B SaaS |
| **Rutter** | Limited free | Custom | Per-business/month | ~$56K/yr (enterprise) | Custom | Commerce + accounting |
| **Plaid** | Sandbox only | $100-500/month | $0.50-2.00/link | ~$1,200-6,000/yr | ~$2,400-24,000/yr | Banking only |
| **Railz** | 5 free businesses | Custom | Per-business/month | Custom | Custom | Accounting + banking |

**Note:** All pricing is approximate and based on publicly available information. Actual costs depend on negotiation, volume, and specific feature requirements.

---

## 7. RECOMMENDATION FOR GROVE

### Phase 1 (Sprint 2, Now): Custom-Built Direct Integrations
**Recommendation: Build direct Xero and QuickBooks Online integrations in-house.**

**Rationale:**
- 9 out of 10 competitors support both platforms -- they are non-negotiable
- Kevin Steel's Inflectiv Intelligence proves a solo developer can build Xero + QBO + Sage in ~12 hours of focused work with Claude Code
- Custom integrations give Grove full control over data mapping and the auto-mapping intelligence layer (Claude API suggesting GL account mappings with confidence scores)
- No per-connection fees eating into margins at the critical early stage
- Grove's UK SME target means Xero coverage alone addresses ~70%+ of the market

**Build order:**
1. **Xero** (UK market leader, 2-click OAuth flow, well-documented API)
2. **QuickBooks Online** (US/UK coverage, Intuit's API is mature)
3. **Excel/CSV import** (catch-all for any unsupported platform)
4. **Sage Business Cloud** (UK mid-market, Kevin built it in 3 hours)

### Phase 2 (Sprint 6-8): Evaluate Codat for UK Expansion
**Recommendation: Evaluate Codat to rapidly expand UK accounting platform coverage.**

**Rationale:**
- Codat is UK-headquartered and has the deepest UK accounting platform coverage
- Covers FreeAgent, KashFlow, Pandle, Sage 50, Sage 200 -- platforms that no FP&A competitor except Fathom touches
- By Phase 2, Grove will have enough users to negotiate volume pricing
- Would differentiate Grove from competitors who only support the top 3-4 platforms
- Codat's normalized data model aligns with Grove's governed data pipeline concept

**Cost consideration:** At 50 connected businesses, estimate ~$30-40K/year. This is only justified when monthly revenue from those connections exceeds the cost. At a hypothetical $50/month per business, you would need the Codat-exclusive platforms to contribute ~50-65 paying customers to break even on the Codat fee alone.

### Phase 3 (Post-Launch): Add Plaid for Banking
**Recommendation: Add Plaid for real-time bank balance and cash flow intelligence.**

**Rationale:**
- DataRails' Cash Management product validates real-time bank data as a high-value feature
- Plaid's Open Banking support works in UK
- Real-time cash position monitoring is a feature SME owners desperately want
- Pay-as-you-go pricing ($0.50-2.00/link) keeps costs proportional to usage

### What NOT to Do
- **Do not use Merge.dev** at this stage. At $650/month base + $65/connection, the cost is prohibitive for early-stage and the accounting coverage is weaker than Codat. Merge makes sense if Grove needs HRIS integrations, which is Phase 2+ territory.
- **Do not use Rutter.** Commerce-focused, expensive, and not aligned with Grove's service-business target market.
- **Do not use an iPaaS (Boomi, Workato, Celigo).** These are enterprise tools with enterprise pricing and complexity. They are designed for companies connecting SAP and Oracle, not UK SMBs on Xero.
- **Do not try to match Runway's 750+ integration count.** That number is inflated by Fivetran's data warehouse connectors. Grove's users need 3-5 accounting integrations done extremely well, not 750 integrations done superficially.

### Integration Architecture Recommendation

```
Phase 1 (Now):
  Xero API -----> [Grove OAuth + Auto-Mapping Layer] -----> Governed Data Pipeline
  QBO API  -----> [Grove OAuth + Auto-Mapping Layer] -----> Governed Data Pipeline
  Excel/CSV ----> [Upload + Manual Mapping] ------------> Governed Data Pipeline

Phase 2 (Month 6+):
  Codat ---------> [Normalized Accounting Data] ---------> Governed Data Pipeline
  (FreeAgent, Sage 50, Sage 200, KashFlow, etc.)

Phase 3 (Month 9+):
  Plaid ---------> [Bank Balances + Transactions] -------> Cash Flow Intelligence
```

### Competitive Differentiation Through Integration Quality, Not Quantity

The research reveals a clear strategic insight: **no FP&A competitor has solved the auto-mapping problem well.** Kevin Steel spent more time on GL account mapping than on the API connection itself. DataRails requires implementation support. Jirav's setup requires finance knowledge.

Grove's defensible advantage is not the number of integrations but the **intelligence of the integration layer:**
- Claude API suggests GL account mappings with confidence scores
- User approves or overrides (governance principle)
- Mappings improve over time across the user base (network effect)
- Non-finance users can connect their accounting software without understanding chart of accounts structure

This is the integration moat. Build it before expanding platform count.

---

## 8. KEY FINDINGS SUMMARY

1. **7 out of 10 FP&A companies build custom integrations.** The unified API approach is still emerging in this space.

2. **Only Runway uses a unified API (Merge.dev) at scale.** Their 750+ integration claim is primarily powered by Fivetran (ETL) + Merge (HRIS/accounting), with limited first-party connections.

3. **Codat is underutilized in FP&A.** Despite being the most accounting-focused unified API with strong UK coverage, none of the 10 competitors use it. This represents an opportunity for Grove to differentiate with broader UK platform coverage in Phase 2.

4. **Enterprise FP&A uses iPaaS (Boomi, Fabric).** Planful and Vena connect to enterprise ERPs through middleware. This is irrelevant for Grove's SME target.

5. **Xero + QuickBooks Online = table stakes.** Every serious FP&A competitor supports both. Grove must have these at launch.

6. **Fathom has the best UK accounting coverage** among direct competitors (Xero, QBO, MYOB, Sage, FreeAgent). This is noteworthy since Fathom is also the closest competitor to Grove's advisory-first model.

7. **Puzzle proves API-first architecture works for startups.** Their direct API integrations with Mercury, Stripe, Ramp, and Brex (plus Plaid for broader banking) deliver a superior data quality experience vs. bank feed approaches.

8. **The auto-mapping layer is the unsolved problem.** This is where Grove can win -- not by having more integrations, but by having smarter integrations.
