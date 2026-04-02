# Feature Benchmark Audit: Collaboration & Sharing
## Advisory OS (Grove) — Section 10 of 15
**Date:** 2026-04-02 | **Status:** Complete | **Auditor:** Claude Code

---

## Feature Inventory

| # | Feature | Type | Location | Current State |
|---|---------|------|----------|---------------|
| 1 | Role system (owner / admin / advisor / viewer) | Data model | `src/types/index.ts`, `supabase/migrations/001_schema.sql` | Working |
| 2 | Role hierarchy enforcement (`requireRole`, `hasMinRole`) | Auth / API | `src/lib/supabase/roles.ts` | Working |
| 3 | RLS policies (per-table, per-role) | Database | `supabase/migrations/001_schema.sql` | Working |
| 4 | Persona system (sme_owner / fractional_cfo / investor) | UX layer | `src/lib/governance/personas.ts` | Working |
| 5 | Invite team member form (email + role selector) | UI | `src/app/(dashboard)/settings/invite-form.tsx` | Working |
| 6 | Invite creation (DB insert, 7-day expiry, UUID token) | API | `src/app/(dashboard)/settings/invite-form.tsx` (direct Supabase) | Working — but no email dispatch |
| 7 | Invitation acceptance (token validation, profile creation) | API | `src/app/api/invitations/accept/route.ts` | Working |
| 8 | Pending invitations list | UI | `src/app/(dashboard)/settings/page.tsx` | Working |
| 9 | Team members list (display only, no actions) | UI | `src/app/(dashboard)/settings/page.tsx` | Working — view only |
| 10 | Team & Roles page (`/settings/team`) | Page | `src/app/(dashboard)/settings/team/page.tsx` | Stub — non-functional |
| 11 | Revoke / remove team member | Action | Not implemented | Missing |
| 12 | Change member role | Action | Not implemented | Missing |
| 13 | Resend invitation | Action | Not implemented | Missing |
| 14 | Cancel pending invitation | Action | Not implemented | Missing |
| 15 | Email delivery for invitations | Integration | `src/app/api/email/send/route.ts` — template exists, send is `console.log` only | Stub — no Resend/SendGrid wired |
| 16 | Report publish / approve workflow | API | `src/app/api/reports/[orgId]/[reportId]/route.ts` — PATCH with `status: 'published'`, `approved_by` | Working |
| 17 | Report share (export HTML / print-ready) | API | `src/app/api/reports/[orgId]/[reportId]/pdf/route.ts` | Working — HTML only, no PDF |
| 18 | Report share link (public / tokenised) | Feature | Not implemented | Missing |
| 19 | Report email distribution | Feature | Not implemented | Missing |
| 20 | In-app notification system (schema) | Database | `supabase/migrations/004_remaining_tables.sql` — `notifications` table | Working |
| 21 | Notification bell UI (polling, mark read) | UI | `src/components/layout/notification-bell.tsx` | Working — polling only, no real-time |
| 22 | Notification types (intelligence, kpi_alert, variance_alert, system) | Types | `src/types/index.ts` | Working — 4 types defined |
| 23 | Notification creation utility | Lib | `src/lib/notifications/notify.ts` | Working |
| 24 | Notification API (GET / POST mark_all_read / PATCH mark_read) | API | `src/app/api/notifications/`, `src/app/api/notifications/[id]/` | Working |
| 25 | Activity feed component | UI | `src/components/collaboration/activity-feed.tsx` | Stub — hardcoded demo data |
| 26 | Activity feed wired to audit log | Integration | Not implemented | Missing |
| 27 | Commenting on KPIs / reports / scenarios | Feature | Not implemented | Missing |
| 28 | @mention in comments | Feature | Not implemented | Missing |
| 29 | Audit log page (immutable trail, advisor+ access) | Page | `src/app/(dashboard)/audit/page.tsx` | Working |
| 30 | Audit log schema (org_id, user_id, action, entity, changes, metadata) | Database | `supabase/migrations/001_schema.sql` | Working |
| 31 | Audit log write (retry, critical/non-critical modes) | Lib | `src/lib/audit/log.ts` | Working |
| 32 | Vault visibility levels (org / owner_only / advisor_only) | Data model | `src/lib/vault/storage.ts` — `VaultVisibility` type | Defined — not enforced in UI |
| 33 | Vault item sharing between users | Feature | Not implemented | Missing |
| 34 | Real-time collaboration (presence, live cursors) | Feature | Not implemented | Missing |
| 35 | Multi-org support (advisor managing multiple clients) | Architecture | Not implemented — single org_id per profile | Missing |
| 36 | Client portal (advisor viewing client data) | Feature | Not implemented | Missing |
| 37 | Investor portal (investor viewing company data) | UI | `src/app/(dashboard)/investors/page.tsx` — mock UI only | Stub — no real data, no auth boundary |
| 38 | Shareable dashboard link (public/tokenised) | Feature | Not implemented | Missing |
| 39 | Report scheduled delivery (email cadence) | Feature | Not implemented | Missing |
| 40 | Notification preferences (channel: in_app / email / both) | DB | Schema has `notification_channel` enum | Schema only — no UI |
| 41 | Board pack approval workflow (reviewer assigns approver) | Feature | Partial — `approved_by` field in reports table | Partial |
| 42 | Scenario visibility control (who can view/edit each scenario) | Feature | Not implemented | Missing |
| 43 | Document download tracking | Feature | Not implemented | Missing |
| 44 | Investor engagement analytics (view time, pages read) | Feature | Not implemented — mocked in activity feed demo | Missing |

---

## Benchmark Tables

### 1. Team Management & Member List

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Displays org members with roles; lets admins add, remove, and change roles |
| **What it's trying to achieve** | Control who can see and change financial data within the org |
| **Who needs it** | Admin, Owner |
| **Best in class** | **Abacum** — full team management panel with role badge, last-active timestamp, permission scope visible per row. Inline role editing via dropdown. Bulk selection with "deactivate" and "change role" actions. Filter by role. Shows pending vs active. The mechanism: every action is an optimistic UI update confirmed server-side, with an audit log entry auto-generated. |
| **How they achieved it** | Single-page component with three tabs: Active, Pending, Deactivated. Role change is a dropdown per row, not a separate edit page. All member-level actions visible at a glance. |
| **Runner up** | **Planful** — role assignment tied to module-level permissions (can view but not edit forecast, can view but not generate board packs). Granular but complex. |
| **Current Advisory OS state** | **Partial.** `src/app/(dashboard)/settings/page.tsx` shows the members list with roles (display only) and pending invitations. `src/app/(dashboard)/settings/team/page.tsx` is a static stub with no real data and a non-functional "Invite Member" button. No remove, no role change, no last-active, no deactivate. |
| **Gaps vs best in class** | (1) `/settings/team` page is a static stub — duplicate of settings page but less functional. (2) No remove member action. (3) No change role action. (4) No last-active or login date. (5) No deactivate vs delete distinction. (6) No filter by role. |
| **AI opportunity** | Low — team management is deterministic. AI could suggest "James hasn't logged in for 30 days — consider deactivating their access" but this is P3. |
| **Non-finance user test** | **2/5** — The settings page shows a list and invite form but nothing is actionable beyond sending an invite. A business owner cannot remove someone from their org from the UI. |
| **Claude Finance alternative** | Not applicable — team management requires a governed UI, not a chat interface. |
| **Leverage existing tools?** | No — team management must be native to maintain RLS and audit trail integrity. |
| **Build recommendation** | **BUILD** — Wire the `/settings/team` page to live data. Add remove member, change role, resend invite, and cancel invite actions. Each action must write to `audit_logs`. |
| **Priority** | **P0** — An org with no way to remove a member is a security risk. |
| **Defensibility** | Medium — team management is table stakes. The defensible layer is the immutable audit trail written on every action. |

---

### 2. Role-Based Access Control (RBAC)

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Defines what each role (owner / admin / advisor / viewer) can see and do. Enforced at DB level via RLS and at API level via `requireRole`. |
| **What it's trying to achieve** | Prevent unauthorised data access; create the trust boundary between advisor and client, business owner and investor |
| **Who needs it** | All users |
| **Best in class** | **Vena** — cell-level permission model. Can grant a specific user edit access to one row of a budget template while keeping all other rows read-only. Granularity goes to the individual data point. The mechanism: each template cell has an owner attribute, and RLS-equivalent policies are applied at render time, not just at API level. |
| **How they achieved it** | Object-level ACL (Access Control List) on top of role hierarchy. Each financial object (budget template, planning worksheet) has per-user overrides sitting above the global role baseline. |
| **Runner up** | **Runway** — role-based with scenario-level protection. Main scenario is admin-mergeonly. Draft scenarios can be created by any advisor-level user. The mechanism: a scenario's `locked` flag triggers an admin-only merge gate on the main model. |
| **Current Advisory OS state** | **Working — solid foundation, limited granularity.** Four roles with numeric hierarchy (owner=4, admin=3, advisor=2, viewer=1). `requireRole(minRole)` enforced on all API mutations. RLS policies in place for all 15+ tables. `hasMinRole` used on frontend for conditional UI rendering. `user_has_role()` SQL function enables RLS to reference role hierarchy without a join. The `audit_logs` SELECT policy uses `user_has_role('advisor')` — advisors and above can view. Scenario lock requires admin. |
| **Gaps vs best in class** | (1) No object-level permissions — a viewer sees ALL data or NO data, no middle ground. (2) No per-scenario access control (e.g., "this scenario is confidential — only show to admin"). (3) The `viewer` role type in `org_invitations` insert form shows "Admin / Advisor / Viewer" but the schema also has `owner` — `owner` cannot be assigned via invitation (correct), but this is undocumented. (4) No investor-specific role in the RBAC system — investor persona exists in `personas.ts` but the `profiles.role` enum only has `viewer` as the lowest level (investors are guests, not org members). (5) No module-level permissions. |
| **AI opportunity** | Low for the role model itself. Medium for AI-suggested role assignment: "Sarah is your external accountant — I recommend Advisor access, not Admin." |
| **Non-finance user test** | **4/5** — The role descriptions in the team page ("Admin: manage team, settings, billing") are clear. The enforcement is invisible, which is correct UX. |
| **Claude Finance alternative** | Not applicable — RBAC must be native. |
| **Leverage existing tools?** | No — Supabase RLS is the right tool for this. Already in use. |
| **Build recommendation** | **ENHANCE** — Add an `investor` role to the enum (or model investors as cross-org viewers via a separate `org_access_grants` table). Add per-scenario visibility controls. Document the `owner` role exclusion from invitations. |
| **Priority** | **P0** — The investor portal and advisor/client boundary both require this. |
| **Defensibility** | **Very High** — The combination of DB-level RLS + API-level `requireRole` + immutable audit trail on all role changes is the governance moat. No competitor in the SME space has this depth. |

---

### 3. Invitation Flow (Invite, Accept, Onboard)

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Admin emails an invite -> invitee receives a link -> clicks -> logs in/signs up -> joins org at the assigned role |
| **What it's trying to achieve** | Frictionless onboarding of advisors, clients, and investors into the governed workspace |
| **Who needs it** | Admin (sends), invitee (receives) |
| **Best in class** | **Fathom HQ** — advisor-first invitation flow. When an accountant invites a client, the client sees a personalised welcome message with the advisor's branding. The invite email includes a one-paragraph summary of what the client will see. First login goes directly to the dashboard pre-configured for the client's account. The mechanism: invitation metadata carries the advisor's brand config and the client's entity ID — these are applied at the accept endpoint so the welcome experience is instantly contextualised. |
| **How they achieved it** | Invitation record carries `invited_by` context, org branding, and a pre-selected dashboard template. Accept endpoint applies the template before redirecting to the dashboard. |
| **Runner up** | **Abacum** — magic link invitations with no password required for initial access. The invitee clicks the link, is authenticated via magic link, and lands on a role-appropriate view immediately. |
| **Current Advisory OS state** | **Backend working, frontend and email delivery missing.** The `org_invitations` schema is solid: UUID token, email match validation, 7-day expiry, status enum (`pending / accepted / expired`). `POST /api/invitations/accept` validates token, checks email match, checks expiry, creates profile at the assigned role, writes audit log. `InviteForm` creates the DB row. However: (1) The invite form does NOT call the email API after inserting — the invitee never receives an email. (2) Email API (`/api/email/send`) has an invitation template but the actual send is a `console.log` stub with a comment to "replace with Resend or SendGrid." (3) There is no invitation landing page (e.g., `/invite/[token]`) — no UI for the invitee to accept. (4) The token is a UUID but is stored as a column in `org_invitations`, not as a path parameter — the acceptance flow is an API call, not a page visit. |
| **Gaps vs best in class** | (1) No email delivery. (2) No invitation landing page. (3) No branded welcome experience. (4) No magic link / passwordless option. (5) No notification to the inviter when the invite is accepted. (6) No re-send invitation action. (7) No invitation cancellation action. |
| **AI opportunity** | Medium — AI could draft a personalised welcome message for the invite email based on the invitee's role and the org's business context profile. "Hi Sarah, James Sesay has invited you to Grove as their Advisor. You'll have access to [Business Name]'s financial data, scenarios, and board packs." |
| **Non-finance user test** | **1/5** — The flow is completely broken for the invitee. There is no email, no landing page, and no way to accept the invitation from the UI. |
| **Claude Finance alternative** | Not applicable. |
| **Leverage existing tools?** | Use Resend for email delivery — recommended in the existing code comment, ~10/month, zero build time. |
| **Build recommendation** | **BUILD** — Wire Resend to the email API. Build `/invite/[token]` landing page. Call email API on invite creation. Add resend and cancel actions to the pending invitations list. |
| **Priority** | **P0** — Without email delivery, the invitation system is non-functional. This blocks all multi-user scenarios. |
| **Defensibility** | Medium — the DB-level token validation and audit log on acceptance are good. The UX layer is the gap. |

---

### 4. Report Sharing & Distribution

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Gets a finished report (board pack, monthly review, investor update) in front of the right audience |
| **What it's trying to achieve** | Close the loop between report generation and stakeholder consumption, with an audit trail |
| **Who needs it** | Advisor (primary sender), Business Owner, Investor (receiver) |
| **Best in class** | **Fathom HQ** — scheduled delivery is the gold standard in the SME advisory space. Set a report to auto-generate and auto-send on the 5th of every month to a defined list. Recipients receive a branded PDF. Advisor sees per-report open analytics: who opened, when, how many times. In-app notifications fire when a report is opened. The mechanism: Fathom stores recipient lists per report template; the scheduler triggers generation + PDF render + email dispatch in one step. Engagement tracking uses pixel tracking in the email body. |
| **How they achieved it** | Report template carries a recipient list, cadence settings (monthly, quarterly), and a brand config. Scheduler job triggers the full pipeline. |
| **Runner up** | **DataRails** — Storyboards auto-generate presentations and can be emailed. Board-ready output includes PDF, PowerPoint, and Excel simultaneously. Shareable link allows asynchronous stakeholder access without requiring a login. |
| **Current Advisory OS state** | **Partial.** Report generation is working (narrative, sections, AI commentary). Report PATCH endpoint supports `status: 'published'` with `approved_by` set. PDF endpoint returns print-ready HTML (not actual PDF binary). There is no report distribution mechanism: no email send from the report page, no shareable link, no scheduled delivery, no recipient list management, no open tracking. The investors page has a mock "Recent Updates" table showing sent/draft statuses and open rates, but this is entirely hardcoded demo data. |
| **Gaps vs best in class** | (1) No email distribution from report. (2) No shareable public or tokenised link. (3) No PDF binary (returns HTML with print CSS). (4) No scheduled delivery. (5) No recipient list management. (6) No open/engagement tracking. (7) No notification to sender when report is opened. (8) Report approval workflow exists in the API but there is no UI for it (no "Approve" button on the report page). |
| **AI opportunity** | High — AI could auto-draft an accompanying email message for each report ("Here's your March board pack. Key highlights: revenue up 8%, cash position strong at 340K, one area to watch — debtor days have risen to 47.") This is the DataRails Insights + Fathom commentary pattern applied to distribution. |
| **Non-finance user test** | **2/5** — A business owner can generate a report but cannot get it to their board members without manually downloading the HTML and attaching it to an email. |
| **Claude Finance alternative** | Partially — the user could copy the AI commentary text and paste into an email. But this bypasses governance (no delivery record, no open tracking, no audit trail). |
| **Leverage existing tools?** | Resend for email dispatch. Supabase Storage for PDF storage. Vercel for signed URL generation for shareable links. |
| **Build recommendation** | **BUILD** — Add email distribution button on report page (calls email API with Resend wired). Generate true PDF binary using Puppeteer or Browserless. Add shareable link (signed Supabase Storage URL with 30-day expiry). Approval UI button. |
| **Priority** | **P1** — Report generation without distribution is incomplete. The advisor's primary deliverable (the board pack) needs to be sendable. |
| **Defensibility** | Medium — the governance layer (approved_by, audit log on generation and publish) is the differentiator. Add open tracking and you have a distribution audit trail no other SME FP&A tool has. |

---

### 5. In-App Notification System

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Delivers alerts and activity notifications to users within the platform UI |
| **What it's trying to achieve** | Surface time-sensitive information (KPI threshold breach, new intelligence event, report approval needed) without requiring the user to check multiple pages |
| **Who needs it** | All users |
| **Best in class** | **Runway** — notifications are contextual and actionable. A notification for a KPI variance breach includes a one-sentence AI explanation of why the variance occurred and a direct link to the relevant scenario. The notification panel shows the last 20 items grouped by today / this week / earlier. Each item has a dismiss and a "take action" button. The mechanism: Runway's notification system is event-driven (webhooks from the data pipeline trigger notification records), not polling-based. |
| **How they achieved it** | Event-driven insert into notifications table on data pipeline events. Each notification type has a pre-defined `action_url` pattern. The bell icon uses a WebSocket subscription for real-time count update. |
| **Runner up** | **Fathom** — in-app notifications for report activity (who opened a report and when), KPI alert thresholds. The open-tracking notification is their most differentiated one. |
| **Current Advisory OS state** | **Working but polling-only.** Schema is well-designed (`notifications` table with `channel`, `priority`, `entity_type`, `entity_id`, `action_url`, `read_at`). `NotificationBell` polls every 30 seconds. Mark-as-read and mark-all-read work. Four notification types (`intelligence`, `kpi_alert`, `variance_alert`, `system`). However: (1) Notifications are never actually created anywhere in the application — the `createNotification` utility exists but there are zero calls to it from any route or service. (2) Polling at 30s means notifications feel stale. (3) `read` is a boolean in `notify.ts` but `read_at` is a timestamp in the DB schema — these are inconsistent (the `Notification` type in `types/index.ts` uses `read: boolean` while the DB column is `read_at: timestamptz`). (4) No email notification delivery despite `notification_channel` enum supporting `email` and `both`. (5) No notification preference UI. |
| **Gaps vs best in class** | (1) Zero notification creation in production code paths. (2) No real-time delivery (WebSocket / Supabase Realtime subscription). (3) `read` vs `read_at` type inconsistency. (4) No email notification delivery. (5) No notification preferences UI. (6) No grouping by date. (7) No "take action" button on notification items. |
| **AI opportunity** | High — the intelligence event pipeline already generates `IntelligenceImpact` records with `impact_narrative`. The next step is auto-creating a notification when a high-severity impact is stored. This is a single `createNotification` call in the intelligence route, zero AI tokens required. |
| **Non-finance user test** | **1/5** — The bell icon exists and renders correctly but shows no notifications because nothing creates them. A business owner who triggers a KPI threshold will never know. |
| **Claude Finance alternative** | Not applicable — notifications require a persistent backend. |
| **Leverage existing tools?** | Supabase Realtime for WebSocket subscription (already in the stack, zero additional cost). Resend for email notification delivery. |
| **Build recommendation** | **BUILD** — Wire `createNotification` calls into: intelligence impact route (on high/critical severity), KPI threshold check (when a KPI crosses its target), scenario publish, and report publish. Switch NotificationBell from polling to Supabase Realtime subscription. Fix the `read` / `read_at` schema inconsistency. |
| **Priority** | **P0** — A notification system that never creates notifications is a broken feature. |
| **Defensibility** | Medium — the schema and UI are good. The gap is the wiring. Once wired, the audit trail of notification events (when was the alert created, when was it read) becomes a governance record. |

---

### 6. Activity Feed

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Shows a chronological stream of platform activity: who did what, on what entity, when |
| **What it's trying to achieve** | Give advisors and business owners shared situational awareness without requiring real-time presence |
| **Who needs it** | Advisor (primary), Business Owner |
| **Best in class** | **Abacum** — activity feed is real-time and entity-scoped. Click on any KPI -> see the last 5 changes to that KPI in a side panel (who changed the target, when, from what value to what value). The feed is also surfaced at the top level as a "Recent Activity" timeline for the org. Comments attach directly to the activity entry. The mechanism: every write to the platform inserts a denormalised activity record (pre-computed display text, not just raw entity IDs) so the feed can render without joins. |
| **How they achieved it** | Activity records are pre-written by every mutation handler with display-ready text. This avoids the N+1 query problem of resolving entity names at render time. |
| **Runner up** | **Mosaic** — version control surfaced as activity. Every change to a model or report creates a version record that appears in the activity feed. Users can click any activity item to see a diff of what changed. |
| **Current Advisory OS state** | **Stub — demo data only.** `src/components/collaboration/activity-feed.tsx` is a well-designed component with a clean interface (`ActivityEvent` type, compact/full modes, action icons). But it is hardcoded with 8 static demo events and is not connected to any data source. The `audit_logs` table contains the raw data needed to power this feed, but no query or API route reads `audit_logs` to populate the `ActivityFeed` component. The component is not used on any page. |
| **Gaps vs best in class** | (1) Not wired to audit logs. (2) Not mounted on any page. (3) No entity name resolution (audit logs store `entity_id` as a UUID — display names require a join). (4) No filtering by entity type or user. (5) No pagination. (6) No real-time updates. |
| **AI opportunity** | Medium — AI could convert raw audit log entries ("assumption_value.updated: {key: 'revenue_growth_rate', old: 0.05, new: 0.08}") into human-readable activity items. But a deterministic template function is sufficient and cheaper. |
| **Non-finance user test** | **1/5** — Not on any page; demo data has fictional names. |
| **Claude Finance alternative** | Not applicable — an activity feed requires a persistent, queryable log. |
| **Leverage existing tools?** | The audit_logs table is already the source of truth. Build an API route that reads audit_logs with entity name resolution and feeds it to the existing component. |
| **Build recommendation** | **BUILD** — Create `GET /api/activity/[orgId]` that reads `audit_logs` with a join on `profiles` for display names, and resolves entity names from the relevant tables. Mount `ActivityFeed` on the dashboard home and the settings page. Wire Supabase Realtime subscription for live updates. |
| **Priority** | **P1** — The activity feed is a key part of the multi-party collaboration proposition. It gives the advisor/client relationship its "shared workspace" feel. |
| **Defensibility** | **High** — The immutable audit log as the source of the activity feed is architecturally sound. Every event is tamper-proof. Competitors use mutable activity tables; Advisory OS's activity history cannot be edited or deleted, which is auditor-grade. |

---

### 7. Commenting on Entities

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Allows users to leave comments on specific KPIs, reports, scenarios, or data points; enables threaded discussion within the platform |
| **What it's trying to achieve** | Replace the email thread that currently happens outside the platform when an advisor wants to discuss a variance or a business owner has a question about a forecast |
| **Who needs it** | Advisor + Business Owner (bidirectional), Investor (read + comment on shared reports) |
| **Best in class** | **Abacum** — inline commenting with @mention, threading, and attachment support. Comments can be left on any data cell in a report or on any KPI card. When a KPI variance is automatically flagged, Abacum opens a comment thread on that KPI asking "What caused this variance?" — the advisor can respond inline. The mechanism: every platform entity has a polymorphic `comments` table with `entity_type` + `entity_id`, allowing one comment schema to serve all entities. @mention fires a notification to the mentioned user. |
| **How they achieved it** | Polymorphic comment table. Notification webhook triggers on `@mention` pattern match. Thread depth limited to two levels (comment + replies) to avoid complexity. |
| **Runner up** | **Runway** — comments on scenarios. When a scenario is shared, stakeholders can comment on specific assumption lines ("Why are we assuming 10% growth? Last year was 3%.") Comments appear inline next to the assumption row. |
| **Current Advisory OS state** | **Not implemented.** The activity feed component demo data shows a "commented on" event type with metadata ("Should we revise the target?"), suggesting comments were planned. The `audit_logs` schema could potentially be repurposed, but there is no `comments` table, no comment API, no comment UI. |
| **Gaps vs best in class** | No implementation at all. |
| **AI opportunity** | **Very High** — this is the most AI-differentiable collaboration feature. When an advisor leaves a comment on a KPI variance ("Why is gross margin down this month?"), Claude could auto-draft a response grounded in the Xero transaction data. The advisor reviews and sends — 10-second turnaround instead of 30-minute analysis. |
| **Non-finance user test** | **N/A** — Not present. |
| **Claude Finance alternative** | Partially — the "Ask Grove" feature serves a similar purpose (NL questions about data). But Ask Grove is a private conversation; commenting makes the discussion visible to the advisor and serves as a shared annotation layer. |
| **Leverage existing tools?** | Consider building a very lightweight comment system (Supabase table + API). Tools like Liveblocks could add real-time threading but add vendor dependency. For Phase 1, a simple DB-backed comment table is sufficient. |
| **Build recommendation** | **BUILD (lightweight)** — Single `comments` table (`org_id, entity_type, entity_id, user_id, body, parent_id, created_at`). API: `GET` and `POST /api/comments/[entityType]/[entityId]`. Simple UI: expandable comment drawer on KPI cards, report viewer, and scenario detail. @mention triggers notification. AI-drafted reply as a first-class feature. |
| **Priority** | **P1** — Commenting closes the email loop. Advisors who use the platform for analysis but email their clients separately are partially off-platform. In-platform commenting makes the platform the single thread of record. |
| **Defensibility** | **High** — AI-drafted comment responses grounded in the organisation's Xero data is not available in any competitor. The combination of in-platform thread + AI-generated analysis response + immutable audit of the conversation is the governance differentiator. |

---

### 8. Multi-Organisation Support (Advisor Portal)

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Allows a fractional CFO or advisor to log in once and switch between multiple client organisations without re-authenticating |
| **What it's trying to achieve** | Remove the workflow friction for advisors who currently manage 5-20 clients in separate Fathom or Xero instances |
| **Who needs it** | Fractional CFO / Advisor persona |
| **Best in class** | **Fathom HQ (Portfolio product)** — the advisor logs into one account and sees a portfolio view of all client organisations with KPI summaries per client. One-click to switch into any client's full dashboard. Client switching does not require re-authentication. Portfolio view shows all clients' key metrics on one screen (revenue growth, margin, cash) with red/amber/green status. Alert from any client appears in the advisor's unified notification feed. The mechanism: Fathom Portfolio maps advisor user accounts to multiple client accounts via an `advisor_client_links` table. The portfolio page queries each linked client's aggregated KPI records. |
| **How they achieved it** | Separate `portfolio` product tier. Advisor account stores a list of linked client `org_id` values. Dashboard queries use the active client's `org_id`. Switching client = updating active `org_id` in session. |
| **Runner up** | **Syft Analytics** — consolidated multi-entity reporting across a portfolio. Single advisor account with client entity switcher in the nav. Xero Practice Manager integration auto-imports the firm's client list. |
| **Current Advisory OS state** | **Not implemented architecturally.** The `profiles` table has a single `org_id` column — one user can only belong to one organisation. The persona system defines `fractional_cfo` but it has no structural org-switching capability. The sidebar navigation includes no client switcher. There is no `advisor_client_links` or equivalent cross-org access table. |
| **Gaps vs best in class** | (1) Single org per user — no cross-org access model. (2) No portfolio view page. (3) No client switcher in navigation. (4) No cross-org notification aggregation. (5) No Xero Practice Manager integration for auto-importing client list. |
| **AI opportunity** | High — a fractional CFO portfolio view could use AI to surface "which client needs attention this week" based on KPI changes across all linked orgs. This is DataRails' cross-client benchmarking applied to the advisory workflow. |
| **Non-finance user test** | **N/A** — Not present. |
| **Claude Finance alternative** | Not applicable — org-switching is structural. |
| **Leverage existing tools?** | No — requires schema and RLS changes. |
| **Build recommendation** | **BUILD (Phase 2)** — Add `advisor_org_access` table (`advisor_user_id, client_org_id, access_level, granted_by, created_at`). Update `user_org_id()` SQL function to support multi-org context. Add client switcher to the sidebar nav. Build portfolio overview page. |
| **Priority** | **P1** — This is the primary Fractional CFO use case. Without it, advisors cannot use Advisory OS to manage multiple clients. |
| **Defensibility** | **Very High** — Multi-org governance (each client org retains its own RLS boundaries, advisor access is audited) is not available in any SME-focused FP&A tool. Fathom's Portfolio product is the closest but lacks the immutable access grant audit trail. |

---

### 9. Investor Portal & Secure Document Sharing

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Provides an authenticated, role-scoped view for investors or board members to access financial data, updates, and documents without being full org members |
| **What it's trying to achieve** | Replace the Dropbox / Google Drive folder that founders currently use for investor data rooms, with a governed, trackable alternative |
| **Who needs it** | Business Owner (sets up), Investor / Board Member (consumes) |
| **Best in class** | **Mosaic (now HiBob Finance)** — investor portal with a data room concept. Investors receive a unique access link. Inside, they see a curated view: key metrics, the latest board pack, and uploaded documents. The founder controls exactly what is shared — individual documents, specific KPI sets, and specific scenarios. Mosaic tracks document engagement: who viewed, when, for how long, which pages. The mechanism: a `data_room` object stores a list of `shared_entities` (reports, files, KPI snapshots) with per-entity access control. Investor access is a separate auth flow (magic link, no account needed). |
| **How they achieved it** | Data room = a curated collection of platform entities with a generated access token. The investor access token is scoped to the data room's `shared_entities` list — it cannot access anything outside. |
| **Runner up** | **Syft Analytics** — export and share to Slack, WhatsApp, Teams. Simple sharing model but no document tracking or data room structure. |
| **Current Advisory OS state** | **UI stub only.** `src/app/(dashboard)/investors/page.tsx` is a polished static page with mock metrics (ARR, MRR, Burn Rate, Runway), mock recent updates with open rates, mock document vault, and mock cap table — all hardcoded. No Supabase queries, no real data. The investor portal page structure in the sidebar shows three routes (`/investors`, `/investors/updates`, `/investors/documents`) and there is a separate `/investor-portal` section with four pages. Neither is backed by real data or a data room architecture. The `VaultVisibility` type in vault storage defines `owner_only` and `advisor_only` but no `investor` visibility tier. |
| **Gaps vs best in class** | (1) No real data — entirely mocked. (2) No investor auth boundary (investors would see full org data if they had a regular account). (3) No data room object or access token system. (4) No document engagement tracking. (5) No investor-specific role in the RBAC system. (6) Two investor sections in the sidebar (`/investors` and `/investor-portal`) that overlap. (7) No vault visibility tier for investor-shared items. |
| **AI opportunity** | High — AI could auto-draft the monthly investor update narrative ("Dear investors — here is March's update. Revenue grew 8% to 104K. Cash runway extended to 18 months. The two key risks are [X] and [Y]...") grounded in the Xero data. The founder reviews and sends. |
| **Non-finance user test** | **1/5** — The page is beautiful but entirely fictional. An investor clicking through would see data that does not belong to the organisation. |
| **Claude Finance alternative** | The narrative drafting element (investor update email) is achievable via Claude with Xero data. But the access-controlled data room with engagement tracking requires a native build. |
| **Leverage existing tools?** | Supabase Storage + signed URLs for document sharing. Resend for investor update email dispatch. Magic links (Supabase auth) for passwordless investor access. |
| **Build recommendation** | **BUILD** — Wire the investor dashboard to real Xero data via existing KPI routes. Add `investor` role or create a separate `data_room_access` model. Build a `POST /api/investor-rooms` endpoint for creating a curated access package. Add basic engagement tracking (view events on document opens). Remove duplication between `/investors` and `/investor-portal` routes. |
| **Priority** | **P1** — The investor portal is a key differentiator in the fundraising use case. It also creates a natural upgrade trigger (business owners invite investors -> investors want more detail -> founder upgrades to a higher tier). |
| **Defensibility** | **High** — Governed, auditable investor access with engagement analytics and immutable sharing records is not available in any SME FP&A tool at this price point. Carta has cap table management but not financial commentary. |

---

### 10. Real-Time Collaboration & Presence

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Allows multiple users to work on the platform simultaneously, with awareness of who else is viewing or editing |
| **What it's trying to achieve** | Enable the advisor and client to review a forecast or board pack together in a meeting without conflicts or stale data |
| **Who needs it** | Advisor + Business Owner (in advisory meetings) |
| **Best in class** | **Runway** — real-time collaborative planning. Multiple users see each other's cursors on the planning canvas. When one user changes an assumption, the other sees the P&L update instantly. Chat panel is available alongside the model for inline discussion. The mechanism: operational transformation (OT) on the assumption values, broadcast over WebSockets. Each assumption change is attributed to the user who made it and appears in the activity feed. |
| **How they achieved it** | OT for conflict resolution on concurrent edits. Supabase Realtime or custom WebSocket for live sync. Assumption-level lock to prevent simultaneous edits to the same value. |
| **Runner up** | **Abacum** — presence indicators (avatars of who is currently viewing a page) without full OT. Comments are real-time. Multiple users can view but the last-save wins on edit conflicts. |
| **Current Advisory OS state** | **Not implemented.** No Supabase Realtime subscriptions anywhere in the frontend. No presence indicators. No live cursor sharing. The notification bell polls every 30 seconds — the only approximation of real-time awareness. |
| **Gaps vs best in class** | Complete absence of real-time capability. |
| **AI opportunity** | Low — real-time collaboration is primarily an infrastructure problem, not an AI problem. AI could transcribe or summarise the discussion that happened during a collaborative session, but this is P3. |
| **Non-finance user test** | **N/A** — Not present. |
| **Claude Finance alternative** | Not applicable. |
| **Leverage existing tools?** | Supabase Realtime is already in the stack (used for auth). Adding a channel subscription for a given org is low-effort. Liveblocks or PartyKit could provide richer presence and OT but add vendor cost. |
| **Build recommendation** | **LEVERAGE (Supabase Realtime)** for Phase 1 — presence indicators (who is viewing this page) using Supabase Realtime presence channels. Skip OT/conflict resolution for now; the governed confirmation workflow (no AI writes directly to DB) means true concurrent editing conflicts are rare. Full real-time collaborative editing (Runway-style) is **P3**. |
| **Priority** | **P2** — Useful during advisor meetings but not blocking core value delivery. Supabase presence indicators can be added in a day. Full OT is P3. |
| **Defensibility** | Low for presence (table stakes eventually). High for the governed audit trail of who viewed what and when, which presence indicators feed into. |

---

### 11. Scheduled Report Delivery & Notification Preferences

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Automatically generates and sends reports to defined recipients on a set cadence (monthly, quarterly) |
| **What it's trying to achieve** | Remove the manual step of generating and sending reports each month; create a reliable advisory cadence |
| **Who needs it** | Advisor (sets up), Business Owner + Investor (receive) |
| **Best in class** | **Fathom HQ** — report scheduling is a core feature. The advisor sets: report template, period (relative: "last full month"), recipient list, delivery cadence (monthly, quarterly, annual), and delivery format (PDF + email). Fathom generates the report on schedule, sends it, and records the send event. The advisor sees all scheduled reports in a management view with next-send date and last-sent status. The mechanism: a background job reads `scheduled_reports` records, triggers the report generation pipeline, calls the email API, and writes a `delivery_log` entry. |
| **How they achieved it** | Cron job on a schedule. Each `scheduled_report` record has enough data to run the full pipeline autonomously (org_id, template_id, period logic, recipient list). |
| **Runner up** | **DataRails Insights** — configurable automated summaries. Choose KPIs, recipients, and cadence. Delivered as AI-generated narrative summaries rather than full reports. |
| **Current Advisory OS state** | **Not implemented.** No scheduled job infrastructure, no scheduled_reports table, no delivery log, no recipient management. The notification schema has a `sent_at` timestamp, suggesting delivery tracking was planned but never built. The `email/send` API exists but is stubbed. |
| **Gaps vs best in class** | No implementation. |
| **AI opportunity** | High — the AI commentary already generates per-report narrative. Scheduled delivery with AI-drafted cover note ("Here is your March board pack — key highlights: ...") is the Fathom pattern applied. |
| **Non-finance user test** | **N/A** — Not present. Scheduling is the feature that would most reduce the advisor's manual overhead. |
| **Leverage existing tools?** | Supabase cron (pg_cron) for the scheduler. Resend for delivery. Vercel Cron as an alternative. |
| **Build recommendation** | **BUILD (P1)** — Add `scheduled_reports` table. Build a simple scheduling UI on the report template page ("Auto-send this report on the 5th of each month to: [email list]"). Wire pg_cron or Vercel Cron to trigger generation and email dispatch. |
| **Priority** | **P1** — This is the single feature that converts Advisory OS from a reporting tool into an advisory automation platform. The recurring monthly send is the advisor's "proof of value" to clients. |
| **Defensibility** | Medium — scheduling is table stakes for advisory tools. The defensibility is the AI-generated cover note personalised to the org's business context (grounded in Xero data), which no competitor currently does. |

---

## Competitive Feature Matrix — Collaboration & Sharing

| Feature | DataRails | Fathom | Syft | Jirav | Runway | Mosaic | Planful | Vena | Cube | Abacum | Advisory OS (current) |
|---------|-----------|--------|------|-------|--------|--------|---------|------|------|--------|----------------------|
| Role-based access | Half | Half | No | No | Yes | No | Yes | Yes | Yes | Yes | Yes |
| DB-level RLS enforcement | No | No | No | No | No | No | Yes | No | No | No | Yes |
| Immutable audit log | Half | No | No | No | Half | No | Yes | Yes | Yes | Half | Yes |
| Email invitation flow | Yes | Yes | No | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Half |
| Report share link | Yes | Half | Half | Half | Yes | Yes | Yes | Half | No | Yes | No |
| Scheduled report delivery | Yes | Yes | Half | Yes | Yes | Half | Yes | Yes | Half | Yes | No |
| Report engagement tracking | No | Yes | No | No | No | Yes | No | No | No | Half | No |
| In-app notifications | Yes | Yes | No | Yes | Yes | Half | Yes | Half | No | Yes | Half |
| Email notifications | Yes | Yes | Half | Yes | Yes | Half | Yes | Half | No | Yes | No |
| Activity feed (live) | Half | No | No | No | Yes | Yes | Half | No | No | Yes | No |
| Entity commenting | No | No | No | No | Yes | No | Half | No | No | Yes | No |
| @mention notifications | No | No | No | No | Yes | No | No | No | No | Yes | No |
| Multi-org advisor portal | No | Yes | Half | Half | No | No | Yes | Yes | No | Yes | No |
| Investor portal / data room | No | No | No | No | No | Yes | Half | No | No | No | Half |
| Real-time presence | No | No | No | No | Yes | No | No | No | No | Yes | No |
| Document engagement tracking | No | Yes | No | No | No | Yes | No | No | No | No | No |
| AI-drafted sharing narrative | No | Half | No | No | No | No | No | Half | Half | No | No |

**Critical observation:** Advisory OS leads on RLS enforcement and immutable audit log and has a working notification schema — but trails every competitor on email delivery, sharing links, scheduled reports, activity feeds, commenting, and multi-org support. The governance foundation is strongest in the industry; the surface collaboration features are the weakest.

---

## Gap Analysis

### Gap 1 — Email Delivery (Critical)
The email API exists with invitation and welcome templates but sends to `console.log`. No user has ever received an email from Advisory OS. This blocks: invitation flow, report distribution, notification delivery, and scheduled reports. Single fix: wire Resend. Estimated: 2 hours.

### Gap 2 — Invitation Landing Page (Critical)
The invitation token is generated and stored. The `accept` API validates correctly. But there is no page at `/invite/[token]` for the invitee to land on. Without it, the invitation system is backend-complete and frontend-missing. Invites cannot be accepted by anyone who is not a developer calling the API directly.

### Gap 3 — Team Management Actions (High)
The team member list is read-only. Admins cannot remove members, change roles, resend invites, or cancel pending invites. The `/settings/team` page is a static stub that duplicates settings/page.tsx with less functionality.

### Gap 4 — Notification Wiring (Critical)
The notification system (`notifications` table, `createNotification` utility, API routes, `NotificationBell` UI) is complete end-to-end — but `createNotification` is called zero times in the production codebase. The bell always shows empty. Every time a KPI threshold is crossed, a high-severity intelligence event is detected, a report is published, or a scenario is locked, a notification should be created. None of these events wire to notifications today.

### Gap 5 — Activity Feed Connection (High)
The `ActivityFeed` component is well-built and the `audit_logs` table contains all the data needed to power it. The gap is a single API route (`GET /api/activity/[orgId]`) that reads audit logs with profile name resolution, and mounting the component on the home/dashboard page. The component is not used on any page.

### Gap 6 — Investor Portal Reality vs. Mock (High)
The investor portal page is one of the most polished-looking pages in the platform and also the most misleading — it shows hardcoded fictional data. Any investor or demo participant who visits it will see data that does not belong to the organisation. This is both a credibility risk and a demo risk.

### Gap 7 — Multi-Org Architecture (Structural)
The `profiles` table allows one `org_id` per user. An advisor managing 10 clients would need 10 separate accounts. This is the primary architectural blocker for the fractional CFO use case. Fixing it requires a schema migration, RLS policy updates, and a client-switcher UI.

### Gap 8 — Report Distribution (High)
Reports can be generated and approved but not sent. There is no email dispatch from reports, no shareable link, and the PDF route returns HTML rather than a binary PDF. The full advisory workflow (generate -> approve -> send) is broken at the final step.

### Gap 9 — Type Inconsistency: `read` vs `read_at` (Medium)
The `notifications` DB schema uses `read_at timestamptz` (nullable — null means unread). The `Notification` type in `types/index.ts` and `notify.ts` uses `read: boolean`. The `NotificationBell` filters by `!n.read`. This will cause silent bugs when RLS filtering on `read_at` and client-side filtering on `read` produce different results as the system scales.

### Gap 10 — Commenting Absent (Medium)
No comment system exists. The activity feed demo shows comment events, but there is no comments table, API, or UI. This is the feature that most directly replaces the out-of-platform email discussion between advisor and client.

---

## Prioritised Recommendations

### P0 — Demo-Critical / Security-Critical

**P0-A: Wire Resend to the email API**
The single highest-leverage action in this entire audit. One integration, `npm install resend`, wire `RESEND_API_KEY`, replace `console.log` in `/api/email/send/route.ts`. Unlocks: invitation delivery, notification emails, report distribution, scheduled reports. Estimated: 2-3 hours.

**P0-B: Build the invitation landing page**
Create `src/app/(onboarding)/invite/[token]/page.tsx`. Calls `POST /api/invitations/accept` with the token from the URL. Handles: expired token, email mismatch, already-accepted. On success, redirects to `/dashboard`. Estimated: 3-4 hours.

**P0-C: Wire notifications on key events**
Call `createNotification()` in: (1) intelligence impact route when severity is `high` or `critical`, (2) KPI calculation when a KPI crosses its target threshold, (3) report PATCH when `status: 'published'`, (4) scenario lock route. No new infrastructure — pure wiring. Switch `NotificationBell` from 30s polling to a Supabase Realtime subscription. Fix `read` vs `read_at` type inconsistency. Estimated: 1 day.

**P0-D: Fix team management actions (remove member, change role)**
Wire `/settings/team` page to live data. Add `DELETE /api/team/[memberId]` and `PATCH /api/team/[memberId]` (role update) endpoints. Both must write to `audit_logs`. Add resend invite and cancel invite actions on the pending invitations list. Estimated: 4-6 hours.

---

### P1 — Launch-Required

**P1-A: Wire the activity feed to audit logs**
Create `GET /api/activity/[orgId]` reading `audit_logs` joined with `profiles.display_name`. Build an entity name resolver for common entity types (scenario, report, kpi). Mount `ActivityFeed` on the home page and settings page. Wire Supabase Realtime subscription for live updates. Estimated: 1 day.

**P1-B: Build the invitation flow email + call on invite creation**
After the invite DB insert in `InviteForm`, call `POST /api/email/send` with the `invitation` template, passing the inviter's name, org name, and a generated invite URL (`/invite/[token]`). Estimated: 2 hours (after P0-A and P0-B are done).

**P1-C: Report distribution (email + HTML delivery)**
Add an "Email Report" action on the report detail page. Opens a modal with recipient email input. Calls `/api/email/send` with a new `report_share` template that includes the report title, period, and a link to view online or download HTML. Writes a `report.shared` audit log entry. Estimated: 4 hours.

**P1-D: Investor portal — replace mocked data with real Xero data**
Connect the investor dashboard to the existing KPI routes. Replace hardcoded ARR/MRR/Burn/Runway with real values from `/api/kpi/[orgId]`. Replace mock "Recent Updates" with real reports list from `/api/reports/[orgId]`. Remove or clearly gate the `/investor-portal` section (duplicate of `/investors`). Estimated: 1 day.

**P1-E: Add `investor` role to the RBAC system**
Add `investor` to the `user_role` enum (or create a separate `data_room_access` table for cross-org guest access). Update `ROLE_HIERARCHY` with `investor: 0` (read-only, below viewer). Add `investor` as an option in the invite form. Create investor-scoped RLS policies that limit access to published reports and read-only KPIs. Estimated: 4-6 hours.

**P1-F: Multi-org access table (schema only)**
Create `advisor_org_access` table (`advisor_user_id uuid, client_org_id uuid, access_level text, granted_by uuid, created_at timestamptz, revoked_at timestamptz`). Update `user_org_id()` SQL function to handle multi-org context via a session variable. This is schema-only — the UI client switcher is P2 but the schema must be in place before it. Estimated: 2 hours.

---

### P2 — Post-Launch

**P2-A: Commenting system (lightweight)**
Create `comments` table and `GET/POST /api/comments/[entityType]/[entityId]`. Add collapsible comment drawer to KPI cards and scenario detail. @mention pattern triggers `createNotification`. Add AI-drafted reply button (Claude call grounded in the relevant entity's data). Estimated: 2-3 days.

**P2-B: Scheduled report delivery**
Add `scheduled_reports` table. Build scheduling UI on report template page. Wire pg_cron or Vercel Cron. Generate AI-drafted cover note on each send. Estimated: 2 days.

**P2-C: Client-switcher UI for multi-org advisors**
Build org selector in the sidebar nav (populated from `advisor_org_access`). Build portfolio overview page showing all linked clients with KPI summary cards and alert count. Estimated: 2 days.

**P2-D: Report engagement tracking**
Track when a shared report link is opened: write a `report.viewed` audit entry with user agent, timestamp, and entity ID. Surface "Opened 3 times — last by sarah@hoxtonventures.com 2 hours ago" on the report detail page. Estimated: 1 day.

**P2-E: Supabase Realtime presence indicators**
Show avatar icons of who is currently viewing the same page. One Supabase Realtime presence channel per org per page. No OT, no conflict resolution. Just awareness. Estimated: 4 hours.

**P2-F: Notification preferences UI**
Add a "Notifications" section to settings. Toggle channel preference (in_app / email / both) per notification type. Persist to a `notification_preferences` table. Estimated: 4 hours.

---

### P3 — Later

**P3-A: True PDF binary generation** — Replace the HTML print route with a Puppeteer / Browserless integration. Necessary for proper investor-ready board packs.

**P3-B: Real-time collaborative editing (OT)** — Runway-style multi-user assumption editing with conflict resolution. Build only if advisor/client co-editing in meetings becomes a documented use case.

**P3-C: Document engagement analytics** — Per-page view tracking on PDFs (like Pitch or DocSend). Build only after investor portal has real traction.

**P3-D: @mention in activity feed** — Beyond comments, allow @mention in narrative sections of reports. Complex to implement without a rich-text editor.

**P3-E: Xero Practice Manager integration** — Auto-import advisor firm's client list for multi-org provisioning. Phase 3 enterprise feature.

---

## Architectural Concerns

### 1. Single `org_id` per Profile is a Structural Ceiling
The `profiles.org_id` FK with `NOT NULL` means every user belongs to exactly one organisation. This is correct for single-business users but blocks the advisory use case entirely. The fix requires a new `org_access` junction table and an update to `user_org_id()` to support multi-org context switching. This migration should be planned before any advisor-facing features are built to avoid compound debt.

**Recommendation:** Create `advisor_org_access` table in the next migration. The current single-org model remains valid for business owners and investors. Advisors gain multi-org access via the junction table, with RLS checking either `profiles.org_id = public.user_org_id()` (existing) or `id IN (SELECT client_org_id FROM advisor_org_access WHERE advisor_user_id = auth.uid())`.

### 2. Invitation Accept Flow Has No Frontend Entry Point
The accept API (`POST /api/invitations/accept`) is complete and correct. But it is called by no page in the frontend. This means the feature is backend-live but user-inaccessible. Every invite sent results in a dead link. The fix is a single landing page and it unblocks the entire multi-user proposition.

### 3. Notification `read` Boolean vs `read_at` Timestamp Mismatch
`notify.ts` inserts `read: false` and updates `read: true`. The `notifications` table schema has `read_at: timestamptz` (nullable). The `Notification` type in `types/index.ts` uses `read: boolean`. This inconsistency means: (1) RLS policy filters on `read_at` will not match client-side filtering on `read`; (2) timestamp-based "when did the user read this notification" data is being discarded. Standardise on `read_at` in the schema and derive `read: boolean` as `read_at != null` in the type.

### 4. Email API is a Stub, Not an Integration
`/api/email/send` renders a template and logs. It is used by zero callers in production routes (the `InviteForm` does not call it — it inserts the invitation directly and never triggers email dispatch). This creates a silent failure: invites appear to succeed but recipients never receive email. The email API needs to be wired to Resend and called from the invite creation flow, the report share flow, and the notification system.

### 5. Two Investor Portal Sections With No Clear Boundary
The sidebar has both `/investors` (with sub-routes `/investors/updates`, `/investors/documents`) and `/investor-portal` (with sub-routes `/investor-portal/builder`, `/investor-portal/readiness`, `/investor-portal/analytics`). Both are stubs. The naming and structure overlap. Before building either out, define: `/investors` = the founder's view of investor relations. `/investor-portal` = the investor's authenticated view of shared data. These should have different auth contexts. Currently both are accessible to any authenticated user.

### 6. Vault Visibility Types Defined But Not Enforced
`VaultVisibility` = `'org' | 'owner_only' | 'advisor_only'` in `vault/storage.ts`. There is no `investor` visibility tier. RLS policies on the vault table likely apply `org_id = user_org_id()` without checking visibility. When the investor portal is built, vault items marked `advisor_only` must not be readable by investor-role users. This needs explicit RLS policy updates before the investor portal goes live.

### 7. Activity Feed Component Is an Orphan
`ActivityFeed` is a polished, production-ready component with a good TypeScript interface. It is not imported by any page, not wired to any data source, and not tested. The `audit_logs` table is the natural data source. The component just needs an API route and a mounting point. This is not architectural debt — it's an almost-complete feature that needs one connection made.

### 8. Notification Creation Coverage Is Zero
Despite a complete notification infrastructure (schema, utility, API, UI), `createNotification()` is never called. The platform generates intelligence events, KPI variances, scenario locks, report publishes, and invitation accepts — all events that users should be notified about — without any notification being created. A systematic sweep of mutation routes to add notification creation calls is needed.

---

## Summary Lists

### BUILD
- **Invitation landing page** (`/invite/[token]`) — the missing piece that makes multi-user login work
- **Team management actions** (remove member, change role, resend invite, cancel invite) — security essential
- **Activity feed API** (`GET /api/activity/[orgId]` from audit_logs + profile name resolution) — wire existing component to real data
- **Notification wiring** — call `createNotification()` from intelligence, KPI, report, and scenario mutation routes
- **Report email distribution** — email button on report page with recipient input
- **Comments system (lightweight)** — polymorphic `comments` table, `GET/POST` API, drawer UI on KPI + scenario + report entities
- **Scheduled report delivery** — `scheduled_reports` table + pg_cron/Vercel Cron trigger
- **Client-switcher UI** — sidebar org selector for fractional CFO use case

### FIX
- **Wire Resend to `/api/email/send`** — replace `console.log` stub with real delivery
- **Call email API on invite creation** — `InviteForm` must call the email route after DB insert
- **Fix `read` vs `read_at` type inconsistency** — standardise on `read_at timestamptz` across schema, types, and utility functions
- **Investor portal — replace mocked data** — connect to real Xero/KPI routes or clearly mark as demo-only
- **Consolidate `/investors` and `/investor-portal` routes** — define clear auth boundary between founder and investor views
- **Add investor role to RBAC** — add `investor: 0` to `ROLE_HIERARCHY` with appropriate RLS policies
- **Schema migration for multi-org access** — `advisor_org_access` junction table before further advisor portal work

### LEVERAGE
- **Resend** (existing code comment recommends it) — invitation, notification, and report emails, ~10/month
- **Supabase Realtime** (already in stack) — replace notification polling with WebSocket subscription; add org-level presence channel for P2 presence indicators
- **Supabase Storage + signed URLs** — shareable report links with expiry (30-day default), zero additional infrastructure
- **Supabase Auth magic links** — passwordless investor access to data rooms without requiring account creation
- **Vercel Cron / pg_cron** — scheduled report delivery, already available in the infrastructure tier
- **Audit logs table** — already captures all mutation events; activity feed just needs a read route on top of it

### SKIP
- **Real-time collaborative editing (OT / CRDTs)** — Runway-level feature that requires dedicated infrastructure investment. The governed confirmation workflow (no direct-to-DB AI writes) actually reduces the need for OT. Skip until advisor/client co-editing is a documented, recurring use case.
- **Xero Practice Manager integration** — Phase 3 enterprise feature. Manual org provisioning is sufficient for Phase 1 advisors.
- **Per-page PDF engagement analytics** — DocSend-style page-by-page view tracking. Complex to implement, low near-term value. Revisit when investor portal has >50 active data rooms.
- **@mention in report narrative sections** — requires a rich-text editor (ProseMirror or Tiptap). The comment system should ship first; @mention in narratives is a phase 2 enhancement.
- **Real-time presence (full OT)** — Supabase presence indicators (avatars on pages) are P2 and achievable in 4 hours. Full cursor-level OT is P3. Skip OT for now.
- **Cell-level permissions (Vena-style)** — Granularity beyond role-level is over-engineered for the SME target. The current 4-role hierarchy with RLS is sufficient for Phase 1 and 2.

---

*End of Audit 10 — Collaboration & Sharing. Next section: Audit 11 — Advisor Portal.*
