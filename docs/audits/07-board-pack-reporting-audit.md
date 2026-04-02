# Feature Benchmark Audit: Board Pack & Reporting
## Advisory OS (Grove) — Section 07 of 15
**Date:** 2026-04-02 | **Status:** Complete | **Auditor:** Claude Code

---

## Feature Inventory

| # | Feature | Type | Location | Current State |
|---|---------|------|----------|---------------|
| 1 | Report type selection (board pack / monthly review / investor update / custom) | Workflow | `src/components/reports/report-builder.tsx`, `src/types/reports.ts` | Working |
| 2 | Report section selection (toggle optional sections) | Workflow | `src/components/reports/report-builder.tsx` | Working |
| 3 | Report title and period configuration | Workflow | `src/components/reports/report-builder.tsx` | Working |
| 4 | Report generation engine (AI + financial data assembly) | AI + Data | `src/lib/reports/generator.ts` | Working |
| 5 | Narrative section generation (AI, per section) | AI | `src/lib/reports/generator.ts` → `callLLMCached` | Working |
| 6 | KPI grid section (key metrics, trend, status) | Data | `src/lib/reports/generator.ts` → `buildKpiData()` | Partial |
| 7 | Chart section (line, bar — revenue, expenses, cash) | Data | `src/lib/reports/generator.ts` → `buildChartData()` | Working |
| 8 | Table section (P&L, revenue breakdown, covenants) | Data | `src/lib/reports/generator.ts` → `buildTableData()` | Working |
| 9 | Period comparison section (two-period delta table) | Data | `src/lib/reports/generator.ts` → `buildComparisonData()` | Working |
| 10 | Custom text section (free-form, editable) | Content | `src/lib/reports/generator.ts` (custom_text type) | Working |
| 11 | Separator section | Content | `src/lib/reports/generator.ts` | Working |
| 12 | Report templates (Monthly Management Pack, Board Pack, Investor Update, Bank Covenant) | Templates | `src/lib/reports/templates.ts` — 4 templates | Working |
| 13 | Templates page (static, 6 named options, no backend wiring) | UI | `src/app/(dashboard)/reports/templates/page.tsx` | Partial / Stub |
| 14 | Report builder page (full canvas with Recharts preview) | UI | `src/app/(dashboard)/reports/builder/page.tsx` | Working |
| 15 | Report viewer (section sidebar, AI commentary panel, section cards) | UI | `src/components/reports/report-viewer.tsx` | Working |
| 16 | Per-section AI commentary editing (draft mode only) | Editing | `src/components/reports/report-section.tsx` | Working |
| 17 | Per-section AI Reasoning disclosure ("How was this generated?") | Transparency | `src/components/reports/report-section.tsx` | Working |
| 18 | Draft / Publish workflow (approve & publish button) | Governance | `src/components/reports/report-viewer.tsx`, `PATCH /api/reports/[orgId]/[reportId]` | Working |
| 19 | `approved_by` audit capture on publish | Governance | `src/app/api/reports/[orgId]/[reportId]/route.ts` | Working |
| 20 | PDF export (print-friendly HTML via browser print) | Export | `src/lib/reports/pdf.ts`, `GET /api/reports/[orgId]/[reportId]/pdf` | Working |
| 21 | 7 colour theme presets (Corporate Blue, Forest, Midnight, Sunset, Ocean, Slate, Minimal) | Branding | `src/lib/reports/themes.ts` | Working |
| 22 | Theme selection via query param (`?theme=forest`) | Branding | `GET /api/reports/.../pdf?theme=...` | Working |
| 23 | Themes API endpoint (`GET /api/reports/themes`) | API | `src/app/api/reports/themes/route.ts` | Working |
| 24 | Cover page (org name initial as logo, title, period, confidential banner) | Layout | `src/lib/reports/pdf.ts` | Working |
| 25 | Table of contents (auto-generated from section list) | Layout | `src/lib/reports/pdf.ts` | Working |
| 26 | Report list page | UI | `src/components/reports/report-list.tsx`, `/reports` | Working |
| 27 | Report detail page | UI | `src/app/(dashboard)/reports/[id]/page.tsx` | Working |
| 28 | New report page (step wizard) | UI | `src/app/(dashboard)/reports/new/page.tsx` | Working |
| 29 | Rate limiting on report generation | Security | `src/app/api/reports/generate/route.ts` | Working |
| 30 | Token budget enforcement on report generation | Security | `src/app/api/reports/generate/route.ts` | Working |
| 31 | Governance checkpoint (`governedOutput`) on AI narratives | Governance | `src/lib/reports/generator.ts` | Working |
| 32 | Auto-store generated report to Knowledge Vault | Integration | `src/app/api/reports/[orgId]/route.ts` → `autoStoreToVault()` | Working |
| 33 | Audit log on report.generated and report.published | Governance | `src/lib/audit/log.ts` throughout | Working |
| 34 | Report financial controls (period picker, comparison mode, CSV export) | Controls | `src/components/financial/report-controls.tsx` | Working |
| 35 | Custom report templates (DB schema exists) | Templates | `report_templates_custom` table, migration 018 | Schema only / No UI |
| 36 | Share URL (field exists in DB, `share_url` column) | Sharing | `generated_reports.share_url`, `GeneratedReport.shareUrl` | Schema only / No UI |
| 37 | Scheduled report delivery | Automation | None | Missing |
| 38 | Email delivery of reports | Automation | None | Missing |
| 39 | White-label (org logo upload, custom colours) | Branding | None | Missing |
| 40 | Charts rendered inside PDF export | Export | None — PDF contains data tables only, no charts | Missing |
| 41 | Shareable report link (public/token-gated) | Sharing | None | Missing |
| 42 | Watermark / confidentiality marking | Compliance | Partial — "CONFIDENTIAL" text in HTML only | Partial |
| 43 | Many KPI types return 'N/A' (headcount, ARR, MRR, EBITDA, customers, etc.) | Data | `src/lib/reports/generator.ts` lines 560–576 | Broken / Stub |
| 44 | Bank covenant data (hardcoded placeholder rows) | Data | `src/lib/reports/generator.ts` lines 692–699 | Stub |
| 45 | `key_ratios` chart metric (returns all zeros) | Data | `src/lib/reports/generator.ts` line 636 | Stub |
| 46 | Report type / template type mismatch (`@ts-nocheck` on builder) | Technical debt | `src/components/reports/report-builder.tsx` line 1–2 | Tech debt |
| 47 | `reports` vs `generated_reports` — two parallel tables in DB | Technical debt | Migrations 004 and 018 | Tech debt |

---

## Benchmark Tables

### 1. Board Pack Generation

| Dimension | Assessment |
|-----------|------------|
| **What it does** | User selects a template (Board Pack, Monthly Management Pack, Investor Update, or Bank Covenant), sets period and section toggles, confirms generation. Engine fetches Xero-normalised financials, builds P&L data per period, passes financial context to Claude Sonnet for each narrative section, assembles KPI grids and tables, persists to Supabase, auto-stores to Knowledge Vault. |
| **What it's trying to achieve** | Reduce the time for an advisor to produce a board-ready document from hours to seconds, grounded in actual Xero data. |
| **Who needs it** | Advisor (primary generator), Business Owner (receiver), Board members / Investors (readers) |
| **Best in class** | **Fathom HQ** — drag-and-drop report editor combining text, charts, financial statements, and KPIs. 90+ chart types, conditional commentary (auto-show positive/negative text based on rules), scheduled delivery, brand customisation (logo, cover, colours), multi-format (print/web/device). Reports update live when data refreshes. Draft mode keeps reports private until ready. Batch operations on components. The mechanism: report canvas with component library, each component has its own data binding. AI Commentary launched in 2026 contextualises narratives with goals and market conditions. |
| **How they achieved it** | Component-based canvas: each section is an independent block with its own data source binding, configurable display options, and conditional commentary rules. Templates save the entire canvas configuration. AI Commentary is shaped by the business profile built during onboarding and goal-setting. |
| **Runner up** | **DataRails Storyboards** — 2-click transforms financial data into narrative presentations. Auto-generated board-ready PowerPoint, PDF, and Excel from unified data. AI Reporting Agent "tells the story behind numbers" and uncovers drivers. Outputs grounded in validated consolidated data. |
| **Current Advisory OS state** | **Working but incomplete.** 4 templates exist (Management Pack, Board Pack, Investor Update, Bank Covenant) with 4–8 sections each. The generator correctly assembles financial context from Xero actuals and calls Claude for narrative sections. PDF export produces a professional A4 print-friendly HTML document with cover page, TOC, 7 themes, and data sections. The 3-step builder wizard is clean. The governance layer (audit log, vault storage, governed output checkpoint) is strong. Critical gaps: charts do not render in PDF (data only), many KPI fields return N/A, bank covenant section is hardcoded placeholders, and the two parallel DB tables create confusion. |
| **AI opportunity** | High — the narrative quality could be dramatically improved by injecting the business context profile (from onboarding interview) into every narrative prompt. Currently `buildFinancialContext()` only passes P&L numbers and a generic thesis summary. Adding sector, stage, key challenges, growth goals, and top customers would produce advisory-grade narratives rather than generic management commentary. |
| **Non-finance user test** | **3/5** — The 3-step wizard (Type → Configure → Generate) is clear. But once generated, the board pack looks sparse: charts are missing from the PDF, KPI fields frequently show N/A, and the "Approve & Publish" workflow feels disconnected from what a business owner would do with the document. A business owner would want to press one button and receive a beautiful PDF. |
| **Claude Finance alternative** | **Partial alternative** — A user can upload 12 months of Xero P&L to Claude and ask "write a board pack for our last quarter". The result is surprisingly competent prose. But: no branded PDF, no live data link, no structured sections, no governance/audit trail, no version history, no client management. |
| **Leverage existing tools?** | No — PDF generation, template engine, and AI narrative assembly all need to be custom to maintain the governance moat. The one exception: a headless browser service (Puppeteer/Playwright on a worker, or a managed service like Cloudflare Browser Rendering) would solve the chart-in-PDF gap without building a custom PDF renderer. |
| **Token efficiency** | Board pack template has 8 sections, 3 narrative. At ~500 tokens per narrative (Sonnet), estimate ~1,500–2,500 tokens per board pack generation. With `callLLMCached` caching at 30-minute TTL, repeated generation for same period is cheap. Estimated cost per full board pack: ~£0.01–£0.03. Very acceptable. |
| **Build recommendation** | **BUILD + ENHANCE** — The structural foundation is solid. Priority fixes: (1) inject business context into narrative prompts; (2) add headless-browser PDF with chart rendering; (3) resolve the dual-table issue; (4) wire KPIs that currently return N/A. |
| **Priority** | **P0** — This is a demo-critical and commercially differentiated feature. It is Sprint 8 COMPLETE per the roadmap but has material gaps that undermine demo quality. |
| **Defensibility** | **High** — The governance layer (governed output audit, vault storage, immutable audit log, approval workflow) differentiates from every competitor. No other SME-focused tool audit-logs report generation and stores it to a knowledge repository automatically. |

---

### 2. PDF Export

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Generates a print-friendly HTML document (A4 format, `@media print` CSS) served from `/api/reports/[orgId]/[reportId]/pdf`. User opens in new tab and uses browser print-to-PDF. Supports 7 colour themes via `?theme=` query param. Cover page includes org initial (no logo), title, period, confidential banner. TOC auto-generated. Each section renders data as HTML tables or KPI grid. |
| **What it's trying to achieve** | Produce a boardroom-quality printable document from the generated report data. |
| **Who needs it** | Advisor (sends to client board), Business Owner (takes to bank meeting), Investor |
| **Best in class** | **Fathom HQ** — Reports are natively digital-first (web format) with a distinct print mode. Print layout is pixel-perfect for A4 and US Letter. Charts render in print with correct typography. Reports can be sent as a link (web-native sharing) OR downloaded as PDF (Chromium headless rendering, not browser print). Cover pages include actual org logo. Each chart type exports cleanly with vector-quality graphics. Conditional commentary visible in print. |
| **How they achieved it** | Server-side PDF generation using a headless browser. Reports are designed in a web canvas and rendered to PDF via Chromium, preserving all chart SVGs. The web-shareable link and the PDF are generated from the same source, ensuring consistency. |
| **Runner up** | **DataRails** — Auto-generates PowerPoint AND PDF. Board-ready from a single click. Charts from the web dashboard are captured at full resolution. Executive summary, financial tables, and trend charts all appear in the PowerPoint output. |
| **Current Advisory OS state** | **Partial — functional but second-class.** The HTML-to-print approach works and produces a clean document. The 7 theme CSS system is a genuine strength — Fathom's theming is less granular. However: (1) no charts render in the PDF — only text tables and KPI number grids; (2) the export mechanism is "open in new tab then print" — no actual `.pdf` file download; (3) the cover page shows the org name initial as a text box, not an actual logo. The `Content-Disposition` header says `inline` not `attachment`, so the file is not automatically downloaded. (4) No page number CSS counter is wired to the `@page` declaration (it references `counter(page)` but this requires specific browser support and may not render in all PDF printers). |
| **AI opportunity** | Low — PDF rendering is a technical infrastructure problem, not an AI problem. |
| **Non-finance user test** | **2/5** — The print-to-PDF workflow is not discoverable for non-technical users. "Export" opens a new browser tab with no instruction about printing. A business owner would expect to click "Download PDF" and receive a file. Charts not appearing in the output is a significant credibility hit. |
| **Claude Finance alternative** | No — Claude cannot produce a branded PDF. |
| **Leverage existing tools?** | **Yes — strong candidate.** Puppeteer/Playwright on a Vercel Edge Function or a managed PDF service (PDFShift, WeasyPrint, Browserless.io at ~$30/month) would solve chart rendering and proper file downloads with zero custom code. The BUILD_VS_BUY_ANALYSIS.md should flag this. Generating the HTML is already done; a PDF service just needs the rendered HTML. |
| **Token efficiency** | No AI tokens in PDF generation — pure HTML/CSS rendering. Zero token cost. |
| **Build recommendation** | **FIX + WRAP** — Switch the PDF route to call a managed headless browser service. Pass the existing `generatePrintableHTML()` output to the service. Return a proper `.pdf` file attachment. Estimated 2-3 days of engineering to integrate. |
| **Priority** | **P0** — The PDF is the primary deliverable of the board pack. Charts missing and no actual file download make this demo-blocking. |
| **Defensibility** | Low — PDF generation is infrastructure, not moat. The moat is the content inside the PDF. |

---

### 3. Report Builder / Template System

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Two-track system: (A) a 3-step wizard for guided generation from 4 preset templates, (B) a full canvas builder at `/reports/builder` with template selection, section drag-reorder, chart preview via Recharts, live generation per section, and share/download buttons. Section types: narrative, kpi_grid, chart, table, comparison, separator, custom_text. |
| **What it's trying to achieve** | Allow advisors to customise which sections appear in a report and preview what they look like before finalising. |
| **Who needs it** | Advisor (primary), advanced Business Owner |
| **Best in class** | **Fathom HQ** — drag-and-drop canvas. Every section type (text block, chart, table, KPI card, financial statement, custom formula) is a draggable component. Components can be reordered, resized, duplicated, or deleted. Batch operations. Conditional commentary rules per text block (e.g., "if gross margin > 50%, show text A; else show text B"). Template save and reuse across reports and clients. Placeholder tokens auto-reference latest numbers. 90+ chart types. |
| **How they achieved it** | Component library architecture with a drag-and-drop canvas. Each component has a configuration panel. Conditional commentary uses a simple rule engine (threshold value, comparison operator, then/else text). Templates serialise the entire canvas state. |
| **Runner up** | **Mosaic (Bob Finance)** — Canvas Reports with flexible reporting canvases surfacing action items. One-click generation of board materials. Version control so everyone uses current data. |
| **Current Advisory OS state** | **Partial — builder page exists but sections are not drag-reorderable in the UI.** The builder page at `/reports/builder` has a rich interface: template selection dropdown, section list with add/remove/reorder (using `up`/`down` arrows), per-section config editing, a "Generate Section" button that calls `/api/reports/generate` (admin-only, rate-limited), and a Recharts preview for chart sections. However: (1) the builder page is `'use client'` only — no server-side data injection means it cannot be reached via direct URL with pre-populated org data; (2) the `@ts-nocheck` directive on `report-builder.tsx` indicates an unresolved type mismatch between the two template systems (`ReportTemplate` in `templates.ts` vs `ReportType` in `types/reports.ts`); (3) the templates page at `/reports/templates` is a static frontend mockup — 6 named templates as cards with no click-through to the builder; (4) custom report templates have a DB table (`report_templates_custom`) but no UI to save/load them. |
| **AI opportunity** | Medium — AI could suggest section ordering based on audience (e.g., "board audience: lead with cash, investor audience: lead with revenue growth") or auto-generate a section based on a natural-language description ("add a section about our customer concentration risk"). |
| **Non-finance user test** | **3/5** — The 3-step wizard is more accessible than the full builder. The full builder is genuinely powerful for advisors but has significant rough edges (type errors, mock templates page, no persist of custom templates). |
| **Claude Finance alternative** | Partial — Claude can help structure report sections verbally but cannot produce a live-data populated section with charts. |
| **Leverage existing tools?** | No — template management and section composition are core platform logic. |
| **Token efficiency** | Section-level generation: ~500–800 tokens per narrative section on Sonnet. Rate limited at 10 LLM calls/min/org. Token budget checked before generation. |
| **Build recommendation** | **FIX + ENHANCE** — Resolve the `@ts-nocheck` type mismatch. Connect templates page cards to the builder with pre-selected template. Implement drag-to-reorder (shadcn `@dnd-kit` is available). Add UI for saving/loading custom templates. |
| **Priority** | **P1** — The builder is solid infrastructure; the UX polish is what's needed for advisor-facing use. |
| **Defensibility** | Medium — the section type vocabulary (narrative, kpi_grid, chart, table, comparison, custom_text, separator) is well-designed. The governance-aware generation (governedOutput checkpoint per narrative section) is unique. |

---

### 4. White-Labelling

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Currently: 7 colour theme presets selectable per PDF export. Cover page displays org name and a coloured initial box (first letter of org name). "CONFIDENTIAL" text block in footer. No actual logo upload. No custom domain per advisor firm. No advisor firm branding in client-facing views. |
| **What it's trying to achieve** | Allow the advisor to present reports under their own branding to clients, not under Grove's branding. |
| **Who needs it** | Advisor (primary — presents reports to their clients under their firm name) |
| **Best in class** | **Fathom HQ** — Logo upload per organisation, brand colours applied to cover pages and report headers. Advisors can white-label the report with their practice logo so clients see the accountant's brand. Reports are branded to the accountant, not to Fathom. Cover page options are configurable (include/exclude firm bio, contact details). |
| **How they achieved it** | Logo is stored as an org-level asset. Report templates pull `org.logo_url` for the cover page. Brand colours from org settings override the default palette. |
| **Runner up** | **Syft Analytics** — Multi-entity and multi-client reporting with advisor branding. Cover pages include the accountant's firm logo. |
| **Current Advisory OS state** | **Missing entirely.** The `themes.ts` system is white-label-ready architecturally (the comment in `pdf.ts` says "White-label ready from day one") but the actual white-label surface — logo upload, firm name override, custom colour input — does not exist. The cover page renders only the org's own first letter in a coloured box, not the advisor's logo. The email templates (`src/lib/email/templates.ts`) are hardcoded to the "Grove" brand with the Grove primary colour (`#059669`). There is no concept of an advisor-level branding config in the database schema. |
| **AI opportunity** | Low — white-labelling is a configuration and storage problem, not an AI problem. |
| **Non-finance user test** | **N/A** — The feature does not exist yet. From an advisor perspective, sending a client a board pack that says "Grove" instead of "Smith & Partners Chartered Accountants" is a significant commercial blocker. |
| **Claude Finance alternative** | No. |
| **Leverage existing tools?** | Cloudinary or Supabase Storage for logo hosting. Both are already available in the stack. No third-party white-label service needed — it is a logo URL in the database and a CSS variable in the theme. |
| **Token efficiency** | No tokens. Pure configuration. |
| **Build recommendation** | **BUILD** — Add `advisor_branding` JSON column to the `organisations` table (or a new `advisor_branding` table). Store: `logo_url`, `firm_name`, `primary_colour`, `accent_colour`, `footer_text`. Inject into `generatePrintableHTML()` to replace the org-initial box with the actual logo `<img>`. Estimated 1 day. |
| **Priority** | **P1** — Commercial blocker for advisor-led sales. Advisors will not present client reports branded "Grove." This is a day-one advisor adoption requirement. |
| **Defensibility** | Low on its own — every competitor has it. But combined with the governance layer it becomes: "the only white-label, audit-logged, AI-narrative board pack in the SME advisory space." |

---

### 5. Scheduled Reports

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Nothing — this feature does not exist anywhere in the codebase. |
| **What it's trying to achieve** | Automatically generate and deliver reports on a recurring schedule (monthly, quarterly) so the advisor does not have to manually trigger generation. |
| **Who needs it** | Advisor (monthly management packs for 20+ clients), Business Owner (automated monthly board pack before the monthly meeting) |
| **Best in class** | **Fathom HQ** — "Automated delivery: Schedule creation and delivery of reports." Reports can be scheduled to generate and email on a monthly/quarterly cadence. Recipients list is configurable. Draft-first mode holds the report for advisor review before sending. |
| **How they achieved it** | Background job scheduler (cron) triggers report generation → headless browser PDF render → email delivery via transactional email service. Recipients stored per report configuration. |
| **Runner up** | **DataRails Insights** — Configurable automated summaries: choose KPIs, recipients, cadence (weekly, monthly, quarterly). Scheduled email delivery of report summaries. |
| **Current Advisory OS state** | **Missing entirely.** There is no scheduler, no background job system, no email delivery pipeline for reports. The email templates library (`src/lib/email/templates.ts`) exists for transactional auth emails but has no report-specific templates. The DB schema (`report_status` enum includes `'sent'`) anticipates email delivery but no code implements it. |
| **AI opportunity** | Medium — AI could auto-draft a cover email accompanying the scheduled report ("Hi [Client], here is your October board pack. The key story this month is...") personalised per business. |
| **Non-finance user test** | **N/A** — Missing. From an advisor perspective, this is a significant time-saver. "Set it and forget it" monthly reporting is a core advisor workflow. |
| **Claude Finance alternative** | No. |
| **Leverage existing tools?** | **Yes — strong candidate.** Vercel Cron Jobs (available on Pro plan, free up to 2 jobs) could trigger `/api/reports/schedule-run` monthly. Resend or Postmark for email delivery. The BUILD_VS_BUY_ANALYSIS.md recommends against custom email infrastructure — use a $15/month transactional email service. |
| **Token efficiency** | Same as board pack generation (~1,500–2,500 tokens per run). For an advisor with 20 clients generating monthly, that is ~20 board packs × ~£0.02 = ~£0.40/month in AI costs. Very acceptable. |
| **Build recommendation** | **BUILD** — Vercel Cron → `POST /api/reports/schedule-run` → loop org scheduled configs → generate report → store → send email via Resend with PDF attachment or link. DB needs a `report_schedules` table (org_id, template_id, frequency, recipients, next_run_at, last_run_at, enabled). |
| **Priority** | **P1** — This is a high-value advisor productivity feature. Without it, every report requires a manual trigger. Monthly board packs for 10+ clients become tedious fast. |
| **Defensibility** | Low on its own. Differentiation comes from: AI-generated personalised cover email, governance checkpoint before sending (advisor must approve or auto-approve setting), immutable delivery log. |

---

### 6. Report Sharing and Collaboration

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Currently: draft/published status flag. `share_url` column exists in `generated_reports` table but is never populated. No shareable link, no link-based access, no commenting, no recipient management, no in-app notifications to recipients. |
| **What it's trying to achieve** | Allow an advisor to share a generated report with a client (or board member) who can view it without a full platform login. |
| **Who needs it** | Advisor (shares with client board), Business Owner (shares with investor), All |
| **Best in class** | **Fathom HQ** — Reports have a "web view" mode (live, browser-based, no PDF required). Shareable link with optional password protection. Draft mode keeps it private. "In-app notifications: Stay up to date on report activity." Recipients can be invited to view/comment. Separate "share" vs "download" actions for the same report. |
| **How they achieved it** | Report has a unique public slug with optional expiry and password. Web view is the primary sharing mechanism — the PDF is secondary. Notifications fire when the recipient opens the link. |
| **Runner up** | **Abacum** — Real-time collaboration on reports. Comments on specific data points. Multiple users can view the same report simultaneously with presence indicators. |
| **Current Advisory OS state** | **Schema exists, UI does not.** `generated_reports.share_url` and `status in ('draft', 'final', 'shared')` are defined in migration 018. `GeneratedReport.shareUrl` appears in the TypeScript type. But nothing populates `share_url`, no route handles public report access, no UI presents a "Share" button beyond the Publish workflow. The viewer component has `handleExport()` opening the PDF in a new tab — there is no share action. |
| **AI opportunity** | Low — sharing is infrastructure. AI opportunity is in the personalised cover message when sharing. |
| **Non-finance user test** | **N/A** — Missing. A business owner being asked to "log into Grove to see your board pack" rather than clicking a link is friction. |
| **Claude Finance alternative** | No. |
| **Leverage existing tools?** | Partial — Supabase's built-in Storage signed URLs could serve the HTML/PDF with a time-limited access token. No third-party service needed. |
| **Token efficiency** | No tokens. |
| **Build recommendation** | **BUILD** — Implement `POST /api/reports/[orgId]/[reportId]/share` which generates a signed token, stores it in `share_url`, and returns a link. Create a public route `/share/[token]` that serves the report HTML without requiring auth. Optional: password protection and expiry. |
| **Priority** | **P1** — A shared link is the primary distribution mechanism for a board pack. Without it, the report only lives inside the platform and cannot reach its intended audience (board members without Grove accounts). |
| **Defensibility** | Low on its own. Differentiation: shared view includes governance footer ("This report was generated and audit-logged by Grove on [date]") which builds institutional trust. |

---

### 7. AI-Generated Narratives in Reports

| Dimension | Assessment |
|-----------|------------|
| **What it does** | Each narrative section in a template has a system prompt (e.g., "Write a concise executive summary... Maximum 200 words. Do not use markdown formatting. Do not use em dashes. Write in plain professional English. Be specific about numbers when available."). The generator builds a `financialContext` string (current period P&L, prior period comparison, cash position, business thesis) and passes it to `callLLMCached` on Claude Sonnet. Governance checkpoint logs the output. Commentary can be manually edited in the viewer (draft mode only). |
| **What it's trying to achieve** | Generate board-ready written commentary that "knows your business" so the advisor does not have to write from scratch. |
| **Who needs it** | Advisor (who edits and approves), Business Owner (who reads) |
| **Best in class** | **Fathom HQ AI Commentary (2026)** — "AI-generated commentary that actually knows your business. Shaped by goals, strategy, market conditions. Every insight is relevant, every number is traceable." Built by PhD in ML team with red-teaming and hallucination minimisation. The mechanism: business profile (goals, strategy, market) is combined with financial actuals to produce section narratives. Variance commentary specifically explains "why" behind movements (e.g., "gross margin declined 3.2pp driven by increased supplier costs in the catering segment, partially offset by higher-margin online sales"). |
| **How they achieved it** | The key differentiator is business context depth: Fathom ingests goals, strategy documents, and market positioning alongside financials. Commentary contrasts actual results against stated goals, not just prior periods. |
| **Runner up** | **DataRails Reporting Agent** — "Analyzes actuals, uncovers drivers, tells the story behind numbers." The mechanism: full consolidated multi-entity data is available to the agent, so narratives reference department-level variances and cost-centre drivers. |
| **Current Advisory OS state** | **Working but context-shallow.** The narrative generation is technically correct — proper system prompt, financial data injected, Sonnet model, temperature 0.3 for consistency, governance checkpoint, caching. The critical gap is that `buildFinancialContext()` passes only: current period P&L summary, prior period P&L, cash position, and a single `thesis.summary` string. It does not inject: the business's sector and stage, key challenges from onboarding, growth goals, top customer list, industry benchmarks, or scenario comparison. The narratives therefore read like generic management commentary ("Revenue was £X this month, up Y% from last month") rather than advisor-grade analysis ("Revenue of £X is 8% ahead of your stated growth goal of 15% annual growth, driven by the expansion into the Manchester market you identified as a priority in your Q1 plan"). |
| **AI opportunity** | **Very High** — this is the highest-leverage AI improvement available. Adding the full `business_context_profiles` record into `buildFinancialContext()` (sector, stage, key_challenges, growth_goals, revenue_range, competitive_landscape, target_market) would immediately transform narrative quality. The infrastructure is all there — the business context profile is stored in Supabase from the onboarding interview. It is simply not being joined into the report generation query. |
| **Non-finance user test** | **3/5** — Narratives are professional and grammatically correct. They fail the "knows your business" test because they treat all businesses identically. A bridal boutique owner and a SaaS startup founder receive structurally identical executive summaries. |
| **Claude Finance alternative** | **Comparable for one-off use.** A user can paste their P&L and business context into Claude and ask for a board pack executive summary. The result may be superior to Grove's current output because the user would naturally include business context in the prompt. Grove's advantage is: automated (no copy-paste), governed (audit-logged), and consistent (always uses the same structured system prompt). |
| **Token efficiency** | 3 narrative sections in a board pack × ~800 tokens each = ~2,400 tokens at Sonnet pricing. Injecting business context adds ~500 tokens per call but is worthwhile. Caching (30-min TTL via `callLLMCached`) means repeated generation for same period is free. |
| **Build recommendation** | **ENHANCE (P0)** — Modify `generateReport()` to join `business_context_profiles` for the org. Extend `buildFinancialContext()` to accept and include: sector, stage, key_challenges (top 3), growth_goals (top 3), revenue_range, and any onboarding-extracted data. This is a single additional Supabase query and ~10 lines of string building. Impact on narrative quality: transformative. |
| **Priority** | **P0** — This is the single highest-impact improvement for report quality with the lowest engineering effort. The infrastructure is already built. |
| **Defensibility** | **Very High** — "AI that knows your specific business" is the platform's core value proposition. When advisory narratives reference the business's own stated goals and challenges from the onboarding interview, competitors cannot replicate this without also capturing that business context through a structured interview. |

---

### 8. Data Visualisation in Reports

| Dimension | Assessment |
|-----------|------------|
| **What it does** | The builder page (`/reports/builder`) renders live Recharts charts (LineChart, BarChart, PieChart) for chart-type sections in the canvas preview. The `buildChartData()` function in the generator constructs `{labels, datasets}` JSON for revenue, expenses, net_profit, gross_profit, cash_balance, and key_ratios metrics. However, charts do not appear in the PDF export — the `generatePrintableHTML()` function renders only text tables and KPI grids, with no chart rendering. |
| **What it's trying to achieve** | Present financial trends visually in generated reports so board members can see 12-month trajectories, not just point-in-time numbers. |
| **Who needs it** | Board members (primary visual consumers), Advisors, Investors |
| **Best in class** | **Fathom HQ** — 90+ chart types, fully customisable. Every chart renders in both the web view and the PDF export at identical quality (via headless Chromium). Charts are configurable (colour override, label toggle, axis range, aggregation mode). Combo charts (bar + line overlay) for actual vs budget vs forecast. Waterfall charts for bridge analysis. Conditional colour coding (e.g., bar turns red when value is negative). |
| **How they achieved it** | The web view and PDF use the same React component tree. Headless Chromium renders the web view to PDF, preserving SVG charts at full resolution. No separate "PDF chart renderer" is needed. |
| **Runner up** | **DataRails** — Dashboard widget types include Waterfall, Combo Chart, Gauge, Pie, Bar, Column, Line. All export to PDF/PowerPoint with full chart rendering. |
| **Current Advisory OS state** | **Split — web builder has charts, PDF export does not.** The Recharts integration in the builder is functional. The report viewer (`report-section.tsx`) renders `SectionDataView` which handles `kpi_summary`, `pnl`, `cash_flow`, `variance`, `scenarios`, `intelligence`, `action_items` as HTML tables — no chart components are rendered in the web viewer either. There is a fundamental architectural gap: the `ReportSection` type in `types/reports.ts` stores section `data` as a generic `Record<string, unknown>` and `commentary` as a string — this predates the `GeneratedSection` type in `generator.ts` which has `chartData` as a proper typed field. The two type systems are not connected, which means chart data generated by the engine cannot easily be rendered in the viewer or PDF. |
| **AI opportunity** | Low — chart rendering is a technical problem. AI could suggest which chart type best represents a given metric ("cash runway is best as a gauge, not a line chart") but this is a minor optimisation. |
| **Non-finance user test** | **2/5** — A board pack without trend charts is not a board pack. Board members expect to see 12-month revenue trajectories, margin trends, and cash runway visually. Text tables alone make the document look like an internal spreadsheet, not a professional report. |
| **Claude Finance alternative** | No — Claude cannot render charts inside a PDF. |
| **Leverage existing tools?** | **Yes — the solution is the PDF service.** If the PDF is generated by a headless browser service (Puppeteer/Browserless) from the existing Recharts-powered report viewer HTML, charts render automatically. No custom SVG-to-PDF converter needed. |
| **Token efficiency** | No tokens — charts are deterministic data visualisation. |
| **Build recommendation** | **FIX (P0)** — Move PDF generation to a headless browser service. Align the `ReportSection` type (in `types/reports.ts`) with the `GeneratedSection` type (in `generator.ts`) so `chartData` is a first-class field. Add chart components to `report-section.tsx` viewer. Chart rendering in the PDF then follows for free from the headless browser approach. |
| **Priority** | **P0** — Charts in the PDF export are table stakes for a board pack product. Their absence is a demo-blocking gap. |
| **Defensibility** | Low — chart rendering is infrastructure. The moat is the quality of data behind the charts (Xero-grounded, governed, audited) not the charts themselves. |

---

### 9. Report Themes and Branding

| Dimension | Assessment |
|-----------|------------|
| **What it does** | 7 theme presets: Corporate Blue, Forest, Midnight, Sunset, Ocean, Slate, Minimal. Each theme defines 22 colour properties covering cover page, section headers, table headers, commentary blocks, KPI cards, positive/negative/neutral indicators, and footer. Theme CSS is injected into the print stylesheet via `generateThemeCSS()`. Theme is selected per PDF export via `?theme=` query param. A themes API (`GET /api/reports/themes`) returns the theme catalogue. |
| **What it's trying to achieve** | Allow reports to be styled to match an organisation's or advisor's brand rather than always appearing in a single default style. |
| **Who needs it** | Advisor (brand alignment with their practice), Business Owner (brand alignment with their company) |
| **Best in class** | **Fathom HQ** — Logo, cover page customisation, and brand colour override. Not 7 presets — fully custom colour input (hex value). Logo upload stored at org level. The cover page is a configurable template (which fields appear, layout variant). Custom CSS injection is not exposed (intentionally simplified). |
| **How they achieved it** | Org-level brand settings (logo_url, primary_colour). Report templates pull from org settings. Cover page has a few layout variants. |
| **Runner up** | **Jirav** — Industry-specific templates with distinct visual identities. Customer dashboards are configurable. |
| **Current Advisory OS state** | **Working — technically strongest area in this feature domain.** The 7-theme system is well-engineered. The `ReportTheme` type is explicit (22 colour properties), the CSS generation is clean and covers all section types. The themes API endpoint exists. The only gap: no UI for a user to preview and select a theme before or during export. The theme must be passed as a URL query param — there is no dropdown in the report viewer's export button that says "choose theme." |
| **AI opportunity** | Low — could auto-recommend a theme based on org brand colours if the org has a website (cross-reference against onboarding scan data). Minor. |
| **Non-finance user test** | **2/5** — The feature exists but is not discoverable. A user clicks "Export" and gets the default Corporate Blue with no indication other themes exist. |
| **Claude Finance alternative** | No. |
| **Leverage existing tools?** | No. |
| **Token efficiency** | No tokens. |
| **Build recommendation** | **FIX** — Add a theme picker to the Export button in the report viewer (`report-viewer.tsx`). A simple dropdown or radio group showing the 7 theme names with colour swatches. One extra `useState<string>` and passing the theme ID to the `handleExport` URL. 2 hours of work. |
| **Priority** | **P2** — The themes system is architecturally sound. The UI fix is minor but the feature is invisible without it. |
| **Defensibility** | Medium — the breadth of the theme system (7 presets with 22 properties each) is more granular than Fathom's approach. When combined with white-label branding it becomes "customise every colour in your report to match your firm's brand" — a genuine differentiator for advisor-led sales. |

---

## Competitive Feature Matrix

| Feature | DataRails | Fathom | Syft | Jirav | Runway | Mosaic | Planful | Vena | Cube | Abacum | Claude Finance | Existing Tools | Grove Today |
|---------|-----------|--------|------|-------|--------|--------|---------|------|------|--------|----------------|----------------|-------------|
| Board pack generation | ● | ● | ○ | ● | ● | ● | ● | ● | ◐ | ● | ◐ | ○ | ● |
| PDF export (real file download) | ● | ● | ◐ | ◐ | ◐ | ◐ | ● | ● | ○ | ● | ○ | ○ | ◐ |
| Charts in PDF | ● | ● | ◐ | ◐ | ◐ | ◐ | ● | ● | ○ | ● | ○ | ○ | ○ |
| Report builder / canvas | ● | ● | ○ | ● | ● | ◐ | ● | ● | ◐ | ● | ○ | ○ | ◐ |
| Drag-and-drop section reorder | ◐ | ● | ○ | ◐ | ● | ◐ | ● | ◐ | ○ | ◐ | ○ | ○ | ○ |
| Multiple report templates | ● | ● | ◐ | ● | ● | ◐ | ● | ● | ◐ | ● | ○ | ○ | ● |
| Custom template save / reuse | ● | ● | ○ | ◐ | ● | ◐ | ● | ● | ◐ | ● | ○ | ○ | ○ |
| AI-generated narratives | ● | ● | ○ | ◐ | ◐ | ◐ | ◐ | ● | ● | ◐ | ● | ○ | ● |
| Business-context-aware narratives | ◐ | ● | ○ | ○ | ◐ | ○ | ○ | ◐ | ◐ | ◐ | ● | ○ | ○ |
| Per-section commentary editing | ◐ | ● | ○ | ◐ | ◐ | ◐ | ◐ | ◐ | ○ | ◐ | ○ | ○ | ● |
| Conditional commentary rules | ◐ | ● | ○ | ○ | ○ | ○ | ◐ | ◐ | ○ | ◐ | ○ | ○ | ○ |
| Scheduled report delivery | ● | ● | ◐ | ◐ | ◐ | ◐ | ● | ● | ◐ | ● | ○ | ○ | ○ |
| Email delivery of reports | ● | ● | ◐ | ◐ | ◐ | ◐ | ● | ● | ◐ | ● | ○ | ● | ○ |
| Shareable report link | ● | ● | ◐ | ◐ | ● | ◐ | ◐ | ◐ | ◐ | ● | ○ | ○ | ○ |
| White-label (advisor logo/brand) | ◐ | ● | ● | ◐ | ○ | ○ | ◐ | ◐ | ○ | ◐ | ○ | ○ | ○ |
| Report theme presets | ◐ | ◐ | ○ | ◐ | ◐ | ◐ | ◐ | ◐ | ○ | ◐ | ○ | ○ | ● |
| Approval / publish workflow | ◐ | ◐ | ○ | ○ | ◐ | ○ | ● | ● | ○ | ◐ | ○ | ○ | ● |
| Audit log on report generation | ◐ | ○ | ○ | ○ | ○ | ○ | ◐ | ● | ◐ | ○ | ○ | ○ | ● |
| Auto-store to knowledge vault | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ● |
| Governed output checkpoint | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ● |

● = Full feature | ◐ = Partial | ○ = Not present

---

## Gap Analysis

### Critical Gaps (P0 — Demo-Blocking or Commercial Blockers)

**GAP-01: Charts absent from PDF export**
The PDF export produces text tables and KPI number grids but no visual charts. This is the single biggest UX shortfall. Every competitor's board pack includes trend charts. A board pack without charts looks like an internal spreadsheet. Root cause: `generatePrintableHTML()` uses static HTML with no Recharts rendering, and the `ReportSection` type does not carry `chartData`. Fix: headless browser PDF service + type alignment between `ReportSection` and `GeneratedSection`.

**GAP-02: Narratives are context-blind to business profile**
`buildFinancialContext()` in `generator.ts` does not query `business_context_profiles`. All narratives are therefore generic: "Revenue was £X this month." The business's sector, stage, key challenges, and stated growth goals — all captured during the Sprint 4 onboarding interview — are never injected. Fix: one additional Supabase query and 10 lines of string building. Impact: transformative narrative quality improvement.

**GAP-03: Multiple KPI types hardcoded to 'N/A'**
In `generator.ts` lines 560–576, a `default` block returns `{ value: 'N/A', status: 'neutral' }` for: `headcount`, `arr`, `mrr`, `ebitda`, `revenue_growth`, `net_retention`, `customers`, `ltv_cac_ratio`, `current_ratio`, `debt_to_equity`, `interest_coverage`, `dscr`, `quick_ratio`, `leverage_ratio`. These appear in the Investor Update and Bank Covenant templates. A board pack showing N/A in every KPI cell is not demo-ready.

**GAP-04: No actual PDF file download (browser print only)**
The export route returns `Content-Type: text/html` with `Content-Disposition: inline`. Users must manually trigger browser print-to-PDF. For a board pack product in 2026, this is not acceptable. The fix requires integrating a headless browser service (recommended in BUILD_VS_BUY_ANALYSIS.md) and returning a proper `.pdf` blob.

### Significant Gaps (P1 — Launch Blockers)

**GAP-05: No white-labelling for advisor firms**
The email templates are Grove-branded. The PDF cover page shows the client org's own initial, not the advisor's firm logo. This is a commercial blocker for advisor-led sales: advisors will not present client reports under a competitor's brand. Fix: `advisor_branding` table + logo in cover page.

**GAP-06: No scheduled report delivery**
Monthly board packs for multi-client advisor practices require automated scheduling. Manual generation for 20+ clients monthly is untenable. Fix: `report_schedules` table + Vercel Cron + Resend integration.

**GAP-07: No shareable report link**
The `share_url` column exists in the DB but is never populated. Board members without Grove accounts cannot receive the report. Fix: signed token public route.

**GAP-08: Custom template save/load has no UI**
`report_templates_custom` DB table and `report_templates_custom` schema exist in migration 018 but there is no UI to save, name, or load a custom template. The templates page (`/reports/templates`) is a static frontend mockup unconnected to the builder.

**GAP-09: `@ts-nocheck` on `report-builder.tsx`**
The type mismatch between `ReportTemplate` in `templates.ts` (which uses `ReportSectionConfig` with fields like `narrative`/`kpi_grid`/`chart`) and `ReportType` in `types/reports.ts` (which uses `executive_summary`/`kpi_summary`/`pnl`/`cash_flow` etc.) means the report builder is operating without type safety. This is a code quality and reliability risk.

**GAP-10: Two parallel DB tables (`reports` and `generated_reports`)**
Migration 004 created `public.reports`. Migration 018 created `generated_reports`. Both are used in different code paths. The `POST /api/reports/[orgId]/route.ts` inserts into both tables (lines 82–92 insert to `generated_reports` inside `generateReport()`, then again into `reports` in the API route). This creates duplicate records, confusing queries, and RLS policy ambiguity.

### Minor Gaps (P2 — Post-Launch Polish)

**GAP-11: Theme selector not exposed in export UI**
7 themes exist but are invisible to users. The only way to access them is via URL query param. A dropdown in the export button is a 2-hour fix.

**GAP-12: Bank covenant section is hardcoded placeholder data**
The `buildTableData()` function for `dataSource: 'covenants'` returns three hardcoded placeholder rows. No actual covenant data is stored or fetched. This template is currently unusable without a covenant data model.

**GAP-13: `key_ratios` chart metric returns zeros**
The chart builder supports a `key_ratios` metric type but the implementation (`buildChartData()` line 636) returns all zeros. The Bank Covenant Report's "Trend Analysis" chart uses this metric — it will render as a flat zero line.

**GAP-14: No conditional commentary rules**
Fathom's conditional commentary ("show text A if gross margin > 50%, else show text B") is a powerful automated personalisation feature. Grove currently generates one narrative per section regardless of whether results are positive or negative. The system prompt does not adapt based on variance direction.

**GAP-15: No report commenting / collaboration**
No way for an advisor to leave comments for a business owner on a shared report, or for board members to annotate data points. Abacum has real-time commenting. This is a P2 feature but represents significant collaborative value.

---

## Prioritised Recommendations

### P0 — Demo-Critical (Address Before Demo)

**REC-01: Inject business context profile into report narratives**
- File: `src/lib/reports/generator.ts`, function `generateReport()`
- Action: Add a fifth Supabase query to fetch `business_context_profiles` for the org. Extend `buildFinancialContext()` to accept and include sector, stage, key_challenges, growth_goals, and competitive_landscape. Pass the enriched context string to all narrative section prompts.
- Estimated effort: 4 hours
- Impact: Transforms generic management commentary into advisory-grade, business-specific narratives. This is the highest-impact, lowest-effort improvement available.

**REC-02: Switch PDF export to headless browser service**
- File: `src/app/api/reports/[orgId]/[reportId]/pdf/route.ts`
- Action: Integrate Browserless.io, PDFShift, or Cloudflare Browser Rendering. Pass `generatePrintableHTML()` output to the service. Return a proper `.pdf` file with `Content-Disposition: attachment`. Charts render automatically since Recharts SVGs are embedded in the HTML.
- Estimated effort: 1–2 days (including adding Recharts to the printable HTML's section renderer)
- Impact: Removes the browser-print workaround and adds chart rendering to all PDF exports.

**REC-03: Fix KPI N/A fields in Investor Update and Bank Covenant templates**
- File: `src/lib/reports/generator.ts`, `resolveKpiValue()`
- Action: Implement `ebitda` as `grossProfit - expenses` from the P&L. Implement `revenue_growth` as `(currentPnl.revenue - priorPnl.revenue) / priorPnl.revenue * 100`. Source `headcount` and `customers` from `business_context_profiles` (rough estimates from onboarding). Flag the remaining KPIs (ARR, MRR, net retention) as "Available when connected to billing system" rather than silent N/A.
- Estimated effort: 3 hours
- Impact: Eliminates the N/A embarrassment in demo scenarios.

### P1 — Launch-Critical (Address Before Advisor Onboarding)

**REC-04: Implement white-label advisor branding**
- Files: Supabase migration (new), `src/lib/reports/pdf.ts`, settings UI
- Action: Add `advisor_branding` JSONB column to `organisations` table (or separate table). Fields: `logo_url`, `firm_name`, `primary_colour`, `accent_colour`, `footer_tagline`. Add logo upload UI in settings. Modify `generatePrintableHTML()` to use `advisor_branding.logo_url` as an `<img>` on the cover page when present.
- Estimated effort: 1–2 days
- Impact: Commercial blocker removal for advisor-led sales.

**REC-05: Implement shareable report link**
- Files: New API route `/api/reports/[orgId]/[reportId]/share`, new public route `/share/[token]/page.tsx`, Supabase migration
- Action: Generate a signed token (UUID or HMAC), store in `share_url` on report. Create a public Next.js page that accepts the token, validates it, fetches the report, and renders the viewer in read-only mode (no edit/approve buttons). Optional: 30-day expiry.
- Estimated effort: 1 day
- Impact: Reports can reach board members who do not have Grove accounts.

**REC-06: Implement scheduled report delivery**
- Files: New Supabase migration (`report_schedules` table), `/api/reports/schedule-run/route.ts`, Vercel cron config, Resend email integration
- Action: Table: `report_schedules (id, org_id, template_id, frequency ENUM('monthly','quarterly'), day_of_month, recipients JSONB, enabled, next_run_at, last_run_at)`. Vercel Cron triggers daily at 06:00 UTC. Job: find schedules where `next_run_at <= now()`, generate report, send email with link or PDF attachment.
- Estimated effort: 2–3 days
- Impact: Advisor productivity multiplier — 20 client board packs generated and sent automatically on the first of each month.

**REC-07: Resolve the dual-table database issue (`reports` vs `generated_reports`)**
- Files: Supabase migration, `src/app/api/reports/[orgId]/route.ts`, `src/lib/reports/generator.ts`
- Action: Consolidate onto `generated_reports` (migration 018 version — it has `share_url` and `status in ('draft','final','shared')`). Remove the redundant second INSERT in the API route. Update all references. Update RLS policies to use `generated_reports`.
- Estimated effort: 4 hours
- Impact: Eliminates duplicate records, clarifies which table to query, removes RLS ambiguity.

**REC-08: Resolve `@ts-nocheck` and type system unification**
- Files: `src/components/reports/report-builder.tsx`, `src/types/reports.ts`, `src/lib/reports/templates.ts`
- Action: Unify the two section type vocabularies. The builder uses `ReportSectionConfig` with types `narrative | kpi_grid | chart | table | comparison | separator | custom_text`. The viewer uses `ReportSectionType` with values `executive_summary | kpi_summary | pnl | cash_flow | variance | scenarios | intelligence | playbook | action_items | custom`. These should be the same enum, or a mapping must be explicit. Remove `@ts-nocheck`.
- Estimated effort: 4 hours
- Impact: Type safety across the report system.

### P2 — Post-Launch Enhancements

**REC-09: Expose theme picker in export UI**
- File: `src/components/reports/report-viewer.tsx`
- Action: Add a theme selector dropdown to the export button area. Pass selected theme to `handleExport()` URL. Show colour swatches from `GET /api/reports/themes`.
- Estimated effort: 2 hours

**REC-10: Connect custom template save/load**
- Files: `src/app/(dashboard)/reports/builder/page.tsx`, new API endpoints
- Action: Add "Save as Template" button in builder. POST to `/api/reports/templates` which inserts into `report_templates_custom`. Load custom templates in the template selection dropdown alongside BUILDER_TEMPLATES.
- Estimated effort: 4 hours

**REC-11: Implement conditional commentary rules**
- Files: `src/lib/reports/generator.ts`, `src/lib/reports/templates.ts`
- Action: Add `positivePrompt` and `negativePrompt` fields to `ReportSectionConfig` for narrative type. In `generateNarrative()`, evaluate whether the relevant metric is favourable or unfavourable and select the appropriate prompt. For example: executive summary positive prompt emphasises achievements; negative prompt emphasises actions required.
- Estimated effort: 4 hours

**REC-12: Wire templates page to builder**
- File: `src/app/(dashboard)/reports/templates/page.tsx`
- Action: Each template card should navigate to `/reports/builder?template=board_pack` (or appropriate ID). The builder page should pre-select the template from the query param.
- Estimated effort: 1 hour

**REC-13: Implement Bank Covenant data model**
- Files: New Supabase migration, settings page
- Action: Table: `bank_covenants (id, org_id, covenant_name, required_value, required_operator, threshold_description, active)`. UI in settings. `buildTableData()` for `dataSource: 'covenants'` fetches from this table.
- Estimated effort: 4 hours

---

## Architectural Concerns

**ARCH-01: Type system divergence is a maintenance risk**
The codebase has two parallel type vocabularies for report sections: `ReportSectionConfig.type` (`narrative | kpi_grid | chart | table | comparison | separator | custom_text`) used by the builder/generator, and `ReportSectionType` (`executive_summary | kpi_summary | pnl | cash_flow | variance | scenarios | intelligence | playbook | action_items | custom`) used by the viewer/PDF. These evolved separately and are not mapped to each other. The `@ts-nocheck` in `report-builder.tsx` is a symptom. This divergence means: sections generated by the engine cannot reliably drive the correct renderer in the viewer, and the PDF `renderSection()` switch statement and the viewer `SectionDataView()` switch statement handle different type values with different logic.

**ARCH-02: PDF generation is architecturally incorrect for a data visualisation product**
The current approach (HTML-to-browser-print) is fundamentally unable to render SVG charts reliably across all browsers and PDF printers. Every chart in a board pack will silently disappear. This is not a bug — it is an architectural choice that must be reversed. The fix is clear (headless browser service) but it requires: moving the chart rendering into the printable HTML (currently absent), switching the API route to call the service, and returning a binary PDF blob rather than HTML. This is a 2-day engineering change that should be treated as P0 infrastructure.

**ARCH-03: Business context profile is not a first-class input to report generation**
The platform's core value proposition is "AI that knows your business." The onboarding interview captures rich business context. The scenario engine (`interpret-scenario.ts`) correctly injects Xero actuals as financial context. But the report generator ignores the business context profile entirely. This means report narratives are structurally indistinguishable from what a generic financial AI assistant would produce. The fix is trivial — one additional query in `generateReport()` — but the fact that it was not included in Sprint 8 suggests a systematic gap in the "semantic intelligence" principle articulated in `CLAUDE.md`.

**ARCH-04: Token estimation for report generation is approximate and may drift**
`generator.ts` uses `trackTokenUsage(orgId, narrativeSections.length * 500, 'report-generate')` as a rough estimate. When the full business context profile is injected per REC-01, actual token count per narrative section will increase to ~1,200–1,800 tokens. The hardcoded `500` estimate will undercount, allowing token budget bypass. The `governedOutput` checkpoint in `generateNarrative()` does correctly capture `llmResult.tokensUsed` per call — but this is at the checkpoint level, not aggregated back to the rate-limited estimate. Consider replacing the estimate with summing `llmResult.tokensUsed` across all sections.

**ARCH-05: Report sharing requires a new access control model**
The current RLS model is tenant-scoped: every policy uses `org_id = user_org_id()`. A shared report link (`/share/[token]`) requires a different access model: token-based, org-agnostic, read-only. This needs a dedicated RLS policy or a service-role fetch with explicit token validation in the API route. If implemented naively (service role with no validation), it creates a data exposure risk. The correct approach: validate the token against `generated_reports.share_url` in the API route using a service client, return only the fields needed for read-only display, never expose org_id or other tenant metadata in the public response.

---

## Summary Lists

### BUILD
- **Business context narrative injection** — Modify `generateReport()` to query `business_context_profiles` and pass sector, stage, goals, challenges into all narrative prompts. Highest impact, lowest effort improvement available.
- **Headless browser PDF service** — Replace browser-print HTML export with a managed service (Browserless.io / PDFShift). Returns a real `.pdf` file with charts rendered.
- **White-label advisor branding** — `advisor_branding` column in organisations table + logo upload UI + inject into cover page. Commercial blocker.
- **Shareable report link** — Signed token → public read-only report route. Board members need to receive reports without Grove accounts.
- **Scheduled report delivery** — `report_schedules` table + Vercel Cron + Resend. Advisor productivity multiplier.
- **Bank Covenant data model** — `bank_covenants` table + settings UI to remove the hardcoded placeholder rows from that template.

### FIX
- **Resolve `@ts-nocheck` and type system divergence** — Unify `ReportSectionConfig.type` and `ReportSectionType` vocabularies across builder, viewer, and PDF.
- **Consolidate `reports` and `generated_reports` tables** — Single source of truth with RLS, share_url, and status fields.
- **Fix KPI N/A fields** — Implement EBITDA, revenue growth, headcount estimates. Flag remaining gaps explicitly rather than silent N/A.
- **Theme picker in export UI** — One dropdown in the Export button area. 2 hours.
- **Wire templates page to builder** — Navigation from template cards to builder with pre-selection.
- **`key_ratios` chart metric** — Implement ratio trend data or remove this chart type from the Bank Covenant template until the data model exists.

### LEVERAGE
- **Headless browser service for PDF** — Browserless.io ($30/month for up to 1,000 page renders), PDFShift, or Cloudflare Browser Rendering. No custom renderer needed.
- **Resend or Postmark for scheduled email delivery** — Transactional email for report distribution. Already recommended in BUILD_VS_BUY_ANALYSIS.md. $15/month for 50,000 emails.
- **Vercel Cron Jobs** — Free on Pro plan (2 jobs). Sufficient for a monthly report scheduler.
- **Supabase Storage for logo hosting** — Already in the stack. Use for advisor logo uploads. Signed URLs for secure delivery.
- **`@dnd-kit`** — If already in the shadcn/ui dependency tree, use for drag-to-reorder sections in the report builder canvas. No new dependency.

### SKIP
- **Custom PDF renderer from scratch** — The headless browser service is the correct approach. Building a custom SVG/HTML-to-PDF renderer in TypeScript is months of engineering for zero competitive advantage.
- **Real-time collaborative editing on reports** — Abacum-style concurrent editing with presence indicators. This is a significant infrastructure investment (WebSockets / Supabase Realtime for document state) with low SME-advisory ROI. Revisit in Phase 3.
- **PowerPoint export** — DataRails auto-generates PowerPoint. For Grove's target market (advisors using web-based reports), PDF is the primary delivery format. PowerPoint requires a separate rendering library (`pptxgenjs`). Revisit post-launch if advisors specifically request it.
- **90+ chart types** — Fathom's 90+ chart types are a product of years of iteration. Grove should ship with 5 well-rendered, reliable chart types (Line, Bar, Stacked Bar, Waterfall, KPI Gauge) rather than 90 mediocre ones.
- **Multi-entity consolidated reporting** — Group company consolidation with intercompany eliminations is an advisor portal Phase 2 feature (Fathom and Syft do this well). Not relevant until the multi-entity data model is built.
