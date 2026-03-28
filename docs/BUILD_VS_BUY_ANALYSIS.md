# Grove Build vs Buy Analysis
## March 2026

> Every area where Grove makes a "build it ourselves" or "use a third-party service" decision.
> Updated whenever a new area is identified or a phase gate is reached.

---

## Decision Matrix (Quick Reference)

| Area | NOW (0-3 months) | 6 MONTHS | 12 MONTHS | Monthly Cost Now |
|---|---|---|---|---|
| **Integrations** | Custom Xero + QBO + CSV | + Codat for UK expansion | + Plaid for banking | Free |
| **PDF Generation** | Puppeteer (free) | + DocRaptor if needed ($29/mo) | Dedicated report microservice | Free |
| **Email** | Resend (free tier, 3K/mo) | Resend ($20/mo) | + AWS SES for bulk | Free |
| **Payments** | Paddle (MoR, handles UK VAT) | Paddle | + Stripe for enterprise tier | 5% + $0.50/tx |
| **Search** | PostgreSQL FTS via Supabase | + Typesense ($15/mo) | + Semantic search | Free |
| **Charts** | Tremor + Recharts (free) | + Custom D3 | + Highcharts for enterprise | Free |
| **Storage** | Supabase Storage (included) | + Cloudflare R2 for reports | Tiered storage strategy | Free |
| **Real-time** | Supabase Realtime + SSE | Same | + Ably if collaborative features | Free |
| **Background Jobs** | Inngest (free, 50K runs/mo) | + Trigger.dev for long jobs | Consolidate | Free |
| **Monitoring** | Sentry (free + startup credits) | + Axiom ($25/mo) | Sentry Team + LogRocket | Free |
| **AI/LLM** | Claude API only | + GPT-4o-mini for simple tasks | + LiteLLM proxy | Usage-based |

**Total additional cost now:** ~$0-25/mo (most on free tiers)
**Total at 6 months:** ~$100-150/mo
**Total at 12 months:** ~$300-500/mo (excluding AI API usage and Paddle fees)

---

## 1. Accounting Integrations

**Decision:** Custom-built direct integrations now. Unified API (Codat) later.

**Rationale:** 7 out of 10 FP&A competitors build custom. Xero + QBO covers 95% of UK SMBs. Codat costs ~$30-40K/yr at 50 connections, not justified until revenue supports it.

| Phase | Action | Trigger |
|---|---|---|
| Now | Xero OAuth (done), QuickBooks Online, Excel/CSV, Sage Business Cloud | Immediate |
| Month 6 | Evaluate Codat for UK platforms (FreeAgent, KashFlow, Sage 50/200) | When 50+ paying users OR 3+ requests for unsupported platforms |
| Month 9 | Add Plaid for real-time banking/cash flow | When cash flow forecasting feature is built |

**Full analysis:** [docs/FPA_INTEGRATION_LANDSCAPE.md](./FPA_INTEGRATION_LANDSCAPE.md)

---

## 2. PDF / Report Generation

**Decision:** Puppeteer (self-hosted, free) now. DocRaptor if complex layouts needed.

**Rationale:** Fathom and most FP&A platforms use server-side HTML-to-PDF. Puppeteer renders React components to PDF with zero licensing cost. DocRaptor ($29/mo) only needed for pixel-perfect CSS Paged Media (multi-page layouts with headers/footers).

| Phase | Action | Trigger |
|---|---|---|
| Now | Puppeteer on background job (Inngest) | Board pack generation feature |
| Month 6 | Evaluate DocRaptor | If customers report layout/formatting issues in board packs |
| Month 12 | Dedicated report builder microservice | If offering white-label/customisable board packs |

---

## 3. Email / Transactional Notifications

**Decision:** Resend (free tier, 3,000 emails/mo). React Email for templates.

**Rationale:** Best developer experience, React Email integrates with Next.js. SendGrid killed their free plan. Postmark has no free tier. AWS SES is cheapest at scale but harder to set up.

| Phase | Action | Trigger |
|---|---|---|
| Now | Resend free tier + React Email templates | Immediate (already have templates built) |
| Month 6 | Resend $20/mo plan | When exceeding 3,000 emails/mo |
| Month 12 | Add AWS SES for bulk (weekly digests) | When sending 100K+ emails/mo |

---

## 4. Payments / Billing / Subscriptions

**Decision:** Paddle (Merchant of Record). Handles UK VAT automatically.

**Rationale:** Paddle collects, files, and remits VAT in all jurisdictions. 5% + $0.50/tx is higher than Stripe's 2.9% + $0.30, but saves 10-20 hours/month of tax admin. At early-stage revenue, convenience beats margin.

| Phase | Action | Trigger |
|---|---|---|
| Now | Paddle for all self-serve billing | When launching paid plans |
| Month 6 | Stay on Paddle | Re-evaluate at $50K+ MRR |
| Month 12 | Add Stripe + Chargebee for enterprise annual invoicing | When enterprise sales begin |

---

## 5. In-App Search

**Decision:** PostgreSQL full-text search via Supabase (free, already available).

**Rationale:** For searching transactions, accounts, report titles, client names, Postgres tsvector is more than adequate up to ~100K records. Zero additional cost.

| Phase | Action | Trigger |
|---|---|---|
| Now | PostgreSQL FTS in CMD+K search bar | Already partially built |
| Month 6 | Add Typesense Cloud ($15/mo) | When adding document search (within PDFs, AI outputs) |
| Month 12 | Semantic/vector search | When users need "find reports about cash flow problems" style queries |

---

## 6. Data Visualisation / Charting

**Decision:** Tremor + Recharts (both free, open source).

**Rationale:** Tremor gives production-ready financial dashboard components (KPI cards, area charts, spark lines) built on Tailwind CSS. It uses Recharts under the hood, so full customisation is available. Fastest path to professional financial dashboards.

| Phase | Action | Trigger |
|---|---|---|
| Now | Tremor + Recharts for all dashboard charts | Already partially in use |
| Month 6 | Custom D3 components for specialised charts | When building waterfall charts, Sankey diagrams |
| Month 12 | Highcharts ($590/dev) for enterprise | If enterprise clients need embedded/exportable charts in board packs |

---

## 7. Document Storage

**Decision:** Supabase Storage (included in Pro plan, 100GB).

**Rationale:** Integrated with Supabase Auth and RLS. Uploaded documents are automatically scoped to the correct organisation. Zero additional vendor.

| Phase | Action | Trigger |
|---|---|---|
| Now | Supabase Storage for all files | Already available |
| Month 6 | Add Cloudflare R2 for generated reports/PDFs | If download volume causes egress cost concerns |
| Month 12 | Tiered strategy: Supabase (hot/auth), R2 (reports), archive (old packs) | When storage exceeds 100GB |

---

## 8. Real-time / Live Data

**Decision:** Supabase Realtime + Server-Sent Events (both free/included).

**Rationale:** Financial data is batch-oriented (monthly close, quarterly). Real-time is only needed for: sync progress updates, AI analysis streaming, notification badges. Supabase Realtime + SSE handle all of these.

| Phase | Action | Trigger |
|---|---|---|
| Now | Supabase Realtime for DB changes, SSE for AI streaming | Already partially in use |
| Month 6 | Same | No change needed |
| Month 12 | Add Ably ($29/mo) | Only if building collaborative features (multiple users editing a forecast) |

---

## 9. Background Jobs / Queues

**Decision:** Inngest (free tier, 50K runs/mo). Designed for Vercel serverless.

**Rationale:** Inngest runs inside Vercel functions with durable execution (step functions with automatic per-step retries). Perfect for: Xero sync workflows, report generation, AI analysis pipelines. BullMQ requires a persistent Redis server which doesn't fit Vercel.

| Phase | Action | Trigger |
|---|---|---|
| Now | Inngest for all background jobs | When building sync/report/AI pipelines |
| Month 6 | Add Trigger.dev v3 for long-running jobs | If Xero historical imports exceed Vercel function timeout |
| Month 12 | Consolidate or maintain both | Based on workload patterns |

---

## 10. Error Monitoring / Observability

**Decision:** Sentry (free tier, apply for startup credits).

**Rationale:** Industry standard. Integrates with Next.js, Vercel, and every part of the stack. Covers error tracking, performance monitoring, and basic session replay. Startup program gives $50K in credits.

| Phase | Action | Trigger |
|---|---|---|
| Now | Sentry free tier (5K errors/mo) | Immediate |
| Month 6 | Add Axiom ($25/mo) for structured logging | When debugging AI pipelines (logging Claude calls, token usage) |
| Month 12 | Sentry Team plan + LogRocket | When customer support needs to reproduce user-reported issues |

---

## 11. AI / LLM Strategy

**Decision:** Claude API exclusively for now. Best reasoning for financial analysis.

**Rationale:** Digits uses 18 custom models. Puzzle started with GPT-3.5, upgraded to GPT-4. DataRails uses Claude. For Grove's use case (financial reasoning, board pack narratives, interview analysis), Claude is the strongest single choice. Multi-model adds complexity without proportional benefit at this stage.

| Phase | Action | Trigger |
|---|---|---|
| Now | Claude API only (Sonnet for speed, Opus for complex analysis) | Current approach |
| Month 6 | Add GPT-4o-mini for cheap tasks (categorisation, extraction) | When AI API costs exceed $500/mo |
| Month 12 | Add LiteLLM proxy for unified multi-model routing | When using 3+ models regularly |

---

## How to Use This Document

1. **Before building any new feature**, check if it falls into one of these areas
2. **Check the phase trigger** to see if we've hit the milestone to change approach
3. **Update this document** when a phase gate is reached or a decision changes
4. **Reference from CLAUDE.md** so every session starts with awareness of these decisions
