# Feature Benchmark Audit #12 -- Advisor Portal (Multi-Client Management)

**Advisory OS vs. Fathom, Syft Analytics, Jirav, Runway, Mosaic, DataRails, Planful, Vena, Cube**
**Date:** 2026-04-02 | **Auditor:** Claude Opus 4.6 | **Codebase:** governed-OS

---

## 1. Feature Inventory

| # | Feature | Type | Location | Current State |
|---|---------|------|----------|---------------|
| 1 | Advisor role definition | Config | `src/types/index.ts` (L2, ROLES array) | **Implemented** -- "advisor" role at hierarchy level 2 (below admin/owner, above viewer) |
| 2 | Role-based access control (requireRole) | Auth | `src/lib/supabase/roles.ts` | **Implemented** -- hierarchical role check, single-org scoped |
| 3 | Fractional CFO persona config | Config | `src/lib/governance/personas.ts` (fractional_cfo) | **Implemented** -- defines defaultDashboard "advisor-multi-client", featureAccess, interviewFocus for "client_portfolio" |
| 4 | Advisor dashboard template | Config | `src/lib/dashboard/templates.ts` (advisorTemplate) | **Partial** -- template exists with variance/KPI focus, but is single-org view (no multi-client widgets) |
| 5 | Invite form (advisor/viewer/admin) | UI | `src/app/(dashboard)/settings/invite-form.tsx` | **Implemented** -- can invite users with "advisor" role to a single org |
| 6 | Team & Roles settings page | UI | `src/app/(dashboard)/settings/team/page.tsx` | **Scaffold** -- shows role descriptions (Admin/Advisor/Viewer/Investor) but no functional team management |
| 7 | Consultant marketplace | UI | `src/app/(dashboard)/consultants/page.tsx`, `src/lib/marketplace/consultants-data.ts` | **Mock/UI only** -- static consultant profiles with "Express Interest" buttons, no backend integration |
| 8 | Investor Portal (data rooms) | UI | `src/app/(dashboard)/investor-portal/page.tsx` | **Mock/UI only** -- demo data rooms, no real sharing or access control |
| 9 | Investor dashboard | UI | `src/app/(dashboard)/investors/page.tsx` | **Mock/UI only** -- hardcoded ARR/MRR/runway metrics |
| 10 | Referral/advisory network | UI + Data | `src/lib/referrals/registry.ts`, `src/app/(dashboard)/billing/referrals/page.tsx` | **Mock** -- referral codes, tier system, but all mock data |
| 11 | Report white-labelling (themes) | Feature | `src/lib/reports/themes.ts` | **Implemented** -- 7 colour themes for board pack PDFs, white-label ready |
| 12 | Multi-tenancy (org_id + RLS) | DB | `supabase/migrations/001_schema.sql` | **Implemented** -- every table has org_id, RLS enabled, but 1 user = 1 org only |
| 13 | Sidebar navigation | UI | `src/components/layout/sidebar.tsx` | **Implemented** -- no multi-client switcher; no advisor-specific nav section |
| 14 | Middleware auth | Auth | `src/middleware.ts` | **Implemented** -- authentication only, no role-based route protection |
| 15 | User profile fetch | Auth | `src/lib/auth/get-user-profile.ts` | **Implemented** -- fetches single org_id per user, no multi-org support |

---

## 2. Benchmark Tables

### 2.1 Client Portfolio Dashboard

| Capability | Advisory OS | Fathom | Syft | Jirav | Runway | Mosaic | DataRails | Planful | Vena | Cube |
|------------|-------------|--------|------|-------|--------|--------|-----------|---------|------|------|
| Multi-client list view | None | YES (core) | YES | No | No | No | YES | No | No | No |
| Client health at a glance | None | YES (traffic lights) | YES (scores) | No | No | No | Partial | No | No | No |
| Aggregated cross-client KPIs | None | YES | Partial | No | No | No | YES | No | No | No |
| Client search/filter | None | YES | YES | N/A | N/A | N/A | YES | N/A | N/A | N/A |
| One-click client drill-in | None | YES | YES | N/A | N/A | N/A | YES | N/A | N/A | N/A |
| Customisable portfolio widgets | None | Partial | No | N/A | N/A | N/A | YES | N/A | N/A | N/A |

**Advisory OS verdict:** The persona config references "advisor-multi-client" as a defaultDashboard value but no actual dashboard template or UI exists with that ID. The implemented advisor template is single-org only.

### 2.2 Client Onboarding Workflow

| Capability | Advisory OS | Fathom | Syft | Jirav | Runway | Mosaic | DataRails | Planful | Vena | Cube |
|------------|-------------|--------|------|-------|--------|--------|-----------|---------|------|------|
| Add new client (wizard) | None | YES | YES | N/A | N/A | N/A | YES | N/A | N/A | N/A |
| Bulk client import | None | No | No | N/A | N/A | N/A | YES | N/A | N/A | N/A |
| Client Xero/QBO connect flow | Single-org only | YES (per client) | YES | N/A | N/A | N/A | YES | N/A | N/A | N/A |
| Onboarding checklist per client | Single-org only | Partial | YES | N/A | N/A | N/A | Partial | N/A | N/A | N/A |
| Template-based client setup | None | YES (presets) | No | N/A | N/A | N/A | YES | N/A | N/A | N/A |

### 2.3 Cross-Client Benchmarking

| Capability | Advisory OS | Fathom | Syft | Jirav | Runway | Mosaic | DataRails | Planful | Vena | Cube |
|------------|-------------|--------|------|-------|--------|--------|-----------|---------|------|------|
| Cross-client KPI comparison | None | YES (core USP) | Partial | No | No | No | YES | No | No | No |
| Industry benchmark overlay | Single-org health score only | YES | YES | No | No | No | Partial | No | No | No |
| Peer group creation | None | YES | No | No | No | No | YES | No | No | No |
| Quartile/percentile ranking | None | YES | Partial | No | No | No | Partial | No | No | No |

### 2.4 Client Health Scoring

| Capability | Advisory OS | Fathom | Syft | Jirav | Runway | Mosaic | DataRails | Planful | Vena | Cube |
|------------|-------------|--------|------|-------|--------|--------|-----------|---------|------|------|
| Automated health score | Single-org only (/health) | YES | YES | No | No | No | Partial | No | No | No |
| Multi-client health dashboard | None | YES | YES | No | No | No | Partial | No | No | No |
| Alert escalation across clients | None | YES (email alerts) | Partial | No | No | No | YES | No | No | No |
| Client risk flagging | None | YES (traffic lights) | YES | No | No | No | Partial | No | No | No |

### 2.5 Multi-Client Reporting

| Capability | Advisory OS | Fathom | Syft | Jirav | Runway | Mosaic | DataRails | Planful | Vena | Cube |
|------------|-------------|--------|------|-------|--------|--------|-----------|---------|------|------|
| Per-client board pack | Single-org only | YES | YES | N/A | N/A | N/A | YES | N/A | N/A | N/A |
| Batch report generation | None | YES | No | N/A | N/A | N/A | YES | N/A | N/A | N/A |
| Cross-client summary report | None | YES (advisory report) | Partial | N/A | N/A | N/A | YES | N/A | N/A | N/A |
| Scheduled report delivery | None | YES (email) | YES (email) | N/A | N/A | N/A | YES | N/A | N/A | N/A |

### 2.6 White-Labelling

| Capability | Advisory OS | Fathom | Syft | Jirav | Runway | Mosaic | DataRails | Planful | Vena | Cube |
|------------|-------------|--------|------|-------|--------|--------|-----------|---------|------|------|
| Report theme customisation | YES (7 themes) | YES | Partial | No | No | No | YES | Partial | Partial | No |
| Custom logo on reports | None | YES | YES | No | No | No | YES | YES | YES | No |
| Custom portal branding | None | YES (URL + logo) | No | No | No | No | YES | Partial | Partial | No |
| Client-facing portal URL | None | YES | No | No | No | No | YES | No | No | No |
| Remove platform branding | None | YES (paid) | No | No | No | No | YES (enterprise) | YES | YES | No |

### 2.7 Client Switching / Navigation

| Capability | Advisory OS | Fathom | Syft | Jirav | Runway | Mosaic | DataRails | Planful | Vena | Cube |
|------------|-------------|--------|------|-------|--------|--------|-----------|---------|------|------|
| Org/client switcher in header | None | YES (dropdown) | YES | N/A | N/A | N/A | YES | N/A | N/A | N/A |
| Recent clients shortlist | None | YES | No | N/A | N/A | N/A | YES | N/A | N/A | N/A |
| Keyboard shortcut switch | None | No | No | N/A | N/A | N/A | No | N/A | N/A | N/A |
| Multi-org data model | None (1 user = 1 org) | YES | YES | N/A | N/A | N/A | YES | N/A | N/A | N/A |

### 2.8 Role-Based Access

| Capability | Advisory OS | Fathom | Syft | Jirav | Runway | Mosaic | DataRails | Planful | Vena | Cube |
|------------|-------------|--------|------|-------|--------|--------|-----------|---------|------|------|
| Role hierarchy (owner > admin > advisor > viewer) | YES (types + roles.ts) | YES | YES | YES | YES | YES | YES | YES | YES | YES |
| Granular per-feature permissions | None (hierarchy only) | Partial | Partial | YES | YES | YES | YES | YES | YES | YES |
| Per-client role assignment | None | YES | YES | N/A | N/A | N/A | YES | N/A | N/A | N/A |
| Role-gated middleware | None (auth only) | YES | YES | YES | YES | YES | YES | YES | YES | YES |
| RLS enforcement at DB | YES (org_id scoped) | N/A (cloud) | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |

### 2.9 Billing Per Client

| Capability | Advisory OS | Fathom | Syft | Jirav | Runway | Mosaic | DataRails | Planful | Vena | Cube |
|------------|-------------|--------|------|-------|--------|--------|-----------|---------|------|------|
| Per-client billing | None | YES (per org) | YES | N/A | N/A | N/A | YES | N/A | N/A | N/A |
| Advisor practice plan | None | YES (practice plan) | YES (accountant plan) | N/A | N/A | N/A | YES (partner) | N/A | N/A | N/A |
| Client seat management | None | YES | YES | N/A | N/A | N/A | YES | N/A | N/A | N/A |
| Usage-based client billing | None | No | No | N/A | N/A | N/A | Partial | N/A | N/A | N/A |

### 2.10 Practice Management Integration

| Capability | Advisory OS | Fathom | Syft | Jirav | Runway | Mosaic | DataRails | Planful | Vena | Cube |
|------------|-------------|--------|------|-------|--------|--------|-----------|---------|------|------|
| XPM / practice management sync | None | YES (Xero PM) | YES (Xero PM) | No | No | No | Partial | No | No | No |
| Client import from accounting GL | None | YES (from Xero) | YES (from Xero) | No | No | No | YES | No | No | No |
| Staff/team utilisation | None | No | Partial | No | No | No | Partial | No | No | No |
| Engagement tracking | None | No | No | No | No | No | Partial | No | No | No |

---

## 3. Competitive Feature Matrix

| Feature Area | Advisory OS | Fathom | Syft | DataRails | Jirav | Runway | Mosaic | Planful | Vena | Cube |
|--------------|:-----------:|:------:|:----:|:---------:|:-----:|:------:|:------:|:-------:|:----:|:----:|
| Multi-client portfolio view | -- | +++ | ++ | +++ | -- | -- | -- | -- | -- | -- |
| Client onboarding flow | -- | +++ | ++ | +++ | -- | -- | -- | -- | -- | -- |
| Cross-client benchmarking | -- | +++ | + | ++ | -- | -- | -- | -- | -- | -- |
| Client health scoring | * | +++ | ++ | + | -- | -- | -- | -- | -- | -- |
| Multi-client reporting | * | +++ | ++ | +++ | -- | -- | -- | -- | -- | -- |
| White-labelling | * | +++ | + | +++ | -- | -- | -- | + | + | -- |
| Client switching/nav | -- | +++ | ++ | +++ | -- | -- | -- | -- | -- | -- |
| Role-based access | + | ++ | ++ | +++ | ++ | ++ | ++ | +++ | +++ | ++ |
| Billing per client | -- | +++ | ++ | +++ | -- | -- | -- | -- | -- | -- |
| Practice mgmt integration | -- | +++ | ++ | + | -- | -- | -- | -- | -- | -- |

Legend: -- = absent, * = partial/single-org, + = basic, ++ = good, +++ = best-in-class

**Key insight:** Fathom and DataRails are the true multi-client advisory platforms. Jirav, Runway, Mosaic, Planful, Vena, and Cube are primarily single-company FP&A tools with no advisor portal. Advisory OS competes on the advisor axis but currently has zero multi-client functionality implemented.

---

## 4. Gap Analysis

| ID | Gap | Severity | Description |
|----|-----|----------|-------------|
| GAP-1 | No multi-org data model | **CRITICAL** | Profile table binds 1 user to 1 org_id. An advisor cannot access multiple client orgs. This is the foundational blocker for all advisor features. |
| GAP-2 | No client portfolio dashboard | **CRITICAL** | Persona config references "advisor-multi-client" dashboard but no template or UI exists. Advisor sees same single-org dashboard as owner. |
| GAP-3 | No org/client switcher | **CRITICAL** | Header shows orgName but has no dropdown to switch between client orgs. Layout fetches single orgId from profile. |
| GAP-4 | No client onboarding workflow | **HIGH** | No "Add Client" flow. Advisor cannot connect a new client's Xero/QBO and initiate setup from their portal. |
| GAP-5 | No cross-client benchmarking | **HIGH** | Health scoring and KPI engine exist for single orgs but cannot compare across orgs. |
| GAP-6 | No batch/cross-client reporting | **HIGH** | Board pack generator works per-org. No batch generation or advisory summary report covering multiple clients. |
| GAP-7 | No client health dashboard | **HIGH** | Health check exists (/health) but only for active org. No aggregated client health view with traffic-light status. |
| GAP-8 | No role-gated middleware | **MEDIUM** | Middleware only checks authentication, not roles. Any authenticated user can navigate to any route. |
| GAP-9 | No per-client role assignment | **MEDIUM** | Roles are global per profile, not per-client. An advisor has the same role across all orgs (once multi-org is built). |
| GAP-10 | No advisor practice billing | **MEDIUM** | Billing is per-org. No practice plan, no per-client seat management, no volume pricing. |
| GAP-11 | No white-label portal branding | **MEDIUM** | Report themes exist but platform UI cannot be branded. No custom logo, custom URL, or per-advisor branding. |
| GAP-12 | No practice management integration | **LOW** | No Xero Practice Manager or similar integration to auto-import client lists. |
| GAP-13 | No scheduled report delivery | **LOW** | Reports generate on-demand only. No email scheduling per client. |
| GAP-14 | No consultant marketplace backend | **LOW** | Consultant page is fully static mock data. No booking, payment, or matching logic. |

---

## 5. Prioritised Recommendations

### P0 -- Ship-blocking (must build before advisor portal can launch)

| # | Recommendation | Addresses | Effort |
|---|---------------|-----------|--------|
| P0-1 | **Build multi-org data model.** Create `advisor_clients` junction table (advisor_user_id, client_org_id, role, status, added_at). Add RLS policies. Update `getUserProfile()` to return array of accessible org_ids. | GAP-1 | L (2-3 days) |
| P0-2 | **Build client switcher.** Add org-switcher dropdown in Header component. Store active_org_id in cookie/context. Update layout.tsx to resolve active org from switcher, not from profile.org_id. | GAP-3 | M (1-2 days) |
| P0-3 | **Build advisor portfolio dashboard.** Create `src/app/(dashboard)/advisor/page.tsx` with client list cards showing: client name, last sync date, health score, key KPIs (revenue, cash runway, margin), alert count. Wire to real data via `advisor_clients` + existing KPI engine. | GAP-2 | L (2-3 days) |
| P0-4 | **Add role-gated middleware.** Extend `middleware.ts` to check profile.role against route-level permission map. Block viewers from write routes, block advisor-only routes from owners. | GAP-8 | S (0.5 day) |

### P1 -- Core differentiators (build in first advisor sprint)

| # | Recommendation | Addresses | Effort |
|---|---------------|-----------|--------|
| P1-1 | **Build "Add Client" workflow.** Advisor-facing wizard: enter client name, send Xero/QBO connect invitation email, track connection status. Creates new org + links via advisor_clients. | GAP-4 | L (2-3 days) |
| P1-2 | **Build cross-client health dashboard.** Aggregate health scores across all advisor_clients. Show traffic-light grid (green/amber/red) per client. Click to drill into individual client health page. | GAP-7 | M (1-2 days) |
| P1-3 | **Build cross-client benchmarking.** Extend KPI engine to accept array of org_ids. Create comparison view at `/advisor/benchmark` showing selected clients side by side for key metrics. | GAP-5 | L (2-3 days) |
| P1-4 | **Build batch report generation.** Add "Generate All" button on advisor dashboard that queues board pack generation for all active clients. Deliver as ZIP or individual PDFs. | GAP-6 | M (1-2 days) |
| P1-5 | **Per-client role support.** Extend advisor_clients junction table with per-client role (full_access, read_only, reports_only). Check in requireRole. | GAP-9 | M (1 day) |

### P2 -- Differentiators (second advisor sprint)

| # | Recommendation | Addresses | Effort |
|---|---------------|-----------|--------|
| P2-1 | **Advisor practice billing plan.** Create "Practice" tier in billing: flat fee per advisor + per-client fee. Stripe integration for metered billing. | GAP-10 | L (3-4 days) |
| P2-2 | **White-label portal branding.** Allow advisors to upload logo, set primary colour, custom subdomain. Apply to client-facing views and reports. | GAP-11 | L (2-3 days) |
| P2-3 | **Scheduled report delivery.** Cron job to auto-generate and email board packs per client on configurable schedule (weekly/monthly). | GAP-13 | M (1-2 days) |
| P2-4 | **Xero Practice Manager integration.** Import client list from XPM. Auto-link orgs. Keep in sync. | GAP-12 | L (2-3 days) |
| P2-5 | **Consultant marketplace backend.** Real booking, payment (Stripe Connect), and review system for the consultant marketplace. | GAP-14 | XL (5+ days) |

---

## 6. Architectural Concerns

| ID | Concern | Severity | Detail |
|----|---------|----------|--------|
| ARCH-1 | **1-user-1-org binding is structural.** `profiles.org_id` is a single FK. Every API route, every layout, every auth helper assumes one org per user. Changing this is a foundational migration that touches 100+ files. Must be designed carefully with a junction table, not by adding multiple org_ids to profiles. | **CRITICAL** |
| ARCH-2 | **getUserProfile() returns single orgId.** This function is called in `layout.tsx` and cached via React.cache(). It must be refactored to support an "active org" concept (from cookie/session) while still checking the user has access to that org via the junction table. | **CRITICAL** |
| ARCH-3 | **RLS policies assume profile.org_id match.** All existing RLS policies likely use `auth.uid()` to look up `profiles.org_id` and match against table `org_id`. These must be updated to check the junction table instead, or use a session variable for active_org_id. | **CRITICAL** |
| ARCH-4 | **No route-level role checking.** Middleware only validates authentication. Any logged-in user can hit any API route or page. Adding advisor-specific routes without middleware protection creates authorization bypass risks. | **HIGH** |
| ARCH-5 | **Supabase RLS for cross-org advisor access.** Advisors need read access to multiple org_ids. Current RLS pattern (profile.org_id = table.org_id) will not work. Need either: (a) Supabase session variable `set_config('app.active_org_id', ...)` set on each request, or (b) RLS policy that joins to advisor_clients table. Option (b) is safer. | **HIGH** |
| ARCH-6 | **Dashboard layout is server-rendered with single orgId.** The layout.tsx server component fetches orgId once and passes it down via context. For client switching, either the layout must re-render on org change (full page navigation) or the org context must become dynamic (client-side state + re-fetch). | **MEDIUM** |

---

## 7. Summary Lists

### BUILD (new features to create)
- Multi-org data model with `advisor_clients` junction table
- Client switcher in header/sidebar
- Advisor portfolio dashboard (`/advisor`)
- "Add Client" wizard with Xero/QBO connection flow
- Cross-client health dashboard (traffic light grid)
- Cross-client benchmarking view (`/advisor/benchmark`)
- Batch report generation (multi-client board packs)
- Role-gated middleware for route protection
- Per-client role assignment in junction table
- Practice billing plan (per-advisor + per-client pricing)
- White-label portal branding (logo, colour, subdomain)
- Scheduled report delivery (email cron)
- Xero Practice Manager import integration

### FIX (existing code that needs changes)
- `profiles` table -- must no longer be the sole source of org_id for advisors
- `getUserProfile()` -- must support active-org switching
- `layout.tsx` -- must resolve active org from switcher, not hardcoded profile.org_id
- `middleware.ts` -- must add role-based route protection
- All RLS policies -- must account for advisor cross-org access via junction table
- Header component -- must add org-switcher UI
- Sidebar navigation -- must add "Advisor" section with portfolio/benchmark/clients nav items
- Persona config "advisor-multi-client" -- must map to a real dashboard template
- Advisor dashboard template -- must include multi-client widgets (client list, health grid, alerts)

### LEVERAGE (existing assets that accelerate advisor features)
- **Role hierarchy system** (`types/index.ts`, `roles.ts`) -- already defines advisor role at correct level
- **Persona config** (`personas.ts`) -- fractional_cfo persona with correct feature access, interview focus, and communication style already designed
- **Health scoring engine** (`/health`) -- needs only to be called per-client and aggregated
- **KPI engine** (`/kpi`) -- needs org_id parameter to be made switchable
- **Board pack generator** (`/reports`) -- needs batch mode wrapper
- **Report themes** (`themes.ts`) -- 7 themes already white-label ready
- **Invite form** (`invite-form.tsx`) -- can be extended for client invitations
- **Consultant marketplace UI** (`consultants/page.tsx`) -- visual shell exists, needs backend
- **Investor portal UI** (`investor-portal/`) -- data room concept can be repurposed for client portals
- **Referral/advisory network** (`referrals/`) -- community feature already designed
- **Supabase RLS + org_id pattern** -- multi-tenancy infrastructure is solid, just needs cross-org extension

### SKIP (not worth building now)
- **Staff utilisation tracking** -- niche practice management feature, low ROI for MVP
- **Engagement tracking per client** -- nice-to-have, not essential until advisor base grows
- **Consultant marketplace payments** -- Stripe Connect complexity is premature; keep as "Express Interest" for now
- **Client bulk import (CSV)** -- Xero PM integration covers this better
- **Keyboard shortcut for client switching** -- marginal UX improvement, build after switcher exists
- **Custom client-facing portal URLs** -- subdomain routing adds infrastructure complexity; defer to P2+