# Feature Benchmark Audit #15 -- Automations & Alerts

**Platform:** Advisory OS (Grove)
**Audit Date:** 2 April 2026
**Auditor:** Claude Opus 4.6
**Scope:** All automation, alerting, notification, and scheduled-task capabilities
**Comparators:** Fathom, Jirav, Runway, Mosaic, DataRails, Planful, FP&A best practices

---

## 1. Feature Inventory

| # | Feature | Type | Location | Current State |
|---|---------|------|----------|---------------|
| 1 | In-app notification bell | UI Component | `src/components/layout/notification-bell.tsx` | **Implemented** -- polls `/api/notifications` every 30s, shows unread count badge, dropdown with 10 most recent, mark-as-read, mark-all-read, click-to-navigate via action_url |
| 2 | Notification data types | Type System | `src/types/index.ts` | **Implemented** -- 4 types defined: `intelligence`, `kpi_alert`, `variance_alert`, `system` |
| 3 | Notification CRUD API | API Route | `src/app/api/notifications/route.ts`, `src/app/api/notifications/[id]/route.ts` | **Implemented** -- GET (all/unread), POST (mark_all_read), PATCH (mark single as read). Zod validation. Auth-gated. |
| 4 | Notification creation utility | Library | `src/lib/notifications/notify.ts` | **Implemented** -- `createNotification()`, `getUnreadNotifications()`, `getNotifications()`, `markAsRead()`, `markAllAsRead()`. Uses service-role client. |
| 5 | AI anomaly detection engine | Library | `src/lib/ai/anomaly-detection.ts` | **Implemented** -- Claude API-powered. Compares latest month to 6-month history. Detects spikes, drops, trend changes, unusual transactions, threshold breaches. Max 5 anomalies. Governance-audited. |
| 6 | Anomaly detection API | API Route | `src/app/api/anomalies/[orgId]/route.ts` | **Implemented** -- GET endpoint, rate-limited (10/min/org), audit-logged. On-demand only (not scheduled). |
| 7 | Anomaly detection UI (deterministic) | Page | `src/app/(dashboard)/intelligence/anomalies/page.tsx` + `anomalies-client.tsx` | **Implemented** -- Server component compares latest vs prior period, flags >50% account-level changes. Shows severity dots, sorted by severity. |
| 8 | Health check with alerts | Library | `src/lib/analysis/health-check.ts` | **Implemented** -- `HealthAlert` type (info/warning/critical) with metric, message, recommendation. Deterministic math. |
| 9 | Dashboard alerts page (stub) | Page | `src/app/(dashboard)/dashboard/alerts/page.tsx` | **Stub only** -- Empty state: "No alerts configured yet. Set KPI targets to receive threshold alerts." Links to KPI targets page. |
| 10 | KPI targets page (stub) | Page | `src/app/(dashboard)/kpi/targets/page.tsx` | **Stub only** -- Empty state: "Connect your accounts first to see available KPIs." No actual target-setting functionality. |
| 11 | Email send API | API Route | `src/app/api/email/send/route.ts` | **Scaffolded** -- Templates for welcome, verification, password-reset, invitation. Actual sending is TODO (Resend/SendGrid commented out). |
| 12 | Xero sync trigger | API Route | `src/app/api/xero/sync/route.ts` | **Implemented** -- Manual POST trigger only. Rate-limited (3/min/org). No auto-scheduling. |
| 13 | Recommendation engine | Library | `src/lib/intelligence/recommendations.ts` | **Implemented** -- Static/demo recommendations per section. References alert configuration URLs that do not exist (`/kpi/alerts`, `/variance/alerts/configure`, `/intelligence/anomalies/configure`). |
| 14 | Report generator | Library | `src/lib/reports/generator.ts` | **Implemented** -- On-demand AI-powered report/board pack generation. No scheduled delivery. |
| 15 | Google Drive webhook | Library | `src/lib/integrations/google-drive.ts` | **Scaffolded** -- Webhook URL construction for Google Drive file change notifications. |

---

## 2. Benchmark Tables

### 2.1 KPI Threshold Alerts

| Capability | Advisory OS | Fathom | Jirav | Runway | Mosaic | DataRails | Planful |
|------------|-------------|--------|-------|--------|--------|-----------|---------|
| Set numeric threshold per KPI | Stub (page exists, no logic) | Yes | Yes | Yes | Yes | Yes | Yes |
| Above/below/range thresholds | No | Yes | Yes | Yes | Yes | Yes | Yes |
| Percentage deviation thresholds | No | Yes | Limited | Yes | Yes | Yes | Yes |
| Multi-condition thresholds | No | No | No | Yes | Yes | Yes | Yes |
| Threshold notification delivery | No | Email | Email | Email+Slack | Email+Slack | Email | Email+Slack |
| Per-user threshold preferences | No | No | No | Yes | Yes | Limited | Yes |

### 2.2 Anomaly Detection Alerts

| Capability | Advisory OS | Fathom | Jirav | Runway | Mosaic | DataRails | Planful |
|------------|-------------|--------|-------|--------|--------|-----------|---------|
| AI-powered anomaly detection | Yes (Claude API) | No | No | Limited | Yes | No | Limited |
| Deterministic anomaly detection | Yes (>50% change) | Yes | No | No | No | Yes | No |
| Auto-run on data sync | No (on-demand only) | Yes | N/A | Yes | Yes | Yes | Yes |
| Anomaly notification push | No | Email | N/A | In-app | In-app+Email | Email | Email |
| Severity classification | Yes (H/M/L) | No | N/A | Yes | Yes | No | Yes |
| Monetary impact estimation | Yes (AI) | No | N/A | No | Yes | No | No |
| Historical trend context | Yes (6-month) | Yes | N/A | Yes | Yes | Yes | Yes |

### 2.3 Scheduled Report Delivery

| Capability | Advisory OS | Fathom | Jirav | Runway | Mosaic | DataRails | Planful |
|------------|-------------|--------|-------|--------|--------|-----------|---------|
| Schedule recurring report email | No | Yes | Yes | Yes | Yes | Yes | Yes |
| Choose delivery frequency | No | Monthly | Weekly/Monthly | Custom | Custom | Custom | Custom |
| Select recipients | No | Yes | Yes | Yes | Yes | Yes | Yes |
| Auto-generate board pack | No (on-demand only) | No | No | No | No | No | Yes |
| Schedule PDF export | No | Yes | Yes | No | No | Yes | Yes |

### 2.4 Auto Data Sync Triggers

| Capability | Advisory OS | Fathom | Jirav | Runway | Mosaic | DataRails | Planful |
|------------|-------------|--------|-------|--------|--------|-----------|---------|
| Automatic scheduled sync | No (manual button) | Yes | Yes | Yes | Yes | Yes | Yes |
| Configurable sync frequency | No | Daily | Daily | Hourly | Real-time | Daily | Daily |
| Sync failure alerts | No | Yes | Yes | Yes | Yes | Yes | Yes |
| Post-sync anomaly detection | No | Yes | N/A | Yes | Yes | Yes | N/A |
| Sync status dashboard | Yes (data freshness badge) | Yes | Yes | Yes | Yes | Yes | Yes |

### 2.5 Custom Automation Rules

| Capability | Advisory OS | Fathom | Jirav | Runway | Mosaic | DataRails | Planful |
|------------|-------------|--------|-------|--------|--------|-----------|---------|
| If-then automation rules | No | No | No | Yes | Yes | Limited | Yes |
| Custom trigger conditions | No | No | No | Yes | Yes | No | Yes |
| Multi-step workflows | No | No | No | No | Yes | No | Yes |
| Approval chain automation | No | No | No | No | Yes | No | Yes |

### 2.6 Email / Slack / Webhook Notifications

| Capability | Advisory OS | Fathom | Jirav | Runway | Mosaic | DataRails | Planful |
|------------|-------------|--------|-------|--------|--------|-----------|---------|
| In-app notifications | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Email notifications | Scaffolded (no send) | Yes | Yes | Yes | Yes | Yes | Yes |
| Slack integration | No | No | No | Yes | Yes | No | Yes |
| Webhook outbound | No | No | No | Yes | Yes | No | Limited |
| Teams integration | No | No | No | No | Yes | No | Yes |

### 2.7 Alert Management UI

| Capability | Advisory OS | Fathom | Jirav | Runway | Mosaic | DataRails | Planful |
|------------|-------------|--------|-------|--------|--------|-----------|---------|
| Dedicated alert config page | Stub only | Yes | Limited | Yes | Yes | Yes | Yes |
| Enable/disable per alert | No | Yes | No | Yes | Yes | Yes | Yes |
| Alert frequency controls | No | No | No | Yes | Yes | No | Yes |
| Quiet hours / DND | No | No | No | No | Yes | No | No |
| Per-user alert preferences | No | Yes | No | Yes | Yes | Limited | Yes |

### 2.8 Alert History & Audit

| Capability | Advisory OS | Fathom | Jirav | Runway | Mosaic | DataRails | Planful |
|------------|-------------|--------|-------|--------|--------|-----------|---------|
| Alert history log | Partial (notifications table, read/unread) | No | No | Yes | Yes | No | Yes |
| Alert audit trail | Partial (anomaly detection logged) | No | No | No | Yes | No | Yes |
| Alert resolution tracking | No | No | No | No | Yes | No | Yes |
| Alert analytics/stats | No | No | No | No | Yes | No | Limited |

### 2.9 Budget Variance Alerts

| Capability | Advisory OS | Fathom | Jirav | Runway | Mosaic | DataRails | Planful |
|------------|-------------|--------|-------|--------|--------|-----------|---------|
| Auto budget vs actual alerting | No (recommended in UI, not built) | Yes | Yes | Yes | Yes | Yes | Yes |
| Configurable variance thresholds | No | Limited | Yes | Yes | Yes | Yes | Yes |
| Per-line-item alerts | No | No | No | Yes | Yes | Yes | Yes |
| Favourable/unfavourable distinction | No | Yes | Yes | Yes | Yes | Yes | Yes |

### 2.10 Board Pack Auto-Generation

| Capability | Advisory OS | Fathom | Jirav | Runway | Mosaic | DataRails | Planful |
|------------|-------------|--------|-------|--------|--------|-----------|---------|
| On-demand board pack | Yes | Yes | No | No | No | Yes | Yes |
| Scheduled board pack | No | No | No | No | No | No | Yes |
| Auto-email to board members | No | No | No | No | No | No | Yes |
| Version history | No | No | No | No | No | Yes | Yes |

### 2.11 Xero Sync Failure Alerts

| Capability | Advisory OS | Fathom | Jirav | Runway | Mosaic | DataRails | Planful |
|------------|-------------|--------|-------|--------|--------|-----------|---------|
| Sync failure detection | No | Yes | Yes | Yes | Yes | Yes | Yes |
| In-app sync failure alert | No | Yes | Yes | Yes | Yes | Yes | Yes |
| Email on sync failure | No | Yes | Yes | Yes | Yes | Yes | Yes |
| Token expiry warning | No | No | No | Yes | No | No | No |
| Auto-retry on failure | No | Yes | Yes | Yes | Yes | Yes | Yes |

---

## 3. Competitive Feature Matrix

| Feature Area | Advisory OS | Fathom | Jirav | Runway | Mosaic | DataRails | Planful | Industry Avg |
|--------------|:-----------:|:------:|:-----:|:------:|:------:|:---------:|:-------:|:------------:|
| KPI threshold alerts | 0/5 | 3/5 | 3/5 | 4/5 | 4/5 | 4/5 | 4/5 | 3.7 |
| Anomaly detection | 3/5 | 2/5 | 0/5 | 2/5 | 4/5 | 2/5 | 2/5 | 2.0 |
| Scheduled reports | 0/5 | 3/5 | 3/5 | 3/5 | 4/5 | 4/5 | 5/5 | 3.7 |
| Auto data sync | 0/5 | 4/5 | 4/5 | 4/5 | 5/5 | 4/5 | 4/5 | 4.2 |
| Custom automations | 0/5 | 0/5 | 0/5 | 3/5 | 4/5 | 1/5 | 4/5 | 2.0 |
| Notification channels | 1/5 | 3/5 | 3/5 | 4/5 | 5/5 | 3/5 | 4/5 | 3.7 |
| Alert management UI | 0/5 | 3/5 | 1/5 | 4/5 | 4/5 | 3/5 | 4/5 | 3.2 |
| Alert history | 2/5 | 1/5 | 0/5 | 3/5 | 4/5 | 1/5 | 4/5 | 2.2 |
| Budget variance alerts | 0/5 | 3/5 | 3/5 | 4/5 | 4/5 | 4/5 | 4/5 | 3.7 |
| Board pack scheduling | 1/5 | 1/5 | 0/5 | 0/5 | 0/5 | 2/5 | 4/5 | 1.2 |
| Sync failure alerts | 0/5 | 4/5 | 4/5 | 4/5 | 4/5 | 4/5 | 4/5 | 4.0 |
| **TOTAL** | **7/55** | **27/55** | **21/55** | **35/55** | **42/55** | **32/55** | **41/55** | **33.4** |

**Advisory OS scores 12.7% of possible points vs an industry average of 60.7%.** This is the single largest feature deficit across all audits to date.

---

## 4. Gap Analysis

| ID | Gap | Severity | Impact | Notes |
|----|-----|----------|--------|-------|
| GAP-1 | **No scheduled/automatic Xero sync** -- sync is manual-trigger only via POST. Every competitor auto-syncs on at least a daily cadence. | **Critical** | Users must remember to click sync; stale data undermines every downstream feature (KPIs, anomalies, variance, reports). | The sync engine (`runFullSync`) exists and works. Only the scheduling mechanism is missing. |
| GAP-2 | **No KPI threshold alerting** -- the alerts page is a stub; the targets page is a stub. `kpi_alert` notification type is defined but never created anywhere in the codebase. | **Critical** | Advisory OS references KPI alerts in recommendations, UI hints, and notification-bell icon mapping, but the feature does not exist. Users who follow the CTA to "Set up KPI targets" find a dead end. |
| GAP-3 | **No email delivery** -- the email/send API has all templates but actual sending is commented out (`// TODO: Replace with Resend or SendGrid integration`). | **Critical** | No notification channel outside of in-app. Users cannot receive alerts when they are not in the app. Blocks all email-dependent features (scheduled reports, sync failure alerts, etc.). |
| GAP-4 | **No budget variance alerting** -- variance analysis exists but has no alerting layer. `variance_alert` notification type is defined but never created. | **High** | Variance alerts are the #1 use case for FP&A alerting. Every competitor offers this. Recommendations reference `/variance/alerts/configure` which is a dead link. |
| GAP-5 | **Anomaly detection is on-demand only** -- never runs automatically on data sync. The `detectAnomalies()` function exists but is only called via the GET API route when a user visits the page. | **High** | Anomalies detected days late lose their value. Competitors run detection on every sync and push alerts proactively. |
| GAP-6 | **No Xero sync failure alerting** -- if sync fails, the error is logged to console but no notification is created. No user-facing indication of failure except checking sync status manually. | **High** | Broken syncs can go unnoticed for days/weeks, corrupting all downstream analysis. |
| GAP-7 | **No scheduled report delivery** -- reports and board packs can be generated on-demand but cannot be scheduled for recurring email delivery. | **High** | Advisory CFOs and board members expect automated monthly/quarterly reports. This is table stakes for FP&A platforms. |
| GAP-8 | **No Slack/Teams/webhook integration** -- notification channels are limited to in-app only (plus scaffolded email). | **Medium** | Many advisory firms live in Slack/Teams. Runway and Mosaic differentiate strongly on multi-channel alerts. |
| GAP-9 | **No alert configuration UI** -- no way to create, edit, enable/disable, or configure any alert rule from the UI. The alerts page and several recommendation CTAs point to non-existent configuration pages. | **High** | The entire alerting subsystem lacks a user-facing configuration layer. |
| GAP-10 | **No auto-retry on sync failure** -- sync failures are terminal. No exponential backoff or retry mechanism. | **Medium** | Transient Xero API failures (rate limits, timeouts) cause unnecessary sync failures that require manual intervention. |
| GAP-11 | **Notification polling (not real-time)** -- the notification bell polls every 30 seconds. No WebSocket or Server-Sent Events. | **Low** | 30-second delay is acceptable for MVP but creates unnecessary server load at scale. |
| GAP-12 | **`createNotification()` is never called** -- the function exists but has zero call sites in the codebase. The entire notification creation pipeline is disconnected. | **Critical** | No code path ever creates a notification. The notification bell will always show empty. The notifications table may have no rows. |
| GAP-13 | **Dead-link CTAs in recommendations** -- at least 3 recommendation items link to pages that do not exist: `/kpi/alerts`, `/variance/alerts/configure`, `/intelligence/anomalies/configure`. | **Medium** | Users following AI recommendations hit 404s, damaging trust. |
| GAP-14 | **No conditional workflow engine** -- no if/then/else automation rules for multi-step financial workflows (e.g., "if variance > 15% AND category = payroll THEN notify admin AND flag for review"). | **Medium** | Only Runway, Mosaic, and Planful offer this. Not a near-term priority but needed for enterprise tier. |

---

## 5. Prioritised Recommendations

### P0 -- Ship-Blocking (Address Immediately)

**P0-1. Wire `createNotification()` into existing event flows.**
The function exists, the API exists, the UI exists, but nothing calls `createNotification()`. Wire it into:
- Anomaly detection (after `detectAnomalies()` finds high-severity anomalies)
- Health check alerts (when `HealthAlert` severity is "critical" or "warning")
- Xero sync completion (system notification with sync stats)
- Xero sync failure (system notification with error detail)
Files: `src/lib/ai/anomaly-detection.ts`, `src/lib/analysis/health-check.ts`, `src/lib/xero/sync.ts`, `src/lib/notifications/notify.ts`

**P0-2. Implement email sending via Resend.**
Uncomment and complete the Resend integration in `src/app/api/email/send/route.ts`. Add alert-specific email templates (KPI breach, variance alert, sync failure, anomaly detected). Per `docs/BUILD_VS_BUY_ANALYSIS.md`, Resend is the recommended provider.

**P0-3. Implement scheduled Xero sync.**
Add a Vercel Cron Job or equivalent that calls `runFullSync()` daily (or configurable frequency). This unblocks GAP-1 and GAP-5. After sync completes, run anomaly detection and push notifications for any findings.
Files: New `src/app/api/cron/xero-sync/route.ts`

**P0-4. Build KPI threshold alert configuration.**
Replace the stub at `src/app/(dashboard)/kpi/targets/page.tsx` with a real form that lets users set target values, threshold percentages, and alert preferences per KPI. Store in a new `kpi_targets` table. Create a `checkKpiThresholds()` function that runs post-sync.
Files: `src/app/(dashboard)/kpi/targets/page.tsx`, new `src/lib/kpi/threshold-check.ts`

### P1 -- Core Competitive Parity (Next Sprint)

**P1-1. Budget variance alert engine.**
Create `src/lib/variance/alert-engine.ts` that compares actuals to budgets per line item and creates `variance_alert` notifications when configurable thresholds are breached. Run after every sync.

**P1-2. Alert configuration UI.**
Build a dedicated alert management page at `/settings/alerts` (or `/dashboard/alerts`) where users can:
- View all active alert rules
- Enable/disable individual alerts
- Set threshold values and delivery preferences
- View alert history

**P1-3. Sync failure detection and alerting.**
Wrap `runFullSync()` in error handling that creates a `system` notification on failure, sends an email to org admins, and logs the failure with retry metadata.

**P1-4. Scheduled report delivery.**
Add a scheduling layer to the report generator that lets users configure monthly/quarterly auto-generation and email delivery of board packs and management reports.

**P1-5. Fix dead-link CTAs.**
Either build the pages behind `/kpi/alerts`, `/variance/alerts/configure`, and `/intelligence/anomalies/configure`, or redirect them to the unified alert configuration UI from P1-2.

### P2 -- Differentiation (Future Sprints)

**P2-1. Slack integration for alert delivery.**
Add Slack OAuth and webhook-based alert delivery. Allow users to map alert types to Slack channels.

**P2-2. Webhook outbound for custom integrations.**
Allow users to register webhook URLs to receive JSON payloads for any alert event.

**P2-3. Auto-retry with exponential backoff for sync failures.**
Implement retry logic (3 attempts, exponential backoff) before marking a sync as failed.

**P2-4. Replace notification polling with SSE/WebSocket.**
Upgrade the notification bell from 30-second polling to Server-Sent Events for real-time delivery.

**P2-5. Conditional workflow engine.**
Build an if/then rule builder for multi-step automations (e.g., variance breach triggers notification + board pack generation + Slack message).

---

## 6. Architectural Concerns

| ID | Concern | Severity | Detail |
|----|---------|----------|--------|
| ARCH-1 | **Disconnected notification pipeline** | Critical | `createNotification()` has zero call sites. The entire notification infrastructure (types, DB table, API, UI) is built but never activated. This is the single highest-priority fix. |
| ARCH-2 | **No background job infrastructure** | High | Advisory OS has no cron/job system. Xero sync, anomaly detection, report generation, and alert evaluation all need to run on schedules or in response to events. Vercel Cron is the simplest path per the build-vs-buy doc. |
| ARCH-3 | **Email sending is a TODO** | High | `src/app/api/email/send/route.ts` logs to console instead of sending. Every email-dependent feature is blocked. |
| ARCH-4 | **Two parallel anomaly detection systems** | Medium | The AI-powered engine (`src/lib/ai/anomaly-detection.ts`) and the deterministic page-level detection (`src/app/(dashboard)/intelligence/anomalies/page.tsx`) detect anomalies independently with different algorithms and thresholds (AI: 20% vs 6-month avg; deterministic: 50% vs prior period). These should be unified or clearly layered. |
| ARCH-5 | **Notification types are too narrow** | Low | Only 4 types (`intelligence`, `kpi_alert`, `variance_alert`, `system`). Missing: `sync_failure`, `report_ready`, `budget_created`, `team_activity`, `approval_required`. Consider making this extensible. |
| ARCH-6 | **No notification preferences model** | Medium | No way for users to control which notifications they receive, via which channel, or set quiet hours. The recommendations reference `/settings/notifications` but no such page exists. |
| ARCH-7 | **`as any` casts in notification library** | Low | `src/lib/notifications/notify.ts` uses `from('notifications' as any)` on every query, suggesting the Supabase types are not generated for the notifications table. This should be fixed when types are regenerated. |

---

## 7. Summary Lists

### BUILD (Does not exist, must be created)

1. Scheduled Xero sync (Vercel Cron job)
2. KPI threshold alert engine + configuration UI
3. Budget variance alert engine
4. Alert configuration/management page
5. Sync failure detection and alerting
6. Scheduled report delivery
7. Email sending integration (Resend)
8. Alert-specific email templates (KPI breach, variance, anomaly, sync failure)
9. Notification preferences page (`/settings/notifications`)
10. Cron/background job infrastructure

### FIX (Exists but broken or disconnected)

1. Wire `createNotification()` into event flows (zero call sites currently)
2. Fix dead-link CTAs in recommendations (`/kpi/alerts`, `/variance/alerts/configure`, `/intelligence/anomalies/configure`)
3. Replace `as any` casts in notification library with proper Supabase types
4. Connect anomaly detection to run automatically post-sync (not just on-demand)
5. Unify or layer the two parallel anomaly detection systems
6. Complete the alerts page stub (`/dashboard/alerts`) with real functionality
7. Complete the KPI targets page stub with real form

### LEVERAGE (Exists and works, amplify it)

1. Notification bell component -- well-built, just needs data flowing into it
2. AI anomaly detection engine -- sophisticated Claude API integration with governance, just needs to be triggered automatically and create notifications
3. Health check alert system -- generates `HealthAlert` objects with severity/recommendations, just needs to push notifications
4. Notification type system -- 4 types with distinct icons in the bell UI, ready to receive data
5. Audit logging on anomaly detection -- governance trail already in place
6. Report generator -- on-demand generation works, just needs scheduling layer

### SKIP (Not worth building now)

1. Conditional workflow engine (P2 -- only Mosaic and Planful have this; overkill for SME advisory)
2. Teams integration (small user base, Slack first)
3. WebSocket/SSE for notifications (30-second polling is acceptable for current scale)
4. Alert analytics/statistics dashboard (nice-to-have, no competitive pressure)
5. User activity notifications (low value vs effort for advisory use case)

---

**Bottom line:** Advisory OS has built the foundation pieces (notification types, DB table, bell UI, anomaly engine, notification CRUD) but has **never connected them**. The `createNotification()` function has literally zero call sites -- it is the most impactful single-line fix in the codebase. Beyond that, the platform lacks any scheduled/automated execution, email delivery, and alert configuration UI. These gaps make Advisory OS score 12.7% against an industry average of 60.7% in automations and alerts -- the widest deficit of any feature area audited. The good news is that most of the hard infrastructure exists; the work is primarily wiring, scheduling, and building configuration UI.