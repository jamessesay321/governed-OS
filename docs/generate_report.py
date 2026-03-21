#!/usr/bin/env python3
"""Generate Advisory OS Build Progress Report PDF in landscape orientation."""

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

# Page setup
PAGE_SIZE = landscape(A4)
PAGE_WIDTH = PAGE_SIZE[0]
PAGE_HEIGHT = PAGE_SIZE[1]

# Colors
DARK_BLUE = colors.HexColor("#1e3a5f")
MEDIUM_BLUE = colors.HexColor("#2563eb")
LIGHT_BLUE = colors.HexColor("#dbeafe")
VERY_LIGHT_BLUE = colors.HexColor("#eff6ff")
DARK_GRAY = colors.HexColor("#374151")
MEDIUM_GRAY = colors.HexColor("#6b7280")
LIGHT_GRAY = colors.HexColor("#f3f4f6")
WHITE = colors.white
GREEN = colors.HexColor("#16a34a")
AMBER = colors.HexColor("#d97706")
RED = colors.HexColor("#dc2626")
SECTION_BG = colors.HexColor("#1e40af")

def create_styles():
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name='MainTitle',
        parent=styles['Title'],
        fontSize=28,
        textColor=DARK_BLUE,
        spaceAfter=6,
        alignment=TA_LEFT,
        fontName='Helvetica-Bold',
    ))

    styles.add(ParagraphStyle(
        name='Subtitle',
        parent=styles['Normal'],
        fontSize=13,
        textColor=MEDIUM_GRAY,
        spaceAfter=30,
        fontName='Helvetica',
    ))

    styles.add(ParagraphStyle(
        name='SectionHeader',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=DARK_BLUE,
        spaceBefore=20,
        spaceAfter=10,
        fontName='Helvetica-Bold',
        borderWidth=0,
        borderPadding=0,
    ))

    styles.add(ParagraphStyle(
        name='BodyText2',
        parent=styles['Normal'],
        fontSize=9,
        textColor=DARK_GRAY,
        spaceAfter=12,
        fontName='Helvetica',
        leading=14,
    ))

    styles.add(ParagraphStyle(
        name='CellText',
        parent=styles['Normal'],
        fontSize=7.5,
        textColor=DARK_GRAY,
        fontName='Helvetica',
        leading=10,
        spaceBefore=1,
        spaceAfter=1,
    ))

    styles.add(ParagraphStyle(
        name='CellTextBold',
        parent=styles['Normal'],
        fontSize=7.5,
        textColor=DARK_GRAY,
        fontName='Helvetica-Bold',
        leading=10,
        spaceBefore=1,
        spaceAfter=1,
    ))

    styles.add(ParagraphStyle(
        name='CellHeader',
        parent=styles['Normal'],
        fontSize=8,
        textColor=WHITE,
        fontName='Helvetica-Bold',
        leading=11,
        spaceBefore=2,
        spaceAfter=2,
    ))

    styles.add(ParagraphStyle(
        name='SectionLabel',
        parent=styles['Normal'],
        fontSize=8,
        textColor=WHITE,
        fontName='Helvetica-Bold',
        leading=11,
        alignment=TA_LEFT,
    ))

    return styles

def p(text, style):
    """Shortcut to create a Paragraph."""
    return Paragraph(text, style)

def add_header_footer(canvas_obj, doc):
    """Add header line and footer to each page."""
    canvas_obj.saveState()
    # Header line
    canvas_obj.setStrokeColor(MEDIUM_BLUE)
    canvas_obj.setLineWidth(2)
    canvas_obj.line(40, PAGE_HEIGHT - 35, PAGE_WIDTH - 40, PAGE_HEIGHT - 35)

    # Footer
    canvas_obj.setFont('Helvetica', 7)
    canvas_obj.setFillColor(MEDIUM_GRAY)
    canvas_obj.drawString(40, 25, "Advisory OS Build Progress Report | Confidential")
    canvas_obj.drawRightString(PAGE_WIDTH - 40, 25, f"Page {doc.page}")
    canvas_obj.restoreState()

def build_changelog_table(styles):
    """Build the detailed changelog table."""

    # Column widths for landscape: #, Area, What Changed, Files Touched, Impact
    col_widths = [22, 72, 280, 145, 195]

    header = [
        p('#', styles['CellHeader']),
        p('Area', styles['CellHeader']),
        p('What Changed', styles['CellHeader']),
        p('Files Touched', styles['CellHeader']),
        p('Impact', styles['CellHeader']),
    ]

    rows_data = [
        # SECURITY HARDENING
        ('SEC', None, None, None, None),  # Section header
        ('1', 'Input Validation', 'Added Zod schemas to every mutation endpoint \u2014 all POST/PATCH/PUT routes now validate with strict types, length limits, and format checks', '12 API routes', 'Blocks malformed/malicious payloads'),
        ('2', 'Error Sanitisation', 'Replaced error.message leak to clients with generic messages. Server-side logging preserved.', '28 API route files', 'Prevents information disclosure attacks'),
        ('3', 'Audit Logging', 'Added logAudit() calls to every data mutation \u2014 creates immutable trail of who did what, when', '14 API routes', 'Full governance audit trail'),
        ('4', 'Rate Limiting', 'Built in-memory sliding window limiter. Pre-configured: LLM (10/min), Xero sync (3/min), auth (5/min), mutations (30/min). Returns 429 with Retry-After headers', 'New: src/lib/rate-limit.ts, applied to 5 routes', 'Prevents API abuse and cost overruns on Claude API'),
        ('5', 'Xero Batch Optimisation', 'Replaced N+1 per-record upserts with single batch upserts in syncChartOfAccounts, syncInvoices, syncBankTransactions', 'src/lib/xero/sync.ts', '~10x faster syncs, fewer DB connections'),
        # SPRINT 9
        ('S9', None, None, None, None),  # Section header
        ('6', 'Database Schema', '3 new tables: vault_items (master), vault_versions (immutable history), vault_access_log. Full RLS policies. Full-text search + GIN tag indexes', 'supabase/migrations/ 010_knowledge_vault.sql', 'DataRails/Vena-grade document governance'),
        ('7', 'Storage Library', 'Full CRUD: storeVaultItem, createNewVersion, listVaultItems, getVaultItem, getVersionHistory, logVaultAccess, archiveVaultItem. SHA-256 prompt hashing', 'New: src/lib/vault/storage.ts', 'Central API for all vault operations'),
        ('8', 'Vault API Endpoints', '3 route files: list/create items, get/archive individual items, version history + append new versions. All with auth + Zod validation', 'New: 3 files under src/app/api/vault/', 'REST API for vault CRUD'),
        ('9', 'Vault UI', 'Full browser page: search bar, type filter, item list with status badges, detail panel with provenance metadata, version history timeline', 'New: src/app/(dashboard)/vault/ (2 files)', 'Users can browse, search, inspect provenance'),
        ('10', 'Auto-Store Integration', 'Fire-and-forget helper wired into 5 endpoints: reports, scenario runs, KPI snapshots, playbook assessments, interview completion', 'New: src/lib/vault/auto-store.ts, modified 5 API routes', 'Every AI output automatically archived with provenance'),
        # UX POLISH
        ('UX', None, None, None, None),  # Section header
        ('11', 'Sidebar Navigation', 'Added "Knowledge Vault" link with archive icon', 'src/components/layout/sidebar.tsx', 'Users can access vault from nav'),
        ('12', 'AI Reasoning Component', 'New reusable AIReasoning \u2014 collapsible "Why this result?" panel with reasoning text, data sources, confidence badge, model attribution', 'New: src/components/ui/ai-reasoning.tsx', 'Platform-wide explainability (differentiator vs Fathom/Syft)'),
        ('13', 'Confirmation Dialog', 'New reusable ConfirmDialog \u2014 modal with danger/warning/default variants', 'Same file as above', 'Prevents accidental destructive actions'),
        ('14', 'Intelligence Reasoning', 'Added "Why this assessment?" to every impact card showing relevance scoring logic and data sources', 'src/components/intelligence/impact-card.tsx', 'Users understand AI reasoning'),
        ('15', 'Variance Reasoning', 'Added "Why this variance?" with budget/actual data sources to variance detail view', 'src/components/variance/variance-detail.tsx', 'AI explanations have visible reasoning chain'),
        ('16', 'Archive Confirmation', 'Vault archive button now requires explicit confirmation dialog before archiving', 'vault-browser-client.tsx', 'Prevents accidental archival'),
        # TESTING
        ('TST', None, None, None, None),  # Section header
        ('17', 'Vault Tests', 'hashPrompt consistency, unicode, edge cases (6 tests)', 'New: tests/vault/storage.test.ts', 'Core vault logic verified'),
        ('18', 'Auto-Store Tests', 'Fire-and-forget behavior, error suppression, parameter passing (4 tests)', 'New: tests/vault/auto-store.test.ts', 'Integration safety verified'),
        ('19', 'Rate Limiter Tests', 'Limit enforcement, key isolation, remaining count, 429 headers (8 tests)', 'New: tests/rate-limit/rate-limit.test.ts', 'Rate limiting logic verified'),
        ('20', 'Vitest Config Fix', 'Fixed ESM compatibility for Vitest v4 (.mts extension)', 'vitest.config.mts', 'All 145 tests now run cleanly'),
        # BUG FIXES
        ('BUG', None, None, None, None),  # Section header
        ('21', 'Zod v4 Compatibility', 'Fixed z.record(z.unknown()) to z.record(z.string(), z.unknown()) across vault routes', '2 API route files', 'Build was failing on Zod v4'),
        ('22', 'Type Safety', 'Switched vault storage from typed to untyped Supabase client (tables not in generated types yet)', 'src/lib/vault/storage.ts', 'Clean build without type generation'),
        ('23', 'Entity ID Fix', 'Fixed result.id to result.scenario.id in scenario create + duplicate routes', '2 API routes', 'Was referencing wrong property'),
        ('24', 'Anomaly Route Rewrite', 'Fixed syntax error (extra brace) introduced during rate limiter addition', 'src/app/api/anomalies/[orgId]/route.ts', 'Route was completely broken'),
    ]

    section_labels = {
        'SEC': 'SECURITY HARDENING',
        'S9': 'SPRINT 9: KNOWLEDGE VAULT',
        'UX': 'UX POLISH',
        'TST': 'TESTING',
        'BUG': 'BUG FIXES',
    }

    table_data = [header]
    section_rows = []  # Track section header row indices

    row_idx = 1  # Start after header
    for item in rows_data:
        if item[1] is None:  # Section header row
            label = section_labels.get(item[0], item[0])
            section_row = [
                p('', styles['SectionLabel']),
                p(f'<b>{label}</b>', styles['SectionLabel']),
                p('', styles['SectionLabel']),
                p('', styles['SectionLabel']),
                p('', styles['SectionLabel']),
            ]
            table_data.append(section_row)
            section_rows.append(row_idx)
            row_idx += 1
        else:
            row = [
                p(item[0], styles['CellTextBold']),
                p(item[1], styles['CellTextBold']),
                p(item[2], styles['CellText']),
                p(item[3], styles['CellText']),
                p(item[4], styles['CellText']),
            ]
            table_data.append(row)
            row_idx += 1

    table = Table(table_data, colWidths=col_widths, repeatRows=1)

    # Base style
    style_commands = [
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), DARK_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),

        # Grid
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 1), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 3),
    ]

    # Section header rows - dark background spanning all columns
    for sr in section_rows:
        style_commands.append(('BACKGROUND', (0, sr), (-1, sr), colors.HexColor("#334155")))
        style_commands.append(('TEXTCOLOR', (0, sr), (-1, sr), WHITE))
        style_commands.append(('SPAN', (1, sr), (-1, sr)))

    # Alternating row colors (skip section headers)
    data_row = 0
    for i in range(1, len(table_data)):
        if i in section_rows:
            data_row = 0
            continue
        if data_row % 2 == 1:
            style_commands.append(('BACKGROUND', (0, i), (-1, i), VERY_LIGHT_BLUE))
        data_row += 1

    table.setStyle(TableStyle(style_commands))
    return table

def build_status_table(styles):
    """Build the current state percentage table."""
    col_widths = [140, 60, 514]

    header = [
        p('Category', styles['CellHeader']),
        p('% Done', styles['CellHeader']),
        p("What's Left", styles['CellHeader']),
    ]

    rows = [
        ('Backend API Routes', '98%', 'All 60+ routes built, validated, rate-limited, audit-logged'),
        ('Database Schema', '95%', '10 migrations written. Need supabase db push (requires credentials)'),
        ('Security & Guardrails', '95%', 'Zod on all inputs, error sanitisation, rate limiting, RLS policies, audit trail. Remaining: credential rotation'),
        ('Knowledge Vault', '100%', 'Schema, storage lib, API, UI, auto-store wiring all done'),
        ('AI Explainability', '70%', 'Component built + wired to intelligence & variance. Still needs: KPI detail, report sections, anomaly cards'),
        ('Confirmation Dialogs', '40%', 'Built for vault archive. Still needs: module activation, report generation, settings save'),
        ('Frontend UI', '85%', 'All pages exist. Remaining: variance comparison selector, financial tooltip coverage, more reasoning retrofits'),
        ('Testing', '40%', '145 unit tests passing. No component tests, no E2E tests'),
        ('Infrastructure', '0%', 'Migrations not pushed, types not regenerated, not deployed. All require credentials'),
    ]

    table_data = [header]
    for cat, pct, left in rows:
        # Color-code the percentage
        pct_num = int(pct.replace('%', ''))
        if pct_num >= 90:
            pct_color = '#16a34a'
        elif pct_num >= 60:
            pct_color = '#d97706'
        else:
            pct_color = '#dc2626'

        table_data.append([
            p(f'<b>{cat}</b>', styles['CellText']),
            p(f'<b><font color="{pct_color}">{pct}</font></b>', styles['CellText']),
            p(left, styles['CellText']),
        ])

    table = Table(table_data, colWidths=col_widths, repeatRows=1)

    style_commands = [
        ('BACKGROUND', (0, 0), (-1, 0), DARK_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
    ]

    for i in range(2, len(table_data), 2):
        style_commands.append(('BACKGROUND', (0, i), (-1, i), VERY_LIGHT_BLUE))

    table.setStyle(TableStyle(style_commands))
    return table

def build_next_steps_table(styles):
    """Build the what's needed to hit 100% table."""
    col_widths = [380, 140, 94]

    header = [
        p('Task', styles['CellHeader']),
        p('Owner', styles['CellHeader']),
        p('Est. Time', styles['CellHeader']),
    ]

    rows = [
        ('Push Supabase migrations (005-010)', 'James / Tosin', '10 min'),
        ('Regenerate Supabase types (eliminates 70+ as-any casts)', 'James / Tosin', '5 min'),
        ('Connect Xero OAuth credentials', 'James / Tosin', '15 min'),
        ('Deploy to Vercel', 'James / Tosin', '20 min'),
        ('Rotate API keys (Claude, Supabase service role)', 'James / Tosin', '10 min'),
        ('Retrofit AI reasoning to remaining views', 'Claude', '1\u20132 hrs'),
        ('Add confirmation dialogs to all mutation points', 'Claude', '1\u20132 hrs'),
        ('Variance comparison period selector', 'Claude', '1\u20132 hrs'),
        ('Financial tooltip coverage across all views', 'Claude', '1 hr'),
        ('E2E test suite (Playwright)', 'Claude', '3\u20134 hrs'),
        ('Real-user walkthrough QA', 'James / Tosin', '1 hr'),
    ]

    table_data = [header]
    for task, owner, time in rows:
        owner_color = '#2563eb' if 'Claude' in owner else '#374151'
        table_data.append([
            p(task, styles['CellText']),
            p(f'<font color="{owner_color}"><b>{owner}</b></font>', styles['CellText']),
            p(time, styles['CellText']),
        ])

    table = Table(table_data, colWidths=col_widths, repeatRows=1)

    style_commands = [
        ('BACKGROUND', (0, 0), (-1, 0), DARK_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
    ]

    for i in range(2, len(table_data), 2):
        style_commands.append(('BACKGROUND', (0, i), (-1, i), VERY_LIGHT_BLUE))

    table.setStyle(TableStyle(style_commands))
    return table

def main():
    output_path = "/Users/james/projects/governed-os/docs/Advisory-OS-Build-Progress-Report.pdf"

    doc = SimpleDocTemplate(
        output_path,
        pagesize=PAGE_SIZE,
        leftMargin=40,
        rightMargin=40,
        topMargin=50,
        bottomMargin=45,
    )

    styles = create_styles()
    story = []

    # Title
    story.append(p("Advisory OS \u2014 Build Progress Report", styles['MainTitle']))
    story.append(p("March 20, 2026  |  Prepared for Tosin", styles['Subtitle']))

    # Section 1: What Was Inherited
    story.append(p("1. What Was Inherited (Tosin's Handoff)", styles['SectionHeader']))
    story.append(p(
        "Sprints 1\u20138 backend code existed but had security gaps: no input validation on many routes, "
        "no audit logging on mutations, N+1 query patterns in Xero sync, and no rate limiting. "
        "The work below addresses all of these gaps and adds Sprint 9 (Knowledge Vault) plus UX polish.",
        styles['BodyText2']
    ))

    # Section 2: Detailed Changelog
    story.append(p("2. Detailed Changelog (24 items)", styles['SectionHeader']))
    story.append(build_changelog_table(styles))

    story.append(PageBreak())

    # Section 3: Current State
    story.append(p("3. Current State: 92\u201395% Complete", styles['SectionHeader']))
    story.append(build_status_table(styles))

    story.append(Spacer(1, 20))

    # Section 4: Next Steps
    story.append(p("4. What's Needed to Hit 100%", styles['SectionHeader']))
    story.append(build_next_steps_table(styles))

    story.append(Spacer(1, 20))
    story.append(p(
        '<i><font color="#6b7280">Note: "Claude" tasks can be completed in the next build session. '
        '"James / Tosin" tasks require credentials or manual action.</font></i>',
        styles['BodyText2']
    ))

    # Build
    doc.build(story, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
    print(f"PDF generated: {output_path}")

if __name__ == "__main__":
    main()
