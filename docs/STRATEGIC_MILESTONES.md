# Strategic Milestones and Phase Triggers
## Grove Decision Log

> This file tracks WHEN to act on strategic decisions documented in BUILD_VS_BUY_ANALYSIS.md.
> Check this file at the start of every sprint and when any milestone is reached.

---

## Active Phase: NOW (0-3 months from March 2026)

### Current Stack (What We Use Today)
- Integrations: Custom Xero OAuth
- PDF: Not yet implemented
- Email: Custom templates (not yet sending)
- Payments: Not yet implemented
- Search: CMD+K with basic routing
- Charts: Recharts (some pages)
- Storage: Supabase Storage
- Real-time: Supabase Realtime + SSE
- Background Jobs: None (inline execution)
- Monitoring: None
- AI: Claude API (Sonnet + Opus)

### Immediate Actions (Do Now)
- [ ] Add QuickBooks Online integration
- [ ] Add Excel/CSV import flow
- [ ] Set up Resend for transactional email
- [ ] Set up Sentry (apply for startup program)
- [ ] Set up Inngest for background jobs (Xero sync, report gen)
- [ ] Install Tremor for dashboard charts
- [ ] Set up Paddle account for billing

---

## Phase 2 Triggers (Month 6, ~September 2026)

**Check these conditions monthly. When ANY trigger fires, read the corresponding section in BUILD_VS_BUY_ANALYSIS.md and plan the migration.**

| Area | Trigger Condition | Action When Triggered |
|---|---|---|
| Integrations (Codat) | 50+ paying users OR 3+ requests for FreeAgent/Sage50/KashFlow | Evaluate Codat, get pricing, build proof of concept |
| PDF (DocRaptor) | Customer complaints about board pack layout/formatting | Trial DocRaptor, compare output quality |
| Email (upgrade) | Exceeding 3,000 emails/month | Upgrade Resend to $20/mo plan |
| Search (Typesense) | Building document search feature (search within PDFs/AI outputs) | Set up Typesense Cloud ($15/mo) |
| Charts (D3) | Need waterfall charts, Sankey diagrams, or custom financial viz | Build custom D3 components |
| Storage (R2) | Egress costs from Supabase Storage become noticeable | Add Cloudflare R2 for generated reports |
| Jobs (Trigger.dev) | Xero historical imports timeout on Vercel | Add Trigger.dev v3 for long-running jobs |
| Monitoring (Axiom) | Debugging AI pipelines becomes difficult | Add Axiom for structured logging ($25/mo) |
| AI (multi-model) | AI API costs exceed $500/mo | Add GPT-4o-mini for simple categorisation/extraction tasks |

---

## Phase 3 Triggers (Month 12, ~March 2027)

| Area | Trigger Condition | Action When Triggered |
|---|---|---|
| Integrations (Plaid) | Cash flow forecasting feature is built | Add Plaid for real-time bank balances |
| Payments (Stripe) | Enterprise sales with annual invoicing begin | Add Stripe + Chargebee alongside Paddle |
| Search (semantic) | Users searching for concepts not keywords | Add vector/semantic search layer |
| Charts (Highcharts) | Enterprise clients need embedded charts in exports | Evaluate Highcharts license ($590/dev) |
| Real-time (Ably) | Building collaborative features (multi-user forecast editing) | Add Ably ($29/mo) |
| Monitoring (LogRocket) | Support team needs to reproduce user-reported issues | Add LogRocket for session replay |
| AI (LiteLLM) | Using 3+ models regularly | Deploy LiteLLM proxy for unified routing |

---

## Decision Change Log

| Date | Area | Old Decision | New Decision | Reason |
|---|---|---|---|---|
| 2026-03-28 | Integrations | Custom Xero only | Custom Xero + QBO + CSV now, Codat at 50 users | Competitive analysis showed 9/10 support both Xero + QBO |
| | | | | |

---

## How This System Works

1. **CLAUDE.md references this file** so every AI session is aware of pending milestones
2. **Check triggers at every sprint planning** session
3. **When a trigger fires:** read the BUILD_VS_BUY_ANALYSIS.md section, do fresh research (market changes fast), make a decision, update the change log
4. **Never build without checking here first** to avoid re-inventing what a $15/mo service does better
