# ADVISORY OS — DEMO SPRINT SPEC
## March 25, 2026

> **Purpose:** Build spec for four critical feature areas needed before demo. Merge into CLAUDE.md for Claude Code execution. This document IS the single source of truth — it overrides earlier specs where conflicts exist.

---

## ⚠️ MANDATORY: CLAUDE CODE BUILD PROTOCOL

**This section must be followed BEFORE acting on ANY instruction below.**

### Step 0: Read This Entire Document First
Do not start building until you've read every section. The features are interdependent.

### Step 1: Full Codebase Audit
```bash
# Scan the entire project
find . -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | head -200
cat package.json
ls -la src/ app/ components/ lib/ utils/ pages/ 2>/dev/null
# Check database schema
find . -name "*.sql" -o -name "schema.*" -o -name "migrations" -type d
# Check what routes/pages exist
find . -path "*/app/**/page.tsx" -o -path "*/pages/**/*.tsx" 2>/dev/null
# Check existing components
find . -path "*/components/**" -name "*.tsx" | sort
# Check API routes
find . -path "*/api/**" -name "*.ts" -o -path "*/api/**" -name "*.tsx" | sort
```

### Step 2: Gap Assessment
Before writing ANY code, produce a brief assessment in PROGRESS.md:
- **Already built:** Features/components that exist and work
- **Partially built:** Features started but incomplete
- **Not yet built:** Features from this document with no implementation
- **Conflicts:** Instructions below that contradict existing implementation

### Step 3: Enhance, Don't Rebuild
- **Already built** → Only modify if this document specifies a clear improvement. Preserve existing work.
- **Partially built** → Complete them per specs below, matching existing code patterns.
- **Not yet built** → Build fresh, following existing codebase conventions (folder structure, component patterns, styling, naming).
- **NEVER delete or overwrite working code** without stating what you're replacing and why.

### Step 4: Match Existing Conventions
- Use the same component library, styling approach, and file structure as the existing codebase
- If the existing code uses a specific pattern, follow it for new code
- If this document suggests a different approach than what's already implemented, flag the conflict in PROGRESS.md and make the pragmatic choice

### Step 5: Confirm Before Large Changes
- If a sprint instruction would require restructuring more than 3 existing files, describe the proposed changes in PROGRESS.md before executing
- If a sprint instruction conflicts with existing database schema, describe the migration needed before running it

### Step 6: Test After Every Feature
```bash
npm run build  # Must pass
npm run lint   # Should pass
```

### Step 7: Commit Frequently
Use descriptive commit messages. Never break the build.

### Step 8: Log Progress
Update PROGRESS.md at the end of each sprint section completed.

---

## 0. DATA PRIMITIVES — COLOR CODING, DRILL-DOWN & ASSUMPTION MANAGEMENT

> **These are platform-wide primitives that must be implemented BEFORE building any module UI. Every number on every screen depends on these.**

### 0.1 Universal Number Classification & Color Coding

Every single number displayed anywhere on the platform must be classified into one of six types. This is the Wall Street / investment banking standard adapted for a product UI.

**Color System:**

| Type | Font Color | Background | Meaning | Editable? |
|---|---|---|---|---|
| **Actual** | `#1e293b` (near-black) | `none` | Real data pulled from Xero/integrations. Verified historical numbers. | No |
| **Forecast** | `#7c3aed` (purple) | `#f5f3ff` (light purple tint) | AI-generated or system-calculated projections based on actuals + assumptions | No (change assumptions instead) |
| **Assumption** | `#2563eb` (blue) | `#eff6ff` (light blue tint) | User-editable inputs that drive forecasts. THE numbers people change. | **Yes — always clickable** |
| **Calculated** | `#0f172a` (black) | `none` | Derived from formulas (e.g., Gross Margin = Revenue - COGS). Shows formula on hover. | No (change inputs instead) |
| **Linked** | `#059669` (green) | `none` | References data from another module/sheet (e.g., KPI pulling from P&L). Shows source on hover. | No (go to source) |
| **Zero / Not Pulled** | `#94a3b8` (grey) | `none` | No data available yet, or zero value. Distinguishes "actually zero" from "data missing". | Depends on type |

**Implementation requirements:**
- Every `<NumberCell />` component wraps values with the appropriate classification
- Hover tooltip on EVERY number shows: type label, source (where it comes from), formula if calculated, last updated timestamp
- Assumption cells have a subtle blue border/underline indicating they're editable — click to edit inline
- A **legend bar** at the top of every financial view explains the colors (collapsible, shown by default on first visit)
- Consistent across: dashboards, scenario builder, KPI engine, financial statements, board packs, investor portal

**Cross-reference from 10 FP&A competitors:**

| Tool | Color Approach | What We Steal | Where We Go Further |
|---|---|---|---|
| **DataRails** | Excel-native formatting inherits user's existing colors. Dashboards use conditional RAG (red/amber/green) for variance | Drill-down by clicking any data point → choose breakdown dimension → new viz appears | We classify every number by TYPE not just variance. DataRails can't drill calculated values — we can |
| **Runway** | Blue with grey background = input/assumption. Black = formula. Clean, minimal. Driver descriptions in plain English | Assumption cells are visually distinct and always editable. Every change auto-drafts a scenario. Activity history tracks all changes | We add the justification prompt on change + version control layer |
| **Fathom HQ** | Clean dashboard with variance colors (green positive, red negative). Grey for benchmarks | Clear visual separation of actual vs benchmark. Hover shows calculation breakdown | We go deeper — every number is clickable to source, not just benchmarks |
| **Syft Analytics** | Standard accounting colors. RAG on KPIs | Trial balance drill-down to individual transactions | We replicate transaction-level drill-down from Xero data |
| **Jirav** | Blue for assumptions in driver-based models. Templates distinguish inputs from outputs | JIF (auto-forecast) toggle clearly separates AI-generated from manual | We show AI reasoning chain behind every forecast number |
| **Mosaic** | Clean dashboard. Variance bars with color intensity indicating magnitude | Unified "One Data" model — no silos between actuals and forecast | We maintain single-model approach but add type classification on top |
| **Cube** | Spreadsheet-native (Excel/Sheets). Follows user formatting | Bi-directional sync — edit in spreadsheet, reflects in platform | We keep editing in-platform but make every cell explain itself |
| **Planful** | Enterprise formatting with clear input vs output sections. Workflow-based approvals | Structured input templates with validation rules before submission | We add justification capture + AI validation |
| **Vena** | Excel-native. Blue for inputs (Wall Street convention). Templates enforce structure | Native Excel integration preserves existing color conventions. Planning Agent for driver-based forecasts | We surface the Excel convention in a web UI that non-finance users understand |
| **Abacum** | Modern UI with clear actual vs plan visual separation. Variance highlighting | Real-time actuals ingestion with visual distinction from planned numbers | We match clean UI but add six-type system for complete traceability |

### 0.2 Universal Drill-Down Architecture

**Every single number on the platform must be drillable.** No dead-end numbers. If it's on screen, you can click it and understand where it comes from.

**Drill-down levels:**

```
Level 0: Dashboard widget (e.g., "Revenue: £142,000")
  ↓ Click
Level 1: Breakdown by dimension (by month, by product, by customer, by channel)
  ↓ Click any segment
Level 2: Line-item detail (individual revenue lines, invoice-level)
  ↓ Click any line
Level 3: Source transaction (Xero invoice, bank transaction, manual entry)
  ↓
Level 4: Source system link (opens in Xero if applicable)
```

**Drill-down UX pattern (stolen from DataRails + adapted):**

1. **Click any number** → Drill-down panel slides in from the right (not a modal — user keeps context)
2. **Panel header:** Shows the number, its type (color badge), and source
3. **Breakdown selector:** Dropdown to choose dimension: "Break down by: Month | Product | Customer | Department | Account"
4. **Visualization:** Auto-generates appropriate chart (bar for categorical, line for time series, table for detailed)
5. **Further drill:** Click any bar/row in the breakdown → drills one level deeper
6. **Breadcrumb trail:** Shows drill path at top: "Revenue → By Product → Bridal → By Month → March → Invoices"
7. **Back navigation:** Click any breadcrumb to jump back to that level
8. **Actions from drill-down:** Export this view, add as dashboard widget, share this breakdown, add comment

**Technical implementation:**
```typescript
// Every data point must implement this interface
interface DrillableValue {
  value: number;
  type: 'actual' | 'forecast' | 'assumption' | 'calculated' | 'linked' | 'zero';
  source: {
    module: string;        // 'xero' | 'kpi_engine' | 'scenario' | 'manual'
    entity_type: string;   // 'invoice' | 'journal' | 'kpi_config' | 'assumption'
    entity_id?: string;    // UUID of source record
    formula?: string;      // Human-readable: "Revenue - COGS"
    last_updated: string;  // ISO timestamp
  };
  drillable: boolean;
  drill_dimensions: string[];  // ['month', 'product', 'customer', 'department']
}
```

**Reusable component:** `<DrillableNumber value={drillableValue} />` — used everywhere. Renders the number with correct color, hover tooltip, and click handler.

### 0.3 Assumption Management — The Control Centre

**This is the single biggest UX challenge.** Assumptions drive everything. Users need to:
- See ALL their active assumptions in one place
- Change any assumption and see the ripple effect immediately
- Understand which outputs are affected by which assumptions
- Quickly switch between assumption sets (scenarios)
- Lock assumptions they're confident about

**Assumptions Hub (dedicated page + accessible from any assumption cell):**

**Left panel — Assumption categories:**
```
Revenue Assumptions
├── Growth rate (monthly): 5% ← EDITABLE
├── Average order value: £180 ← EDITABLE
├── Customer acquisition rate: 12/month ← EDITABLE
├── Churn rate: 3% ← EDITABLE
└── Seasonal adjustment: [pattern] ← EDITABLE

Cost Assumptions
├── COGS as % of revenue: 38% ← EDITABLE
├── Headcount plan: [by role] ← EDITABLE
├── Salary growth: 3% annual ← EDITABLE
├── Marketing spend: £5K/month ← EDITABLE
└── Rent: £2,500/month ← EDITABLE (fixed)

Macro Assumptions
├── Inflation rate: 2.5% ← EDITABLE
├── Tax rate: 19% ← EDITABLE
├── Interest rate: 5.25% ← EDITABLE
└── Exchange rate (if applicable) ← EDITABLE
```

**Right panel — Impact preview:**
When user hovers over OR edits any assumption, the right panel instantly shows:
- Which financial outputs are affected (P&L lines, KPIs, cash flow)
- Magnitude of impact: "Changing growth rate from 5% → 8% increases annual revenue by £38,400 and improves cash position by £12,100"
- Visual: mini waterfall chart showing the ripple

**Assumption editing UX (CRITICAL — must be fast and intuitive):**

1. **Inline edit:** Click any blue assumption number anywhere on the platform → edit in place. Change takes effect immediately across all affected outputs.

2. **Quick adjust controls:** For percentage/rate assumptions, show +/- buttons and a slider alongside the input field. User can drag to see real-time impact without committing.

3. **Justification prompt:** After changing an assumption, a small toast appears: "What's driving this change?" with a text input. Optional but encouraged. Stored as audit trail.

4. **Assumption lock:** Toggle to lock an assumption (padlock icon). Locked assumptions can't be accidentally changed. Requires explicit unlock.

5. **Assumption source:** Each assumption shows where it came from: "Set during onboarding interview" / "AI-suggested based on industry benchmark" / "Manually set by James on March 20" / "Pulled from Xero historical average"

6. **Batch update:** From the Assumptions Hub, edit multiple assumptions at once and see combined impact before applying.

7. **Assumption sets = Scenarios:** Each scenario IS a set of assumptions. Switching scenarios swaps the entire assumption set. Comparing scenarios compares assumption sets side-by-side with resulting output differences.

**Technical implementation:**
```sql
CREATE TABLE assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organisations(id),
  scenario_id UUID REFERENCES scenarios(id),
  category TEXT NOT NULL,  -- 'revenue', 'cost', 'macro', 'custom'
  key TEXT NOT NULL,  -- 'revenue_growth_rate', 'cogs_percentage', etc.
  label TEXT NOT NULL,  -- Human-readable: "Monthly Revenue Growth Rate"
  value NUMERIC NOT NULL,
  unit TEXT,  -- '%', '£', 'count', 'months'
  data_type TEXT DEFAULT 'percentage',  -- 'percentage', 'currency', 'number', 'date'
  source TEXT,  -- 'onboarding', 'manual', 'ai_suggested', 'xero_historical'
  source_detail TEXT,  -- "Average of last 12 months Xero data"
  locked BOOLEAN DEFAULT false,
  locked_by UUID REFERENCES users(id),
  locked_at TIMESTAMPTZ,
  min_value NUMERIC,  -- Validation: reasonable range
  max_value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES users(id),
  UNIQUE(org_id, scenario_id, key)
);

CREATE TABLE assumption_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assumption_id UUID REFERENCES assumptions(id),
  old_value NUMERIC,
  new_value NUMERIC,
  justification TEXT,
  changed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Every calculated output must reference which assumptions it depends on
CREATE TABLE output_assumption_dependencies (
  output_entity_type TEXT NOT NULL,
  output_entity_id UUID NOT NULL,
  output_field TEXT NOT NULL,  -- 'revenue_forecast_q2', 'gross_margin_forecast'
  assumption_id UUID REFERENCES assumptions(id),
  dependency_type TEXT DEFAULT 'direct',  -- 'direct' or 'indirect'
  PRIMARY KEY (output_entity_type, output_entity_id, output_field, assumption_id)
);
```

**Dependency graph:** When any assumption changes, the system traverses the dependency graph and recalculates all affected outputs in real-time. This is the core of the "change one number, see everything update" experience.

### 0.4 Reusable Data Primitive Components (Build These First)

```
<DrillableNumber />    — Renders any number with correct color, tooltip, drill-down click
<AssumptionInput />    — Blue editable field with slider, +/-, justification prompt
<NumberLegend />       — Collapsible legend bar explaining color system
<DrillPanel />         — Right slide-in panel for drill-down views
<ImpactPreview />      — Mini waterfall showing assumption change ripple
<FormulaTooltip />     — Hover component showing "Gross Margin = Revenue - COGS"
<SourceBadge />        — Small badge showing data source: "Xero" / "Manual" / "AI"
<VarianceIndicator />  — Arrow + percentage showing change vs prior period/budget
```

---

## 1. TEAM COLLABORATION LAYER

### The Principle

Every single surface in Advisory OS must be collaboration-capable. This isn't a bolt-on feature — it's a platform-wide primitive. If something exists on screen, it should be shareable, commentable, and version-trackable.

### Architecture: Collaboration Primitives

Build these as reusable infrastructure that every module consumes:

#### 1.1 Sharing System

**Database: `shares` table**
```
id, org_id, entity_type (scenario|dashboard|report|kpi_config|playbook|board_pack),
entity_id, shared_by, shared_with_user_id, shared_with_role,
permission_level (view|comment|edit|co_own), message, created_at, expires_at
```

**UX — Share Modal (universal component)**
- Triggered from a persistent "Share" button in top-right of every module view
- Person picker: search by name/email within org, shows role badge (Owner, CFO, Advisor)
- Permission dropdown per person: View Only → Comment → Edit → Co-Own
- Optional message field ("Here's the Q2 scenario — need your input on hiring assumptions")
- Share history visible: who has access, when granted, last viewed
- "Copy link" option for internal platform links
- Bulk share: select multiple items from a list view and share to same person(s)

#### 1.2 Commentary System

**Database: `comments` table**
```
id, org_id, entity_type, entity_id, field_path (nullable — for cell/field-level comments),
user_id, content, parent_comment_id (for threads), resolved_at, resolved_by, created_at
```

**UX — Contextual Comments**
- **Cell-level commenting on scenarios/models:** Click any number in a scenario table → speech bubble icon appears → opens threaded comment panel on the right
- **Section-level commenting on dashboards/reports:** Hover over any widget/section → comment icon in top-right corner
- **Comment panel:** Slides in from right (like Google Docs). Shows all threads for current view. Filter: All | Open | Resolved | Mine
- **@mentions:** Tag team members in comments. Generates notification
- **Justification capture:** When a user CHANGES a number in a scenario or model, prompt: "What's driving this change?" with a text input. This is stored as an automatic comment attached to that cell's change event. Collapsed by default, expandable on click. This is critical for audit trails and team understanding

#### 1.3 Version Control

**Database: `entity_versions` table**
```
id, org_id, entity_type, entity_id, version_number, version_label (nullable),
created_by, snapshot_data (JSONB — full state), change_summary (text),
is_master (boolean), created_at
```

**UX — Version Management**
- **Auto-save as draft:** Every edit auto-saves. No explicit "save" button
- **Save as Version:** Explicit action — "Save as Version" button. Prompts for version label ("Post-Q2 Board Meeting", "Sarah's Revenue Assumptions")
- **Version history panel:** Accessible from every module. Shows timeline of versions with: label, author, timestamp, change summary
- **Compare versions:** Side-by-side diff view. For scenarios: highlight changed cells in yellow with old→new values. For dashboards: show delta metrics
- **Master version:** One version marked as "Master" (green badge). Only Co-Owners can promote a version to Master. All other versions are working copies
- **Fork & Merge pattern:** Any user with Edit permission can "Fork" the master to create their own working version. When ready, they submit it for review. Co-Owner can merge or reject with comments
- **Restore:** Any version can be restored as a new version (never destructive)

#### 1.4 Activity Feed

**Database: `activity_log` table** (extends existing audit log)
```
id, org_id, entity_type, entity_id, user_id, action_type
(shared|commented|version_created|edited|exported|viewed), metadata (JSONB), created_at
```

**UX — Activity Feed**
- Per-entity activity feed: "What happened on this scenario?" Shows sharing events, comments, version changes, edits
- Org-level activity feed: Dashboard widget showing recent collaboration activity across all entities
- Filter by: person, entity type, action type, date range

#### 1.5 Export & Download

Every shareable entity must support:
- **PDF export** with version label, author, timestamp watermark
- **Excel export** where applicable (scenarios, KPI tables)
- **PowerPoint export** for dashboards/graphs (individual widget or full page)
- **Share externally** generates a governed link (see Section 2 — Investor Portal)
- Export audit: every export logged with user, timestamp, format, version exported

#### 1.6 Where Collaboration Surfaces (Module-by-Module)

| Module | Share | Comment | Versions | Export |
|---|---|---|---|---|
| Scenario Builder / Goal Seek | ✅ Per scenario | ✅ Cell-level + section | ✅ Full version control | PDF, Excel |
| Dashboards | ✅ Per dashboard | ✅ Widget-level | ✅ Layout + config versions | PDF, PPT |
| KPI Engine | ✅ Per KPI config set | ✅ Per metric | ✅ Config versions | PDF, Excel |
| Board Pack | ✅ Per pack | ✅ Section-level | ✅ Full version control | PDF (primary) |
| Playbook | ✅ Per playbook | ✅ Step-level | ✅ Maturity snapshots | PDF |
| Knowledge Vault | ✅ Per document/collection | ✅ Document-level | ✅ Document versions | Original format |
| Financial Statements | ✅ Per statement set | ✅ Line-item level | ✅ Period snapshots | PDF, Excel |

#### 1.7 Notification System

- In-app notification bell (top nav)
- Types: "X shared Y with you", "X commented on Y", "X requested your review", "X promoted version to Master"
- Notification preferences: per-type toggle (in-app, email digest)
- Unread badge count

---

## 2. EXTERNAL ADVISOR & INVESTOR PORTAL (INTELLIGENT VDR)

### Why This Isn't a Typical VDR

Traditional VDRs (Datasite, Intralinks, Ansarada, DocSend, DealRoom) are document repositories with access controls. They're built for M&A due diligence — upload files, set permissions, track who viewed what.

Advisory OS goes further:
- The data is **live**, not static documents. Investors see real dashboards, not stale PDFs
- The business owner is **AI-prepared** before sharing anything
- The investor can **interact** — run scenarios, ask questions, request follow-ups
- The platform **tracks engagement intelligence** and feeds it back to the business owner
- It creates **network effects** — impressed investors recommend Advisory OS to their portfolio companies

### 2.1 VDR Competitive Feature Audit (Top 5)

**What to steal from each:**

| VDR | Key Feature to Steal | How We Go Further |
|---|---|---|
| **Datasite** | AI document classification, Q&A workflows linked to specific files, engagement analytics per user/document, AI-powered redaction | Our data is live, not static files. Q&A is AI-assisted. Analytics include scenario interaction, not just document views |
| **Ansarada** | Bidder engagement scoring (AI predicts which reviewers are "highly engaged"), deal readiness scoring, Smart Sort auto-classification | We score engagement + provide actionable recommendations to business owner on follow-up strategy |
| **DocSend** | Page-level engagement heatmaps, real-time view notifications, version control where updates propagate to all existing links, per-investor personalised rooms | We do this at the widget/metric level, not page level. Each investor gets a curated view, not a document dump |
| **DealRoom** | Diligence tracker + project management layered on top of VDR, request lists linked to documents, milestone tracking | Our playbook engine IS the project management. Diligence milestones map to playbook maturity stages |
| **Intralinks (VDRPro)** | Multi-party workflows, "View As" feature to preview what different roles see, compliance/regulatory support, enterprise SSO | "View As" is essential — business owner must preview exactly what an investor will see before sharing |

### 2.2 Left Nav Structure

```
External Sharing
├── Investor Portal
│   ├── Active Rooms
│   ├── Room Builder
│   ├── Engagement Analytics
│   └── Investor Directory
├── Advisor Portal
│   ├── Shared Workspaces
│   └── Advisory Requests
├── AI Readiness Check
│   ├── Sharing Prep Interview
│   └── Gap Analysis
└── Message Centre
    ├── Drafts
    ├── Sent
    └── Templates
```

### 2.3 Investor Room Builder

**What it is:** The business owner creates a curated "room" for each investor or investor group. Not a file dump — a guided, branded experience.

**Room creation flow:**
1. **Name the room** — e.g., "Series A — Hoxton Ventures"
2. **Select sharing template:**
   - **Light Package** (recommended for first touch): Company overview, key KPIs, revenue trend, team, market opportunity
   - **Detailed Package** (for serious investors post-meeting): Full financials, scenarios, unit economics, cap table, board packs, customer metrics
   - **Custom** — pick individual items
3. **AI Recommendation Engine:** Based on the investor type (angel, VC, PE, strategic), the platform recommends which data to include and which to hold back. Shows reasoning: "VC investors at seed stage typically want to see: [list]. We recommend withholding detailed unit economics until after first meeting."
4. **Select data sources:** Each item maps to a live platform entity:
   - Dashboard widgets (rendered live, not screenshots)
   - Scenario models (read-only or interactive — owner chooses)
   - Board pack sections
   - KPI snapshots
   - Uploaded documents (pitch deck, legal docs, etc.)
5. **Set permissions per item:**
   - View only
   - Interactive (can adjust scenario sliders but changes don't persist)
   - Downloadable (with watermark + audit trail)
   - Hidden (in room structure but greyed out — "Available upon request")
6. **Preview as Investor** — "View As" mode shows exactly what the investor will see
7. **Publish** — generates unique link with email verification gate

### 2.4 AI Readiness Check (Pre-Share Interview)

**This is the killer differentiator.** Before a business owner shares anything externally, the platform runs an AI readiness assessment.

**How it works:**
1. Owner selects "Prepare to Share" on any room
2. AI scans ALL content in the room: financial data, scenarios, KPIs, documents
3. AI identifies gaps, inconsistencies, and likely questions:
   - "Your revenue growth is 40% but you haven't included customer acquisition cost data. Investors will ask about this."
   - "Your scenario model shows 3 scenarios but none include a downside case. This will reduce credibility."
   - "Your board pack references a 'strategic partnership' but there's no supporting documentation in the room."
4. **AI Interview mode (optional):** Voice or chat interview where the AI asks the business owner the questions an investor would ask, based on the shared data:
   - "Walk me through your path to profitability"
   - "What happens to your model if growth slows to 20%?"
   - "Who are your top 3 competitors and why do you win?"
5. Owner's answers are captured and stored. Option to include selected answers as Q&A content in the room
6. **Readiness Score:** 0-100, broken down by: Data Completeness, Narrative Consistency, Financial Hygiene, Competitive Positioning
7. Recommendations to improve score before sharing

### 2.5 Investor Experience (What They See)

**Landing page:** Branded with business logo. Clean, premium feel. Not a file tree.

**Layout:**
- **Overview tab:** Company snapshot, key metrics, team, mission
- **Financials tab:** Live dashboard widgets (not PDFs). Revenue, expenses, margins, cash flow — all interactive with hover tooltips
- **Scenarios tab (if shared):** Interactive scenario viewer. Investor can toggle assumptions to see impact BUT changes are sandboxed — they don't affect the owner's data. If investor creates an interesting scenario, they can "Share back" to the owner
- **Documents tab:** Traditional file list for uploaded docs (pitch deck, legal, etc.)
- **Q&A tab:** Threaded Q&A system. Investor asks question → owner gets notified → responds in platform. All Q&A persists and is searchable. AI suggests answers to owner based on platform data
- **Request tab:** Investor can formally request additional information. Requests are tracked with status (Pending, Shared, Declined)
- **Search bar:** Full-text search across everything in the room. AI-powered — can answer questions directly: "What's the gross margin trend over last 12 months?" → AI generates answer from live data

**Investor actions:**
- Bookmark items for later review
- Add private notes (only visible to them)
- Share back to owner: "Here's a scenario I modelled based on your data — thoughts?"
- Request a meeting
- Express interest level (informal signal): "Watching" → "Interested" → "Active"

### 2.6 Engagement Analytics (For Business Owner)

Stealing from DocSend + Ansarada, going further:

- **Per-investor dashboard:**
  - Total time in room
  - Pages/sections visited (heatmap)
  - Documents viewed + time per document
  - Scenarios interacted with (which assumptions did they adjust?)
  - Questions asked
  - Items requested
  - Last active timestamp
  - Engagement score (AI-calculated: Low / Medium / High / Very High)
- **Aggregate view:** Across all investors in a room
- **AI Insights:**
  - "Investor A spent 8 minutes on your unit economics but skipped the market opportunity section. Consider strengthening your market narrative before follow-up."
  - "Investor B adjusted your hiring scenario 3 times, reducing headcount each time. They may have concerns about burn rate."
  - "3 of 5 investors asked about customer retention. Consider adding a cohort analysis widget."
- **Follow-up recommendations:** AI drafts personalised follow-up messages based on engagement patterns

### 2.7 Download Controls & Security

- **Per-item download toggle:** Owner controls what's downloadable
- **Dynamic watermarking:** Every downloaded document watermarked with investor name, email, timestamp
- **View-only rendering:** Financial data renders in-platform, not as downloadable files
- **Access expiration:** Rooms can auto-expire after X days
- **Access revocation:** Instant revocation per investor
- **NDA gate:** Optional NDA signing before room access (e-signature)
- **IP restrictions:** Optional — limit access to specific IP ranges
- **Full audit trail:** Every view, download, search, interaction logged with timestamp

### 2.8 Message Centre

- **Draft messages** to investors directly from the platform
- **Templates:** Pre-built message templates for common scenarios:
  - "Thank you for reviewing — key highlights"
  - "Follow-up: addressing your questions"
  - "Updated data available in your room"
  - "Invitation to review updated scenario"
- **Bulk messaging:** Send to all investors in a room or select group
- **Message tracking:** Read receipts, link click tracking
- **AI drafting:** Based on engagement analytics, AI drafts personalised messages:
  - "Hi [Investor], I noticed you spent significant time reviewing our unit economics. I've added a more detailed cohort analysis to your room — would love to discuss."

### 2.9 Network Effects Engine

This is the long play:
- When an external advisor/investor sees Advisory OS, they experience a platform that's miles ahead of receiving a pitch deck over email
- **Referral prompt:** After engaging with a room, investors see: "Know a business that could benefit from this level of financial clarity? Invite them to Advisory OS."
- **Advisor acquisition:** External advisors who are impressed become platform advisors. Smooth transition from "external viewer" to "platform advisor"
- **Portfolio view (for investors with multiple investments on platform):** If an investor has access to multiple businesses on Advisory OS, they get a portfolio dashboard

---

## 3. DASHBOARDS, GRAPHS & SEARCH — COMPLETING THE BUILD

### 3.1 Graph Generation — Fix the "Generate" Button

The generate button on graphs needs to work end-to-end:

**Flow:**
1. User clicks "Generate" or "Add Graph"
2. **Option A — AI-generated:** Text input: "Show me revenue vs expenses over the last 12 months as a bar chart"
   - AI parses intent → selects correct data from Xero/KPI engine → generates chart config → renders
   - If data doesn't exist, AI explains what's missing and how to get it
3. **Option B — Template picker:** Grid of chart templates (bar, line, area, pie, scatter, waterfall, combo)
   - Select template → data source picker (which metrics) → time range → render
4. **Option C — Duplicate existing:** Copy an existing graph widget and modify

**Technical requirements:**
- Chart library: Recharts (already in stack) or upgrade to D3 for more complex visualizations
- Every chart must support: hover tooltips with exact values, legend toggle, date range slider, export as PNG/PDF, full-screen mode
- Charts must render from live data — not static images
- Loading states with skeleton UI while data fetches

### 3.2 Dynamic Widgets

Widgets need to be genuinely interactive:

**Widget types that must work:**
- **KPI card:** Single metric with trend arrow, spark line, vs target %, vs previous period
- **Time series chart:** Line/bar with configurable time range, multi-metric overlay
- **Comparison chart:** Side-by-side or grouped bars for budget vs actual, scenario A vs B
- **Waterfall chart:** For P&L bridge, cash flow bridge
- **Pie/donut:** For revenue mix, expense categories
- **Table widget:** Sortable, filterable data table with conditional formatting (red/amber/green)
- **AI Commentary widget:** Auto-generated narrative summary of what the data shows. Updates when data changes. Shows reasoning chain (collapsed by default)
- **Gauge/progress:** For KPI target tracking, playbook maturity
- **Funnel:** For sales pipeline, conversion metrics

**Dynamic behaviours:**
- Drag-and-drop reposition on dashboard
- Resize by dragging edges
- Click-through: clicking a widget drills into detail view
- Cross-filtering: clicking a segment on one chart filters all other charts on the dashboard
- Time range sync: one master date picker controls all widgets OR each widget has independent range
- Refresh: manual refresh button + configurable auto-refresh interval
- Add/remove widgets from dashboard without losing layout

### 3.3 Search Bar — Make It Work Like Claude

This is the highest-impact fix. The search bar should be an AI-native query interface.

**Architecture:**
```
User types natural language query
    → AI intent classification (is this a data query, navigation, document search, or question?)
    → Route to appropriate handler:
        → Data query: "What was our revenue last month?" → Query KPI engine → Return answer + mini chart
        → Navigation: "Show me the scenario builder" → Navigate to page
        → Document search: "Find the board pack from January" → Search knowledge vault → Return results
        → Question: "Why did margins drop in Q3?" → AI analysis of data → Narrative answer with citations
```

**What the user should experience:**
- Press `/` or click search bar from anywhere on the platform
- Command palette style (like Spotlight on Mac, or Linear's command menu)
- Type anything in plain English
- Results appear instantly:
  - **Direct answers:** "Revenue last month was £142,000, up 12% from previous month" with mini sparkline
  - **Navigation links:** "Go to Scenario Builder" → click to navigate
  - **Document results:** "Board Pack Q4 2025" → click to open
  - **AI analysis:** "Margins dropped in Q3 because COGS increased 18% while revenue grew only 5%. The primary driver was..."
- Recent searches saved
- Suggested queries based on current page context

**Technical implementation:**
- Anthropic Claude API for NL understanding
- Vector embeddings for document search (pgvector in Supabase)
- Structured data queries route to KPI engine API
- Response streaming for long AI answers
- Cache frequent queries

### 3.4 Dashboard Completion Checklist

Ensure these dashboard views exist and are fully functional:

| Dashboard | Widgets Required | Status Check |
|---|---|---|
| **Overview** | Revenue trend, P&L summary, cash position, key KPIs (4-6), AI commentary, upcoming actions | Must work |
| **Financial Health** | Cash flow waterfall, runway gauge, burn rate trend, accounts receivable aging, AP aging | Must work |
| **Revenue** | Revenue by product/service, MRR/ARR trend, customer concentration, revenue growth rate | Must work |
| **Profitability** | Gross margin trend, operating margin, expense breakdown (pie), budget vs actual variance | Must work |
| **Scenario Comparison** | Side-by-side scenario metrics, sensitivity tornado chart, break-even analysis | Must work |
| **KPI Tracker** | All configured KPIs with RAG status, trend, target, variance | Must work |

---

## 4. SKILLS ARCHITECTURE — PER-COMPANY KNOWLEDGE SYSTEM

### What Your Hedge Fund Friend Is Talking About

Skills in the AI context are **persistent, structured knowledge packages** that teach the AI how to work with a specific company's data, terminology, patterns, and preferences. Instead of starting from scratch every conversation, the AI loads the relevant "skill" and immediately knows:

- This company's chart of accounts structure
- Their specific KPI definitions and what "good" looks like for them
- Their industry benchmarks and how they compare
- Their team's preferred reporting format
- Common questions their investors ask
- Historical patterns in their data (seasonal trends, etc.)

### How This Maps to Advisory OS

**Yes — you should be building like this. Here's the architecture:**

#### 4.1 Company Skills (Auto-Generated)

When a business onboards, the platform automatically generates a "Company Skill" from:

**Data sources:**
- Xero integration: chart of accounts structure, account categories, historical data patterns
- Onboarding interview: business model, industry, stage, goals, team structure
- Platform usage: which modules they use, which KPIs they track, scenarios they build
- Document uploads: business plans, board packs, investor decks

**Generated skill contains:**
```json
{
  "company_id": "uuid",
  "skill_version": 3,
  "last_updated": "2026-03-25",
  "business_context": {
    "industry": "Fashion / Direct-to-Consumer",
    "stage": "Growth (£500K-2M revenue)",
    "business_model": "B2C e-commerce + wholesale",
    "key_revenue_streams": ["Online DTC", "Wholesale", "Bridal custom"],
    "seasonality": "Peak: Sept-Dec (wedding season + Q4), Trough: Jan-Mar",
    "team_size": 12
  },
  "financial_structure": {
    "chart_of_accounts_summary": "...",
    "key_cost_centres": ["Materials", "Labour", "Marketing", "Rent"],
    "typical_gross_margin_range": "55-65%",
    "payment_terms": "Net 30 wholesale, immediate DTC"
  },
  "kpi_definitions": {
    "custom_kpis": [
      {"name": "Cost per Dress", "formula": "Total Materials + Labour / Units Produced", "target": "< £180"},
      {"name": "Wholesale Reorder Rate", "formula": "Repeat orders / Total wholesale customers", "target": "> 40%"}
    ]
  },
  "data_patterns": {
    "seasonal_trends": "Revenue peaks in Q3-Q4. Cash flow tightest in Q1 due to material procurement for spring collection.",
    "known_anomalies": ["Large one-off wholesale order in March 2025 — not recurring"]
  },
  "communication_preferences": {
    "owner_financial_literacy": "intermediate",
    "preferred_explanation_style": "plain English, avoid jargon, use analogies",
    "report_format": "visual-heavy, executive summary first"
  },
  "investor_faq": [
    "What's your path to profitability?",
    "How do you manage inventory risk?",
    "What's your customer acquisition cost?"
  ]
}
```

#### 4.2 How Skills Are Used

Every AI interaction on the platform loads the relevant company skill:

- **Search bar query:** "Why is cash flow low this month?" → AI knows seasonality pattern, checks against expected Q1 trough, provides contextual answer: "Cash flow is £12K below average but this is consistent with your typical Q1 pattern. Material procurement for the spring collection historically causes a dip. Last year at this time, cash flow was £8K — so you're actually in a better position year-over-year."

- **Scenario builder:** When user creates a scenario, AI pre-populates sensible assumptions based on historical patterns rather than generic defaults

- **AI commentary on dashboards:** Commentary references company-specific context, not generic observations

- **Investor readiness check:** AI knows what questions investors typically ask THIS type of business and prepares accordingly

- **KPI recommendations:** AI suggests KPIs relevant to this specific industry and stage, not a generic list

#### 4.3 Skill Evolution

Skills aren't static — they compound:

- **Auto-update triggers:** New Xero data sync, completed onboarding questions, new documents uploaded, scenarios created, board packs generated
- **Manual refinement:** Owner or advisor can correct/enhance skill: "Actually, our seasonality shifted — we now peak in Q2 due to new festival collection"
- **Version history:** Every skill update is versioned. Can see how the platform's understanding of the business has evolved
- **Cross-company learning (anonymised):** Patterns from similar companies inform new company skill generation. "Businesses in your industry at your stage typically track these 8 KPIs" — powered by aggregate platform data (this is the benchmark network flywheel)

#### 4.4 Technical Implementation

- Store skills as JSONB in Supabase: `company_skills` table with `org_id`, `version`, `skill_data`, `created_at`
- Load skill into every AI prompt as system context
- Update skill via background job (Inngest) triggered by data changes
- Skill size management: keep under 4K tokens for prompt efficiency. Summarise rather than include raw data
- Governance: skill data is org-scoped. RLS ensures no cross-org leakage

#### 4.5 Advisor Skills (Phase 2)

Advisors who work with multiple companies develop their own skill layer:
- Preferred frameworks and methodologies
- Industry specialisation knowledge
- Reporting templates they favour
- Common recommendations they make

This makes advisor switching costs very high — their entire methodology is embedded in the platform.

### 4.6 SKILLS RUNDOWN — What You Need to Know Right Now

**What Skills Actually Are (Anthropic's Definition):**

Skills are folder-based packages containing a `SKILL.md` file (instructions in markdown), optional scripts (Python/JS/Bash), reference documents, and asset files (templates, schemas, data). They're uploaded to Claude.ai under Settings > Capabilities and trigger automatically when Claude detects a relevant task based on the skill's description.

Think of them as reusable instruction manuals that Claude loads on-demand. They sit between simple prompts (one-off) and full MCP integrations (external API connections).

**The Hierarchy:**
```
User Preferences → broad personal defaults ("I'm a developer, be concise")
Project Instructions → context for a body of work ("this is my SaaS build")
Skills → task-specific procedures ("generate our quarterly report using these exact formatting rules")
MCP → external tool connections ("access our Salesforce data")
```

**Do You Need to Say "Save as a Skill" Every Time?**

No — and here's the important distinction:

There are TWO different skill systems relevant to you:

**A) Claude.ai Skills (for YOU building the platform):**
These are skills you upload to Claude.ai to help Claude help YOU better. For example:
- A skill for "Advisory OS code review" that knows your stack, conventions, and patterns
- A skill for "Advisory OS competitive analysis" that follows your harsh, direct assessment style
- A skill for "Advisory OS financial modelling" that knows your KPI definitions and data structures

You create these ONCE, upload as a ZIP, and they auto-trigger when relevant. You do NOT need to say "save as a skill" during conversations. Instead, when you've landed on a repeatable workflow or knowledge set through our conversations, you should explicitly ask me to package it as a skill file for you to upload.

**When to create a Claude.ai skill from our work:**
- We've refined a process you'll repeat (e.g., competitor analysis framework, document formatting, spec writing)
- We've established domain knowledge that should persist (e.g., your colour system, your FP&A competitive audit findings)
- You find yourself re-explaining the same context across multiple conversations

**B) Platform Skills (the product feature for Advisory OS users):**
These are the auto-generated company skills described in sections 4.1-4.4 above — they're a PRODUCT FEATURE you're building into Advisory OS. Your platform generates and maintains these programmatically. Users never manually create them.

**What You Should Be Doing Right Now:**

1. **For Claude Code sessions:** The `CLAUDE.md` file IS your primary skill. It's loaded automatically every session. Keep it updated. That's your highest-leverage action.

2. **For Claude.ai (strategy/research sessions like this):** The Project context and memory system are doing most of the skill work already. Where you'd benefit from explicit skills is if you have very specific repeatable workflows — for example, a "process LinkedIn screenshots into competitor library" skill.

3. **For the platform build:** The Company Skills system (section 4.1-4.4) should be in the sprint plan. It's what makes the AI feel like it "knows" each business rather than being generic.

**Practical Next Steps for Skills:**
- I'll package the colour coding system, drill-down spec, and assumption management architecture as reference documents you can add to your Claude Code project's `docs/` folder — Claude Code reads these automatically
- If you want a Claude.ai skill for any of our recurring workflows, just say "package this as a skill" and I'll generate the ZIP-ready folder structure
- For the platform, Company Skills auto-generation should be part of Sprint D (it depends on onboarding data + Xero integration being complete first)

---

## BUILD PRIORITY ORDER

For the demo, here's what to build in order of impact:

### Sprint 0 (Foundation Primitives — MUST DO FIRST — 2 days)
0. **`<DrillableNumber />` component** — the universal number renderer with color coding, tooltips, click-to-drill
1. **`<DrillPanel />` component** — right slide-in panel for drill-down views with breadcrumbs
2. **`<AssumptionInput />` component** — blue editable cells with slider, +/-, justification prompt
3. **`<NumberLegend />` component** — collapsible color legend bar
4. **`assumptions` + `assumption_changes` + `output_assumption_dependencies` tables** — the dependency graph schema
5. **Assumptions Hub page** — dedicated page showing all assumptions with impact preview

### Sprint A (Highest Demo Impact — 3 days)
1. **Search bar working end-to-end** — this is the "wow" moment. Type any question, get an intelligent answer
2. **Graph generate button fixed** — click generate, get a chart from live data
3. **Dashboard widgets fully dynamic** — drag, resize, drill-down, cross-filter
4. **All 6 core dashboards populated** with sample data and working widgets

### Sprint B (Platform Differentiation — 3 days)
5. **Collaboration primitives built** — Share modal, comment panel, version history panel (as reusable components)
6. **Scenario builder with collaboration** — cell-level comments, justification capture on number changes, version control with Master version
7. **Activity feed** on dashboard

### Sprint C (Investor Portal — 4 days)
8. **Left nav: External Sharing section** with sub-categories
9. **Room Builder** — template selection (Light/Detailed), data source picker, permission controls, "View As" preview
10. **AI Readiness Check** — scan shared content, identify gaps, generate readiness score
11. **Investor experience** — branded landing, live dashboard rendering, Q&A, search
12. **Engagement analytics** — per-investor heatmap, time tracking, AI insights

### Sprint D (Skills & Polish — 2 days)
13. **Company skill auto-generation** from onboarding + Xero data
14. **Skill-aware AI responses** across search, commentary, scenarios
15. **Export system** — PDF, Excel, PPT for all shareable entities
16. **Notification system** — in-app bell with types

---

## KEY DATABASE TABLES TO CREATE

```sql
-- Collaboration primitives
CREATE TABLE shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organisations(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  shared_by UUID REFERENCES users(id),
  shared_with_user_id UUID REFERENCES users(id),
  shared_with_role TEXT,
  permission_level TEXT DEFAULT 'view' CHECK (permission_level IN ('view','comment','edit','co_own')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organisations(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  field_path TEXT, -- e.g., 'assumptions.revenue_growth' for cell-level
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES comments(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE entity_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organisations(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  version_label TEXT,
  created_by UUID REFERENCES users(id),
  snapshot_data JSONB NOT NULL,
  change_summary TEXT,
  is_master BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Investor Portal
CREATE TABLE investor_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organisations(id),
  name TEXT NOT NULL,
  template_type TEXT CHECK (template_type IN ('light','detailed','custom')),
  created_by UUID REFERENCES users(id),
  branding JSONB, -- logo, colours
  nda_required BOOLEAN DEFAULT false,
  nda_document_id UUID,
  access_expires_at TIMESTAMPTZ,
  readiness_score INTEGER,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE investor_room_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES investor_rooms(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  display_order INTEGER,
  permission_level TEXT DEFAULT 'view' CHECK (permission_level IN ('view','interactive','downloadable','hidden')),
  section TEXT -- 'overview', 'financials', 'scenarios', 'documents'
);

CREATE TABLE investor_room_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES investor_rooms(id),
  investor_email TEXT NOT NULL,
  investor_name TEXT,
  investor_type TEXT CHECK (investor_type IN ('angel','vc','pe','strategic','advisor','other')),
  access_token UUID DEFAULT gen_random_uuid(),
  nda_signed_at TIMESTAMPTZ,
  first_accessed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  access_revoked_at TIMESTAMPTZ,
  interest_level TEXT CHECK (interest_level IN ('watching','interested','active'))
);

CREATE TABLE investor_engagement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES investor_rooms(id),
  access_id UUID REFERENCES investor_room_access(id),
  event_type TEXT NOT NULL, -- 'page_view', 'document_view', 'scenario_interact', 'search', 'download', 'question', 'request'
  entity_type TEXT,
  entity_id UUID,
  duration_seconds INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE investor_qa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES investor_rooms(id),
  access_id UUID REFERENCES investor_room_access(id),
  question TEXT NOT NULL,
  answer TEXT,
  answered_by UUID REFERENCES users(id),
  answered_at TIMESTAMPTZ,
  linked_entity_type TEXT,
  linked_entity_id UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','answered','declined')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE investor_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES investor_rooms(id),
  access_id UUID REFERENCES investor_room_access(id),
  request_type TEXT CHECK (request_type IN ('document','data','meeting','other')),
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','fulfilled','declined')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Company Skills
CREATE TABLE company_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organisations(id) UNIQUE,
  version INTEGER DEFAULT 1,
  skill_data JSONB NOT NULL,
  last_updated_by TEXT DEFAULT 'system', -- 'system' or user_id
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Messages
CREATE TABLE external_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organisations(id),
  room_id UUID REFERENCES investor_rooms(id),
  sent_by UUID REFERENCES users(id),
  recipient_access_ids UUID[], -- can be bulk
  subject TEXT,
  body TEXT NOT NULL,
  template_used TEXT,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','read')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Assumptions & Dependencies (from Section 0)
CREATE TABLE assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organisations(id),
  scenario_id UUID,  -- NULL = base/default assumptions
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT,
  data_type TEXT DEFAULT 'percentage',
  source TEXT,
  source_detail TEXT,
  locked BOOLEAN DEFAULT false,
  locked_by UUID,
  locked_at TIMESTAMPTZ,
  min_value NUMERIC,
  max_value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID,
  UNIQUE(org_id, scenario_id, key)
);

CREATE TABLE assumption_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assumption_id UUID REFERENCES assumptions(id),
  old_value NUMERIC,
  new_value NUMERIC,
  justification TEXT,
  changed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE output_assumption_dependencies (
  output_entity_type TEXT NOT NULL,
  output_entity_id UUID NOT NULL,
  output_field TEXT NOT NULL,
  assumption_id UUID REFERENCES assumptions(id),
  dependency_type TEXT DEFAULT 'direct',
  PRIMARY KEY (output_entity_type, output_entity_id, output_field, assumption_id)
);
```

**RLS policies:** All tables scoped to org_id. Investor-facing tables additionally gated by access_token validation. Every table gets audit logging.

---

## TECHNICAL NOTES

### Reusable Components to Build

These are platform primitives, not one-off implementations:

**Data Primitives (Build FIRST — everything else depends on these):**
1. `<DrillableNumber />` — universal number renderer with color coding, hover tooltip, drill-down click handler
2. `<AssumptionInput />` — blue editable field with slider, +/-, justification prompt
3. `<DrillPanel />` — right slide-in panel for drill-down with breadcrumb navigation
4. `<NumberLegend />` — collapsible color legend bar
5. `<ImpactPreview />` — mini waterfall showing assumption change ripple effect
6. `<FormulaTooltip />` — hover component showing calculation formula + source
7. `<SourceBadge />` — small badge: "Xero" / "Manual" / "AI" / "Calculated"
8. `<VarianceIndicator />` — arrow + percentage showing change vs prior period

**Collaboration Primitives:**
9. `<ShareModal />` — universal share dialog, accepts entity_type + entity_id
10. `<CommentPanel />` — slide-in panel, accepts entity_type + entity_id + optional field_path
11. `<VersionHistory />` — timeline panel, accepts entity_type + entity_id
12. `<ActivityFeed />` — filterable feed, accepts scope (entity or org)

**Module Components:**
13. `<CommandPalette />` — the search bar (Cmd+K / Ctrl+K trigger)
14. `<ChartBuilder />` — the generate graph flow
15. `<WidgetGrid />` — drag-and-drop dashboard layout engine
16. `<InvestorRoomBuilder />` — multi-step room creation wizard
17. `<EngagementHeatmap />` — reusable engagement visualization
18. `<ReadinessScoreCard />` — AI readiness assessment display

### AI Integration Points

Every AI call must include:
1. Company skill (loaded from `company_skills` table)
2. Current user role and permissions
3. Relevant data context (the specific metrics/entities being discussed)
4. Response format instruction (chart config, narrative, structured data, navigation)

---

*This document is the single source of truth for the demo sprint. Merge into CLAUDE.md before next Claude Code session. Contradicts earlier phasing decisions — these features are now priority, not Phase 2.*
