# Feature Benchmark Audit #14 -- Settings & Configuration

**Platform:** Advisory OS (Grove)
**Audit Date:** 2 April 2026
**Auditor:** Claude Opus 4.6
**Competitors Benchmarked:** Fathom, Jirav, Runway, Mosaic, DataRails, General SaaS Best Practices

---

## 1. Feature Inventory

| # | Feature | Type | Location | Current State |
|---|---------|------|----------|---------------|
| 1 | Organisation name display | UI (read-only) | `settings/page.tsx` | Displays org name from profile. No edit capability. |
| 2 | Team member listing | UI (read) | `settings/page.tsx` | Lists members with display name and role badge. No edit/remove. |
| 3 | Invite team member | Form (write) | `settings/invite-form.tsx` | Functional. Email + role (admin/advisor/viewer). Inserts into `org_invitations` with 7-day expiry token. |
| 4 | Pending invitations display | UI (read) | `settings/page.tsx` | Shows pending invitations with email, role, status. No cancel/resend. |
| 5 | Team & Roles sub-page | UI (static) | `settings/team/page.tsx` | Static role descriptions (Admin/Advisor/Viewer/Investor). Invite button is non-functional placeholder. |
| 6 | Language preferences | UI (client-only) | `settings/preferences/page.tsx` | 12 languages. Client-only state -- no persistence to DB. |
| 7 | Date format preferences | UI (client-only) | `settings/preferences/page.tsx` | 3 formats. Client-only state -- no persistence. |
| 8 | Number format preferences | UI (client-only) | `settings/preferences/page.tsx` | 3 formats. Client-only state -- no persistence. |
| 9 | Timezone preferences | UI (client-only) | `settings/preferences/page.tsx` | 12 timezones. Client-only state -- no persistence. |
| 10 | Email notification preferences | UI (client-only) | `settings/preferences/page.tsx` | 5 notification toggles. Client-only -- no persistence. |
| 11 | Module toggles | UI (client-only) | `settings/modules/page.tsx` | 7 modules with on/off toggles. Client-only state -- no persistence. |
| 12 | Data exports (on-demand) | UI (mock) | `settings/exports/page.tsx` | 6 export types with format buttons (PDF/XLSX/CSV). Click shows "Downloaded" but does not actually export. |
| 13 | Scheduled exports | UI (static) | `settings/exports/page.tsx` | 2 hardcoded scheduled exports shown. No create/edit/delete functionality. |
| 14 | API key display | UI (static) | `settings/exports/page.tsx` | Masked API key shown with "Reveal" button (non-functional). No key generation or rotation. |
| 15 | Industry Blueprints | UI (functional) | `settings/blueprints/page.tsx` | Full blueprint browser with search, filter, preview, and apply via API. Also supports "Create Blueprint from Current Setup". Best-implemented settings feature. |
| 16 | Agent settings (per-agent) | UI (partial) | `agents/[slug]/settings/page.tsx` | Custom instructions, notification prefs, approval thresholds, connected data sources. All client-only -- no persistence. |
| 17 | Currency context provider | Provider | `providers/currency-context.tsx` | Runtime currency context (GBP default). No settings UI to change base currency. |
| 18 | Accounting config context | Provider | `providers/accounting-config-context.tsx` | FY year-end, base currency from Xero. No manual override settings UI. |
| 19 | Org accounting config (Xero pull) | Backend | `lib/xero/org-config.ts` | Pulls FY end day/month, base currency, VAT scheme from Xero. Stored in `org_accounting_config`. |
| 20 | Role-based access control | Backend | `lib/supabase/roles.ts` | Role hierarchy (admin > advisor > viewer). `hasMinRole` gate for invite. |
| 21 | Billing & subscription | Page (mock) | `billing/billing-client.tsx` | Full billing page with Overview/Invoices/Payment tabs. All data from mock functions. No Stripe/payment integration. |
| 22 | Integration management | Page (partial) | `integrations/integrations-client.tsx` | 28 integrations catalogued across 7 categories. Only Xero and QuickBooks actually connectable. |
| 23 | Audit logging backend | Backend | `lib/audit/log.ts` | Immutable audit log insert with retry. No viewer UI in settings. |
| 24 | Report themes (white-label) | Backend | `lib/reports/themes.ts` | 7 colour themes for PDF board packs. Theme selection in report generation, not in settings. |
| 25 | Financial periods library | Backend | `lib/financial/periods.ts` | FY-aware period utilities, quarter labels, YTD filtering. Pure functions. |

---

## 2. Benchmark Tables

### 2.1 Organisation Profile

| Capability | Fathom | Jirav | Runway | Mosaic | DataRails | Advisory OS | Best Practice |
|-----------|--------|-------|--------|--------|-----------|-------------|---------------|
| Org name edit | Yes | Yes | Yes | Yes | Yes | NO (read-only) | Yes |
| Org logo upload | Yes | Yes | Yes | Yes | Yes | NO | Yes |
| Legal entity details | No | Yes | No | Yes | Yes | NO | Yes for financial |
| Industry classification | No | Yes | No | Yes | No | Via blueprint only | Yes |
| Business address | No | No | No | Yes | Yes | Billing page only (mock) | Yes |
| Tax registration (VAT/TIN) | No | No | No | No | Yes | Pulled from Xero, not editable | Yes for UK |
| Company registration number | No | No | No | No | Yes | Pulled from Xero, not editable | Yes for UK |

### 2.2 User Management & Invitations

| Capability | Fathom | Jirav | Runway | Mosaic | DataRails | Advisory OS | Best Practice |
|-----------|--------|-------|--------|--------|-----------|-------------|---------------|
| Invite by email | Yes | Yes | Yes | Yes | Yes | YES | Yes |
| Role assignment on invite | Yes | Yes | Yes | Yes | Yes | YES (3 roles) | Yes |
| Cancel pending invitation | Yes | Yes | Yes | Yes | Yes | NO | Yes |
| Resend invitation | Yes | Yes | Yes | Yes | Yes | NO | Yes |
| Remove team member | Yes | Yes | Yes | Yes | Yes | NO | Yes |
| Change member role | Yes | Yes | Yes | Yes | Yes | NO | Yes |
| Invitation expiry handling | Yes | Yes | Yes | Yes | Yes | 7-day token, no UI | Yes |
| Bulk invite | No | Yes | No | Yes | Yes | NO | Nice-to-have |
| SSO/SAML | No | No | Yes | Yes | Yes | NO | Enterprise tier |
| 2FA enforcement | No | No | Yes | Yes | Yes | NO | Yes |

### 2.3 Role & Permission Configuration

| Capability | Fathom | Jirav | Runway | Mosaic | DataRails | Advisory OS | Best Practice |
|-----------|--------|-------|--------|--------|-----------|-------------|---------------|
| Pre-defined roles | Yes (3) | Yes (4) | Yes (5) | Yes (5+) | Yes (6+) | YES (4: admin/advisor/viewer/investor) | Yes |
| Custom role creation | No | No | Yes | Yes | Yes | NO | Enterprise tier |
| Granular permissions matrix | No | No | Yes | Yes | Yes | NO (static description only) | Enterprise tier |
| Feature-level access control | No | Yes | Yes | Yes | Yes | NO | Yes |
| Data-level access control | No | No | Yes | Yes | Yes | Via RLS only (no UI) | Enterprise tier |
| Role hierarchy enforcement | Yes | Yes | Yes | Yes | Yes | YES (backend) | Yes |

### 2.4 Integration Management

| Capability | Fathom | Jirav | Runway | Mosaic | DataRails | Advisory OS | Best Practice |
|-----------|--------|-------|--------|--------|-----------|-------------|---------------|
| Accounting software connect | Yes | Yes | Yes | Yes | Yes | YES (Xero, QBO) | Yes |
| Disconnect integration | Yes | Yes | Yes | Yes | Yes | Partial (Xero only) | Yes |
| Sync status/history | Yes | Yes | Yes | Yes | Yes | YES (last sync time, records) | Yes |
| Manual sync trigger | Yes | Yes | Yes | Yes | Yes | YES | Yes |
| Integration health check | Yes | No | No | Yes | Yes | YES (health page exists) | Yes |
| CRM integrations | No | No | Yes | Yes | Yes | NO (coming soon) | Nice-to-have |
| HR/Payroll integrations | No | Yes | Yes | Yes | Yes | NO (coming soon) | Nice-to-have |
| Webhook config | No | No | Yes | Yes | Yes | NO | Enterprise tier |

### 2.5 Billing & Subscription

| Capability | Fathom | Jirav | Runway | Mosaic | DataRails | Advisory OS | Best Practice |
|-----------|--------|-------|--------|--------|-----------|-------------|---------------|
| Plan selection/upgrade | Yes | Yes | Yes | Yes | Yes | NO (mock data only) | Yes |
| Invoice history | Yes | Yes | Yes | Yes | Yes | YES (mock) | Yes |
| Payment method management | Yes | Yes | Yes | Yes | Yes | NO (mock) | Yes (Stripe) |
| Usage metering | Yes | Yes | No | Yes | No | NO | Yes for credit-based |
| Billing address edit | Yes | Yes | Yes | Yes | Yes | NO (static display) | Yes |
| Bundle recommendations | No | No | No | No | No | YES (mock, unique differentiator) | Novel |
| Value tracking (savings shown) | No | No | No | No | No | YES (mock, unique differentiator) | Novel |

### 2.6 Notification Preferences

| Capability | Fathom | Jirav | Runway | Mosaic | DataRails | Advisory OS | Best Practice |
|-----------|--------|-------|--------|--------|-----------|-------------|---------------|
| Email notification toggles | Yes | Yes | Yes | Yes | Yes | YES (5 toggles, no persistence) | Yes |
| In-app notification config | No | Yes | Yes | Yes | Yes | Agent-level only (no persistence) | Yes |
| Slack/Teams notifications | No | No | Yes | Yes | Yes | NO | Nice-to-have |
| Alert thresholds | No | Yes | Yes | Yes | Yes | Agent-level (no persistence) | Yes |
| Digest frequency control | No | No | Yes | Yes | Yes | NO (hardcoded weekly) | Yes |

### 2.7 Data Export/Import

| Capability | Fathom | Jirav | Runway | Mosaic | DataRails | Advisory OS | Best Practice |
|-----------|--------|-------|--------|--------|-----------|-------------|---------------|
| On-demand export (PDF) | Yes | Yes | Yes | Yes | Yes | UI only (no backend) | Yes |
| On-demand export (XLSX) | Yes | Yes | Yes | Yes | Yes | UI only (no backend) | Yes |
| On-demand export (CSV) | Yes | Yes | Yes | Yes | Yes | UI only (no backend) | Yes |
| Scheduled exports | No | No | Yes | Yes | Yes | UI only (hardcoded, non-functional) | Yes |
| Data import (CSV/XLSX) | Yes | Yes | Yes | Yes | Yes | NO | Yes |
| Bulk data download | Yes | Yes | No | Yes | Yes | NO | Yes |

### 2.8 API Access

| Capability | Fathom | Jirav | Runway | Mosaic | DataRails | Advisory OS | Best Practice |
|-----------|--------|-------|--------|--------|-----------|-------------|---------------|
| API key generation | No | Yes | Yes | Yes | Yes | NO (static placeholder) | Yes |
| Key rotation | No | Yes | Yes | Yes | Yes | NO | Yes |
| Scoped permissions | No | No | Yes | Yes | Yes | NO | Yes |
| API documentation link | No | Yes | Yes | Yes | Yes | Placeholder link only | Yes |
| Rate limit display | No | No | No | Yes | Yes | NO | Nice-to-have |
| Webhook management | No | No | Yes | Yes | Yes | NO | Enterprise tier |

### 2.9 Branding / White-Label

| Capability | Fathom | Jirav | Runway | Mosaic | DataRails | Advisory OS | Best Practice |
|-----------|--------|-------|--------|--------|-----------|-------------|---------------|
| Report theme selection | Yes | No | No | No | Yes | YES (7 themes, in report builder) | Yes |
| Custom logo on reports | Yes | No | No | No | Yes | NO | Yes |
| Custom colours | No | No | No | No | Yes | YES (theme presets) | Yes |
| White-label domain | No | No | No | No | No | NO | Enterprise tier |
| Email template branding | No | No | No | No | No | NO | Nice-to-have |

### 2.10 Financial Year / Period Configuration

| Capability | Fathom | Jirav | Runway | Mosaic | DataRails | Advisory OS | Best Practice |
|-----------|--------|-------|--------|--------|-----------|-------------|---------------|
| Auto-detect from accounting | Yes | Yes | Yes | Yes | Yes | YES (from Xero) | Yes |
| Manual FY override | Yes | Yes | Yes | Yes | Yes | NO | Yes |
| Period lock dates | Yes | No | No | Yes | Yes | Stored from Xero, no UI | Yes |
| Custom period definitions | No | Yes | Yes | Yes | Yes | NO | Enterprise tier |
| Quarter labelling | No | Yes | Yes | Yes | Yes | YES (FY-aware Q labels) | Yes |

### 2.11 Currency & Locale

| Capability | Fathom | Jirav | Runway | Mosaic | DataRails | Advisory OS | Best Practice |
|-----------|--------|-------|--------|--------|-----------|-------------|---------------|
| Base currency from accounting | Yes | Yes | Yes | Yes | Yes | YES | Yes |
| Manual currency override | Yes | Yes | Yes | Yes | Yes | NO (no UI) | Yes |
| Multi-currency support | Yes | Yes | Yes | Yes | Yes | Context exists but no toggle | Yes |
| Number format selection | No | Yes | Yes | Yes | Yes | YES (client-only, no persist) | Yes |
| Date format selection | No | Yes | Yes | Yes | Yes | YES (client-only, no persist) | Yes |
| Language selection | No | No | No | Yes | Yes | YES (client-only, no persist) | Yes |

### 2.12 Audit Log Viewer

| Capability | Fathom | Jirav | Runway | Mosaic | DataRails | Advisory OS | Best Practice |
|-----------|--------|-------|--------|--------|-----------|-------------|---------------|
| Audit log viewer UI | No | No | No | Yes | Yes | NO (backend only) | Yes for governance platforms |
| Filter by user/action/date | No | No | No | Yes | Yes | NO | Yes |
| Export audit logs | No | No | No | Yes | Yes | Export placeholder in exports page | Yes |
| Real-time audit feed | No | No | No | No | Yes | NO | Nice-to-have |

### 2.13 Data Retention / Deletion

| Capability | Fathom | Jirav | Runway | Mosaic | DataRails | Advisory OS | Best Practice |
|-----------|--------|-------|--------|--------|-----------|-------------|---------------|
| Account deletion request | Yes | Yes | Yes | Yes | Yes | NO | GDPR required |
| Data export before deletion | Yes | Yes | Yes | Yes | Yes | NO | GDPR required |
| Retention policy display | No | No | No | Yes | Yes | NO | Yes for governance |
| Org data purge | No | No | No | Yes | Yes | NO | Yes |
| Privacy policy link | Yes | Yes | Yes | Yes | Yes | YES (marketing pages) | Yes |

---

## 3. Competitive Feature Matrix

| Feature Area | Fathom | Jirav | Runway | Mosaic | DataRails | Advisory OS | Gap? |
|-------------|--------|-------|--------|--------|-----------|-------------|------|
| Org profile edit | P | F | P | F | F | MINIMAL | YES |
| User management (CRUD) | F | F | F | F | F | PARTIAL (invite only) | YES |
| Role/permission config | P | P | F | F | F | STATIC | YES |
| Integration management | F | F | F | F | F | PARTIAL | MINOR |
| Billing/subscription | F | F | F | F | F | MOCK ONLY | YES |
| Notification preferences | P | F | F | F | F | NO PERSISTENCE | YES |
| Data export/import | F | F | F | F | F | MOCK UI ONLY | YES |
| API access management | N | F | F | F | F | PLACEHOLDER | YES |
| Branding/white-label | P | N | N | N | F | PARTIAL (report themes) | MINOR |
| Financial year config | F | F | F | F | F | AUTO ONLY | MINOR |
| Currency & locale | P | F | F | F | F | NO PERSISTENCE | YES |
| Audit log viewer | N | N | N | F | F | NO UI | YES |
| Data retention/deletion | P | P | P | F | F | NONE | YES |

**Legend:** F = Full, P = Partial, N = None/Not available

---

## 4. Gap Analysis

| ID | Gap | Severity | Impact |
|----|-----|----------|--------|
| GAP-1 | **No settings persistence layer.** Preferences, modules, notification toggles, language, timezone, date/number format all use `useState` only. Refreshing the page resets everything. | CRITICAL | Every user preference is lost on reload. The entire preferences page is non-functional. |
| GAP-2 | **No organisation profile editing.** Org name is read-only. No logo upload, no address edit, no industry field, no tax/registration number edit. | HIGH | Advisors cannot customise their org. Blocks white-label and professional appearance. |
| GAP-3 | **No team member management beyond invite.** Cannot remove members, change roles, cancel invitations, or resend invitations. | HIGH | Admin cannot manage access lifecycle. Security risk for departing team members. |
| GAP-4 | **Billing page entirely mock.** No Stripe integration. Payment method, invoices, plan selection all hardcoded. Cannot process real payments. | CRITICAL | No revenue collection possible. Blocks monetisation entirely. |
| GAP-5 | **Data exports non-functional.** Export buttons show "Downloaded" animation but generate no actual files. Scheduled exports are static display. | HIGH | Users cannot extract their data. Potential compliance issue (GDPR right to data portability). |
| GAP-6 | **API key management is a static placeholder.** No generation, rotation, or real API key infrastructure. | MEDIUM | Blocks developer/integration use case. Affects platform extensibility. |
| GAP-7 | **No audit log viewer UI.** Backend `logAudit()` writes immutable records, but no settings or governance page exposes these to admins. | HIGH | Governance-focused platform cannot show its own audit trail to users. Undermines core value proposition. |
| GAP-8 | **No data retention or account deletion.** No GDPR-compliant deletion workflow, no retention policy display, no data export-then-delete flow. | HIGH | GDPR non-compliance risk for UK/EU users. Legal liability. |
| GAP-9 | **No currency settings UI.** CurrencyProvider exists with multi-currency support but there is no user-facing way to change the base currency outside of what Xero provides. | MEDIUM | Multi-currency users cannot switch display currency. |
| GAP-10 | **Notification preferences not connected to any email delivery system.** Toggle UI exists but nothing sends emails. No email infrastructure (SendGrid, Resend, etc.). | HIGH | Users expect notifications they configure to actually be delivered. |
| GAP-11 | **Agent settings not persisted.** Custom instructions, notification toggles, and approval thresholds on per-agent settings page are all client-only state. | HIGH | Agent customisation -- a key differentiator -- does not survive page reload. |
| GAP-12 | **No 2FA or SSO configuration.** No multi-factor authentication setup in settings. No SSO/SAML for enterprise orgs. | MEDIUM | Security gap for financial platform handling sensitive data. |
| GAP-13 | **Module toggles not persisted.** Enabling/disabling modules uses local state only. | HIGH | Feature-gating -- a key business model element (pay-per-module) -- does not work. |
| GAP-14 | **Settings navigation has no /settings/modules link in sidebar.** Sidebar links: Account, Team & Roles, Preferences, Industry Blueprints, Data Exports. Modules page exists but is not in sidebar nav. | LOW | Discoverability issue. Users must navigate directly. |
| GAP-15 | **No branding/white-label settings page.** Report themes exist in the report builder but there is no dedicated settings section for upload logo, set brand colours, customise email templates. | MEDIUM | Advisors serving multiple clients cannot brand the platform to each client. |

---

## 5. Prioritised Recommendations

### P0 -- Critical (blocks revenue or compliance, do immediately)

| # | Recommendation | Addresses Gap | Effort |
|---|---------------|---------------|--------|
| P0-1 | **Build settings persistence layer.** Create a `user_preferences` table (org_id, user_id, language, timezone, date_format, number_format, notification_prefs JSONB, updated_at). Add API route `POST /api/settings/preferences`. Wire all preferences page toggles to save/load from DB. | GAP-1 | Medium (2-3 days) |
| P0-2 | **Integrate Stripe for billing.** Per BUILD_VS_BUY_ANALYSIS.md, use Stripe for payments. Connect billing page to Stripe Customer Portal. Replace mock data with real subscription state. | GAP-4 | Large (1-2 weeks) |
| P0-3 | **Build functional data exports.** Wire export buttons to actual server-side generation endpoints. Financial statements can reuse existing report/PDF infrastructure. CSV/XLSX exports via server actions. | GAP-5 | Medium (3-5 days) |
| P0-4 | **Add GDPR data deletion workflow.** Add "Delete my data" and "Export all my data" options to settings. Implement soft-delete with 30-day grace period. Display retention policy. | GAP-8 | Medium (3-4 days) |

### P1 -- High (core functionality gaps, do within next sprint cycle)

| # | Recommendation | Addresses Gap | Effort |
|---|---------------|---------------|--------|
| P1-1 | **Complete team management CRUD.** Add remove member, change role, cancel invitation, resend invitation actions. All with audit logging and role-gated access. | GAP-3 | Medium (2-3 days) |
| P1-2 | **Build audit log viewer.** Create `/settings/audit` or `/governance/audit` page. Table with filters (user, action, entity, date range). Paginated. Export to CSV. | GAP-7 | Medium (2-3 days) |
| P1-3 | **Persist module toggle state.** Create `org_modules` table (org_id, module_id, active, activated_at, activated_by). Wire toggles to API. This is fundamental to the pay-per-module business model. | GAP-13 | Small (1-2 days) |
| P1-4 | **Persist agent settings.** Create `agent_configurations` table (org_id, agent_slug, custom_instructions, notification_prefs, approval_thresholds JSONB). Wire agent settings page to API. | GAP-11 | Medium (2-3 days) |
| P1-5 | **Connect notification preferences to email delivery.** Per BUILD_VS_BUY_ANALYSIS.md, use Resend or SendGrid. Wire notification toggles to actual email delivery configuration. | GAP-10 | Medium (3-5 days) |
| P1-6 | **Add org profile editing.** Editable org name, logo upload (Supabase Storage), industry, address, tax details. With audit logging. | GAP-2 | Medium (2-3 days) |

### P2 -- Medium (enhancements, plan for future sprints)

| # | Recommendation | Addresses Gap | Effort |
|---|---------------|---------------|--------|
| P2-1 | **Build API key management.** Generate real API keys (hashed storage), revocation, scoped permissions (read-only/read-write). Rate limit display. | GAP-6 | Medium (3-4 days) |
| P2-2 | **Add currency settings UI.** Dropdown to change display currency in preferences. Wire to CurrencyProvider. | GAP-9 | Small (1 day) |
| P2-3 | **Add 2FA configuration.** Supabase Auth supports TOTP. Add setup/disable flow in security settings. | GAP-12 | Medium (2-3 days) |
| P2-4 | **Build white-label settings page.** Logo upload, brand colour picker, custom domain config (enterprise tier). Consolidate report theme selection here. | GAP-15 | Medium (3-5 days) |
| P2-5 | **Add modules page to sidebar navigation.** Simple fix, high discoverability impact. | GAP-14 | Trivial (minutes) |

---

## 6. Architectural Concerns

| ID | Concern | Severity | Detail |
|----|---------|----------|--------|
| ARCH-1 | **Client-side Supabase calls in invite-form.tsx bypass server-side validation.** The invite form creates a client Supabase instance and directly inserts into `org_invitations`. This means the Zod validation mandate from CLAUDE.md is not enforced. Anyone with a valid session could insert arbitrary invitation records. | HIGH | Move invitation creation to a server API route with Zod validation, role check, and rate limiting. |
| ARCH-2 | **No API routes for settings operations.** There are zero files in `src/app/api/settings/`. All settings state management will need a new API layer. This is a structural gap -- every other feature area has API routes. | HIGH | Create `/api/settings/preferences`, `/api/settings/profile`, `/api/settings/team`, `/api/settings/modules` routes. |
| ARCH-3 | **Preferences page "Save" button is cosmetic.** `handleSave` sets a `saved` state for 2 seconds then resets. No network call. This pattern actively deceives users into thinking their preferences were saved. | CRITICAL | Either wire to actual persistence or remove the save button to avoid misleading users. |
| ARCH-4 | **Team page duplicates settings page functionality.** `settings/page.tsx` has team member listing and invite form. `settings/team/page.tsx` has a separate team member section with a non-functional invite button. These should be consolidated. | MEDIUM | Choose one canonical location. Route `/settings/team` should be the full team management page; `/settings` (Account) should link to it. |
| ARCH-5 | **No shared settings context/store.** Preferences (language, timezone, etc.) are not available to other components. There is no `SettingsProvider` wrapping the app. When persistence is added, a context provider will be needed so all components can react to preference changes. | HIGH | Create `SettingsProvider` similar to existing `CurrencyProvider` and `AccountingConfigProvider`. |
| ARCH-6 | **Module state not available to feature gates.** The module toggle page uses local `useState`. There is no mechanism for other parts of the app to check if a module is enabled. This blocks the pay-per-module business model. | HIGH | Module state must be loaded from DB at layout level and available via context to all pages. |
| ARCH-7 | **Billing data functions return hardcoded mock data.** `getMockServiceBreakdown()`, `getMockInvoices()`, `getRecommendedBundles()` are all deterministic mock functions with no DB or Stripe interaction. | HIGH | Replace with Stripe API calls when billing integration is built. |

---

## 7. Summary Lists

### BUILD (new features needed)
- Settings persistence layer (user_preferences table + API routes)
- Stripe billing integration
- Functional data export endpoints
- Team member CRUD (remove, role change, invitation management)
- Audit log viewer UI
- Module state persistence + feature gate context
- Agent configuration persistence
- Email notification delivery infrastructure
- Org profile editing (name, logo, address, tax details)
- API key generation and management
- GDPR data deletion workflow
- 2FA/security settings
- White-label/branding settings page
- Currency settings UI
- Scheduled export infrastructure

### FIX (existing code that needs repair)
- ARCH-3: Remove deceptive "Save Preferences" button or connect to real persistence
- ARCH-1: Move invite form to server API route with Zod validation
- ARCH-4: Consolidate duplicate team member UIs between settings/page.tsx and settings/team/page.tsx
- GAP-14: Add /settings/modules to sidebar navigation

### LEVERAGE (existing strengths to build upon)
- **Industry Blueprints page** -- Best-implemented settings feature. Functional API integration, search/filter, preview panel. Pattern can be reused for other settings sub-pages.
- **Accounting config from Xero** -- FY year-end, currency, VAT scheme auto-pulled. Solid foundation for financial period configuration.
- **Role hierarchy backend** -- `hasMinRole`, `requireRole`, RLS policies. Backend is solid; just needs UI management layer.
- **Audit log backend** -- Immutable insert with retry logic. Just needs a viewer UI.
- **Currency context provider** -- Well-architected with Intl.NumberFormat. Just needs a settings UI to change currency.
- **Report themes** -- 7 professional themes ready. Just need to be exposed in a settings/branding page.
- **Billing page value-tracking UX** -- Unique differentiator showing "savings" vs market value. Keep this when wiring to real data.

### SKIP (not worth building now)
- Custom role creation (use pre-defined roles until enterprise tier)
- SSO/SAML (enterprise tier, not needed for SME target market yet)
- White-label custom domain (enterprise tier)
- Webhook management (enterprise tier)
- Custom financial period definitions (standard FY periods sufficient)
- Real-time audit feed (batch viewer sufficient)
- Slack/Teams notification integration (email first)

---

**Bottom Line:** Advisory OS has thoughtfully designed settings UI with good visual polish and several novel concepts (blueprint system, value-tracking billing), but the vast majority of the settings infrastructure is non-functional. The most critical issue is the complete absence of a persistence layer -- every preference, toggle, and configuration resets on page reload. The deceptive "Save Preferences" button that does nothing is the single most urgent fix. Before building any new settings features, a `user_preferences` table and `/api/settings/` route structure must be established. The billing mock data must be replaced with real Stripe integration before any revenue can be collected.