# GOVERNED OS FOR SME ADVISORY
## Master Agent Operating Rules

You are building the Governed Operating System for SME Advisory.

This is NOT:
- An AI spreadsheet
- An autonomous AI CFO
- A consumer SaaS dashboard
- A hard-coded industry tool
- A scenario-specific modelling app

This IS:
- Institutional-grade infrastructure
- Governance-first architecture
- AI-assisted (never AI-autonomous)
- Multi-tenant, audit-trailed, investor-ready
- A generalised financial modelling engine

---

# 1. Core Mission

Build a secure operating system that connects:

- SMEs
- Fractional Executives
- Investors

The platform turns messy financial data (starting with Xero) into:

- Structured financial records
- Deterministic financial models
- KPI dashboards
- Scenario modelling capability (Phase 2)
- Investor-ready reporting (Phase 3)

Trust is the moat.
Governance is the foundation.
Extensibility is mandatory.

---

# 2. Problem Scope Clarification

Example scenarios (unit economics, DTC vs wholesale, travel modelling, deposits, etc.)
are illustrative only.

You are NOT building:
- Hard-coded scenario models
- Industry-specific assumptions
- Fashion-specific logic
- DTC vs wholesale templates

You ARE building:
- A generalised financial modelling engine
- A reusable unit economics system
- A structured assumption framework
- A scenario container architecture
- Deterministic recalculation infrastructure

All modelling must be:
- Assumption-driven
- Industry-agnostic
- Modular
- Extensible without schema redesign

---

# 3. Non-Negotiable Principles

## 3.1 Governance First

Every feature must:
- Be auditable
- Respect role-based access control
- Preserve data lineage
- Log all mutations immutably
- Prevent cross-tenant leakage

No silent mutations.
No invisible logic.
No trust gaps.

---

## 3.2 AI Guardrails

AI:
- NEVER writes directly to the database
- Proposes structured JSON outputs only
- Must include metadata:
  - model_version
  - confidence_score
  - source_data_ids
- Cannot execute financial calculations
- Cannot bypass deterministic logic

All financial math:
- Deterministic code only
- Fully test-covered
- Reproducible

---

## 3.3 Multi-Tenancy Enforcement

All data tables must:
- Include org_id
- Enforce row-level security at DB level
- Prevent cross-org reads

Never rely solely on frontend checks.

---

## 3.4 Development Philosophy

- Simplicity over cleverness
- Security over speed
- Deterministic logic over AI magic
- Phase-gated delivery
- No premature optimisation
- No scenario-specific build

If unsure:
Ask — "Does this increase institutional trust?"

If not, remove it.

---

# 4. Current Build Phase

We begin with:

PHASE 1 — FOUNDATION

Deliver only:
- Auth
- Organisation setup
- Role-based access
- Xero OAuth integration
- Raw financial ingestion
- Normalisation pipeline
- Core actuals dashboard
- Immutable audit logging

No scenario engine yet.
No investor portal yet.
No intelligence layer yet.

Architect for extensibility.
Do not build Phase 2 features prematurely.

---

# 5. Definition of Success (Phase 1)

- SME connects Xero
- Data ingests correctly
- Dashboard reconciles with Xero
- Advisor can be invited
- Audit logs capture all mutations
- RLS prevents cross-tenant reads
- No security violations

Build infrastructure worthy of investor scrutiny.
