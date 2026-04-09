# Skill: Revenue Model Awareness

## Purpose
The platform must understand HOW a business generates revenue because it fundamentally changes how every metric is interpreted:
- A subscription business with 95% recurring revenue is valued on ARR multiples
- A project-based business is valued on backlog + pipeline
- A retail business is valued on foot traffic × conversion × AOV

If the platform doesn't know the revenue model, it's just reformatting Xero numbers with no intelligence.

## When to Apply
- BEFORE displaying client count, AOV, or revenue per customer
- BEFORE building revenue projections or forecasts
- WHEN showing revenue breakdown or growth metrics
- WHEN building KPI targets or benchmarks

## Revenue Model Types

### 1. Subscription/Recurring (SaaS, memberships)
- Key metrics: MRR, ARR, churn rate, LTV, CAC, LTV:CAC ratio
- Revenue recognition: monthly, deferred if annual billing
- Client count = active subscribers (Xero recurring invoice contacts)
- Growth: net new MRR = new MRR - churned MRR + expansion MRR
- Seasonality: typically flat, Q4 enterprise push

### 2. Project-Based (bridal, construction, consulting, agency)
- Key metrics: Pipeline value, backlog, average project value, utilisation
- Revenue recognition: milestone-based or on delivery
- Client count ≠ invoice count (each project has multiple invoices)
- AOV = total revenue / unique clients (NOT invoice count)
- Growth: win rate × pipeline value
- Seasonality: varies by industry

### 3. Transactional/Retail (e-commerce, shops)
- Key metrics: Transaction count, AOV, repeat purchase rate, basket size
- Revenue recognition: on sale/delivery
- Client count = unique purchasers (Xero may not track individuals)
- Growth: traffic × conversion × AOV
- Seasonality: highly seasonal (Black Friday, Christmas, seasonal collections)

### 4. Service Retainer (accounting, legal, marketing agency)
- Key metrics: Monthly retainer value, client retention, scope creep
- Revenue recognition: monthly as service delivered
- Client count = active retainer clients
- Growth: new retainers - lost retainers
- Seasonality: quiet in August/December

### 5. Marketplace/Platform (commission-based)
- Key metrics: GMV, take rate, seller count, buyer count
- Revenue recognition: on transaction completion
- Growth: both supply and demand side

## How to Detect from Xero + Interview

### From Interview Data
- `revenue_model` field captures the type directly
- `revenue_streams` lists distinct income sources
- `key_clients_description` reveals concentration risk

### From Xero Data
- Invoice frequency per contact → project-based (few contacts, many invoices) vs subscription (many contacts, regular invoices)
- Invoice amount distribution → tight cluster = subscription, wide spread = project
- Revenue account names → "Subscription", "Retainer", "Project", "Sales" etc.
- Recurring invoice flag in Xero → confirms subscription model

### Auto-Detection Logic
```
IF average invoices per contact > 3 AND invoice amounts vary > 50%
  → Project-based (bridal, consulting, construction)
  → Client count = unique contacts, NOT invoice count
  → AOV = total revenue / unique contacts

IF invoice frequency is monthly AND amounts are consistent ± 10%
  → Subscription
  → MRR = sum of latest month's recurring invoices
  → Churn = clients last month - clients this month that were there last month

IF many contacts with 1-2 invoices each AND amounts cluster tightly
  → Transactional/Retail
  → AOV = average invoice amount
  → Growth = transaction count growth × AOV stability
```

## What Changes Per Revenue Model

### Client Count Display
| Model | What to Count | Source |
|-------|--------------|--------|
| Subscription | Active subscribers | Recurring invoices |
| Project-based | Unique project clients | CRM / deduplicated contacts |
| Retail | Unique purchasers | May not be meaningful per Xero |
| Retainer | Active retainer clients | Regular monthly invoices |

### KPI Selection
| Model | Primary KPIs |
|-------|-------------|
| Subscription | MRR, Churn, LTV, CAC, NRR |
| Project-based | Pipeline, Backlog, Win Rate, AOV, Utilisation |
| Retail | AOV, Transaction Count, Repeat Rate, Basket Size |
| Retainer | Retention Rate, ARPC, Scope Growth |

### Forecast Approach
| Model | How to Forecast |
|-------|----------------|
| Subscription | Current MRR × (1 - churn + expansion) × months |
| Project-based | Pipeline × win rate + confirmed backlog |
| Retail | Traffic trend × conversion × AOV trend |
| Retainer | Current retainers × retention rate + new business |

## Anti-Patterns
1. **Counting Xero contacts as "clients"** for project businesses → overcounts by 3-5x
2. **Using subscription KPIs for project businesses** → MRR is meaningless for a bridal business
3. **Flat-line forecasting** for seasonal businesses → wrong by design
4. **Ignoring concentration risk** → if top 3 clients = 50% revenue, that's a risk, not a feature
5. **Assuming all revenue is recurring** → most businesses have a mix
