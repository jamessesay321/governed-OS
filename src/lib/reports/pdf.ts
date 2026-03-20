import type { Report, ReportSection } from '@/types/reports';
import { getThemeById, generateThemeCSS, type ReportTheme } from './themes';

/**
 * Generate print-friendly HTML for a report.
 * Uses @media print CSS for professional board-room quality output.
 * Users can print to PDF from the browser.
 * Supports 7 theme presets (Corporate Blue, Forest, Midnight, Sunset, Ocean, Slate, Minimal).
 */
export function generatePrintableHTML(report: Report, orgName: string, themeId?: string): string {
  const theme = getThemeById(themeId ?? 'corporate-blue');
  const themeCSS = generateThemeCSS(theme);
  const sections = report.sections
    .sort((a, b) => a.order - b.order)
    .map((section, index) => renderSection(section, index + 1))
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(report.title)}</title>
  <style>
    ${PRINT_STYLES}
    /* Theme: ${theme.name} */
    ${themeCSS}
  </style>
</head>
<body>
  <div class="report">
    <!-- Cover Page -->
    <div class="cover-page">
      <div class="cover-brand">
        <div class="cover-logo">${escapeHtml(orgName.charAt(0))}</div>
        <h1 class="cover-org">${escapeHtml(orgName)}</h1>
      </div>
      <h2 class="cover-title">${escapeHtml(report.title)}</h2>
      <div class="cover-meta">
        <p>Period: ${escapeHtml(report.period_start)} to ${escapeHtml(report.period_end)}</p>
        <p>Status: ${escapeHtml(report.status.toUpperCase())}</p>
        <p>Generated: ${new Date(report.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
      <div class="cover-footer">
        <p class="confidential">CONFIDENTIAL</p>
      </div>
    </div>

    <!-- Table of Contents -->
    <div class="toc page-break">
      <h2>Contents</h2>
      <ol class="toc-list">
        ${report.sections
          .sort((a, b) => a.order - b.order)
          .map(
            (s, i) =>
              `<li><span class="toc-title">${escapeHtml(s.title)}</span><span class="toc-dots"></span><span class="toc-page">${i + 1}</span></li>`
          )
          .join('')}
      </ol>
    </div>

    <!-- Report Sections -->
    ${sections}

    <!-- Footer -->
    <div class="report-footer">
      <p>${escapeHtml(orgName)} &mdash; ${escapeHtml(report.title)}</p>
      <p class="confidential">CONFIDENTIAL &mdash; For intended recipients only</p>
    </div>
  </div>
</body>
</html>`;
}

function renderSection(section: ReportSection, sectionNumber: number): string {
  const dataContent = renderSectionData(section);

  return `
    <div class="section page-break">
      <div class="section-header">
        <span class="section-number">${sectionNumber}</span>
        <h2 class="section-title">${escapeHtml(section.title)}</h2>
      </div>
      ${section.commentary ? `<div class="commentary"><p>${escapeHtml(section.commentary)}</p></div>` : ''}
      ${dataContent}
    </div>`;
}

function renderSectionData(section: ReportSection): string {
  const data = section.data;

  switch (section.type) {
    case 'kpi_summary':
      return renderKPIGrid(data);
    case 'pnl':
      return renderPnLTable(data);
    case 'cash_flow':
      return renderCashFlow(data);
    case 'variance':
      return renderVariance(data);
    case 'scenarios':
      return renderScenarios(data);
    case 'intelligence':
      return renderIntelligence(data);
    case 'action_items':
      return renderActionItems(data);
    default:
      return renderGenericData(data);
  }
}

function renderKPIGrid(data: Record<string, unknown>): string {
  const kpis = (data.kpis as Array<Record<string, unknown>>) || [];
  if (kpis.length === 0) return '<p class="empty">No KPI data available for this period.</p>';

  const cards = kpis
    .map(
      (kpi) => `
      <div class="kpi-card">
        <div class="kpi-label">${escapeHtml(String(kpi.type || ''))}</div>
        <div class="kpi-value">${formatNumber(kpi.value as number)}</div>
        <div class="kpi-trend ${kpi.trend === 'up' ? 'trend-up' : kpi.trend === 'down' ? 'trend-down' : 'trend-flat'}">
          ${kpi.trend === 'up' ? '&#9650;' : kpi.trend === 'down' ? '&#9660;' : '&#9644;'} ${(kpi.trendPct as number)?.toFixed(1) ?? '0.0'}%
        </div>
        ${kpi.benchmark ? `<div class="kpi-benchmark">Benchmark: ${formatNumber(kpi.benchmark as number)}</div>` : ''}
      </div>`
    )
    .join('');

  return `<div class="kpi-grid">${cards}</div>`;
}

function renderPnLTable(data: Record<string, unknown>): string {
  const periods = (data.periods as Array<Record<string, unknown>>) || [];
  if (periods.length === 0) return '<p class="empty">No P&amp;L data available.</p>';

  const latest = periods[0];
  const pnlSections = (latest.sections as Array<Record<string, unknown>>) || [];

  let rows = '';
  for (const section of pnlSections) {
    rows += `<tr class="section-row"><td colspan="2"><strong>${escapeHtml(String(section.label || ''))}</strong></td></tr>`;
    const sectionRows = (section.rows as Array<Record<string, unknown>>) || [];
    for (const row of sectionRows) {
      rows += `<tr><td class="indent">${escapeHtml(String(row.name || ''))}</td><td class="amount">${formatCurrency(row.amount as number)}</td></tr>`;
    }
    rows += `<tr class="total-row"><td>Total ${escapeHtml(String(section.label || ''))}</td><td class="amount">${formatCurrency(section.total as number)}</td></tr>`;
  }

  rows += `
    <tr class="summary-row"><td><strong>Gross Profit</strong></td><td class="amount"><strong>${formatCurrency(latest.grossProfit as number)}</strong></td></tr>
    <tr class="summary-row highlight"><td><strong>Net Profit</strong></td><td class="amount"><strong>${formatCurrency(latest.netProfit as number)}</strong></td></tr>`;

  return `
    <table class="data-table">
      <thead><tr><th>Account</th><th class="amount">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderCashFlow(data: Record<string, unknown>): string {
  const items: string[] = [];
  if (data.closingCash != null) items.push(`<div class="kpi-card"><div class="kpi-label">Closing Cash</div><div class="kpi-value">${formatCurrency(data.closingCash as number)}</div></div>`);
  if (data.burnRate != null) items.push(`<div class="kpi-card"><div class="kpi-label">Monthly Burn Rate</div><div class="kpi-value">${formatCurrency(data.burnRate as number)}</div></div>`);
  if (data.runwayMonths != null) items.push(`<div class="kpi-card"><div class="kpi-label">Runway</div><div class="kpi-value">${(data.runwayMonths as number).toFixed(1)} months</div></div>`);

  if (items.length === 0) return '<p class="empty">No cash flow data available.</p>';
  return `<div class="kpi-grid">${items.join('')}</div>`;
}

function renderVariance(data: Record<string, unknown>): string {
  const variances = (data.variances as Array<Record<string, unknown>>) || [];
  if (variances.length === 0) return '<p class="empty">No variance data available.</p>';

  let rows = variances
    .map(
      (v) =>
        `<tr><td>${escapeHtml(String(v.period || ''))}</td><td class="amount">${formatCurrency(v.revenue as number)}</td><td class="amount">${formatCurrency(v.netProfit as number)}</td></tr>`
    )
    .join('');

  return `
    <table class="data-table">
      <thead><tr><th>Period</th><th class="amount">Revenue</th><th class="amount">Net Profit</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderScenarios(data: Record<string, unknown>): string {
  const scenarios = (data.scenarios as Array<Record<string, unknown>>) || [];
  if (scenarios.length === 0) return '<p class="empty">No active scenarios.</p>';

  const cards = scenarios
    .map(
      (s) => `
      <div class="scenario-card">
        <div class="scenario-name">${escapeHtml(String(s.name || ''))}</div>
        <div class="scenario-status">${escapeHtml(String(s.status || ''))}</div>
        <div class="scenario-desc">${escapeHtml(String(s.description || ''))}</div>
      </div>`
    )
    .join('');

  return `<div class="scenario-grid">${cards}</div>`;
}

function renderIntelligence(data: Record<string, unknown>): string {
  const impacts = (data.impacts as Array<Record<string, unknown>>) || [];
  if (impacts.length === 0) return '<p class="empty">No recent intelligence events.</p>';

  const items = impacts
    .map(
      (i) => `
      <div class="intel-item">
        <div class="intel-header">
          <span class="intel-title">${escapeHtml(String(i.eventTitle || ''))}</span>
          <span class="intel-badge ${i.impactType === 'positive' ? 'badge-positive' : i.impactType === 'negative' ? 'badge-negative' : 'badge-neutral'}">${escapeHtml(String(i.impactType || ''))}</span>
        </div>
        <p class="intel-narrative">${escapeHtml(String(i.narrative || ''))}</p>
        <div class="intel-meta">Relevance: ${((i.relevanceScore as number) * 100).toFixed(0)}%</div>
      </div>`
    )
    .join('');

  return `<div class="intel-list">${items}</div>`;
}

function renderActionItems(data: Record<string, unknown>): string {
  const items = (data.items as Array<Record<string, unknown>>) || [];
  if (items.length === 0) {
    return `<p class="empty">${escapeHtml(String(data.note || 'No action items.'))}</p>`;
  }

  const list = items
    .map((item) => `<li>${escapeHtml(String(item.title || item.description || ''))}</li>`)
    .join('');

  return `<ol class="action-list">${list}</ol>`;
}

function renderGenericData(data: Record<string, unknown>): string {
  if (Object.keys(data).length === 0) return '';
  return `<pre class="generic-data">${escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
}

// === Utility functions ===

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const PRINT_STYLES = `
  /* Reset & Base */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #1a1a2e;
    background: #fff;
  }
  .report { max-width: 210mm; margin: 0 auto; }

  /* Cover Page */
  .cover-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 60px 40px;
  }
  .cover-brand { margin-bottom: 60px; }
  .cover-logo {
    width: 80px; height: 80px;
    border-radius: 16px;
    background: #1a1a2e;
    color: #fff;
    font-size: 36px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
  }
  .cover-org { font-size: 28pt; font-weight: 300; color: #1a1a2e; }
  .cover-title {
    font-size: 20pt;
    font-weight: 600;
    color: #2d3748;
    margin-bottom: 40px;
    border-top: 2px solid #1a1a2e;
    border-bottom: 2px solid #1a1a2e;
    padding: 20px 0;
  }
  .cover-meta { color: #4a5568; font-size: 11pt; line-height: 2; }
  .cover-footer { margin-top: auto; }
  .confidential {
    font-size: 9pt;
    color: #e53e3e;
    letter-spacing: 2px;
    font-weight: 600;
    text-transform: uppercase;
  }

  /* Table of Contents */
  .toc { padding: 60px 40px; }
  .toc h2 { font-size: 18pt; margin-bottom: 30px; color: #1a1a2e; border-bottom: 2px solid #1a1a2e; padding-bottom: 8px; }
  .toc-list { list-style: none; padding: 0; }
  .toc-list li {
    display: flex;
    align-items: baseline;
    padding: 8px 0;
    font-size: 12pt;
    border-bottom: 1px solid #edf2f7;
  }
  .toc-title { flex-shrink: 0; }
  .toc-dots { flex: 1; border-bottom: 1px dotted #cbd5e0; margin: 0 8px; min-width: 20px; }
  .toc-page { flex-shrink: 0; font-weight: 600; }

  /* Sections */
  .section { padding: 40px; }
  .section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
    border-bottom: 2px solid #1a1a2e;
    padding-bottom: 12px;
  }
  .section-number {
    width: 32px; height: 32px;
    background: #1a1a2e;
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
    flex-shrink: 0;
  }
  .section-title { font-size: 16pt; font-weight: 600; color: #1a1a2e; }

  /* Commentary */
  .commentary {
    background: #f7fafc;
    border-left: 4px solid #3182ce;
    padding: 16px 20px;
    margin-bottom: 24px;
    border-radius: 0 4px 4px 0;
  }
  .commentary p { color: #2d3748; font-size: 10.5pt; line-height: 1.6; }

  /* KPI Grid */
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .kpi-card {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
  }
  .kpi-label { font-size: 9pt; text-transform: uppercase; letter-spacing: 1px; color: #718096; margin-bottom: 4px; }
  .kpi-value { font-size: 22pt; font-weight: 700; color: #1a1a2e; }
  .kpi-trend { font-size: 10pt; margin-top: 4px; }
  .trend-up { color: #38a169; }
  .trend-down { color: #e53e3e; }
  .trend-flat { color: #718096; }
  .kpi-benchmark { font-size: 9pt; color: #a0aec0; margin-top: 4px; }

  /* Data Tables */
  .data-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .data-table th {
    background: #1a1a2e;
    color: #fff;
    padding: 10px 16px;
    text-align: left;
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .data-table td { padding: 8px 16px; border-bottom: 1px solid #edf2f7; font-size: 10pt; }
  .data-table .amount { text-align: right; font-variant-numeric: tabular-nums; }
  .data-table th.amount { text-align: right; }
  .data-table .indent { padding-left: 32px; }
  .section-row td { background: #f7fafc; font-size: 10pt; }
  .total-row td { border-top: 1px solid #cbd5e0; font-weight: 600; }
  .summary-row td { border-top: 2px solid #1a1a2e; }
  .summary-row.highlight td { background: #f7fafc; }

  /* Scenarios */
  .scenario-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .scenario-card {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px;
  }
  .scenario-name { font-weight: 600; font-size: 12pt; }
  .scenario-status {
    display: inline-block;
    font-size: 9pt;
    text-transform: uppercase;
    background: #edf2f7;
    padding: 2px 8px;
    border-radius: 4px;
    margin: 4px 0;
  }
  .scenario-desc { font-size: 10pt; color: #4a5568; margin-top: 8px; }

  /* Intelligence */
  .intel-list { display: flex; flex-direction: column; gap: 12px; }
  .intel-item { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
  .intel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .intel-title { font-weight: 600; }
  .intel-badge {
    font-size: 9pt;
    padding: 2px 8px;
    border-radius: 4px;
    text-transform: uppercase;
    font-weight: 600;
  }
  .badge-positive { background: #c6f6d5; color: #22543d; }
  .badge-negative { background: #fed7d7; color: #742a2a; }
  .badge-neutral { background: #e2e8f0; color: #4a5568; }
  .intel-narrative { font-size: 10pt; color: #4a5568; }
  .intel-meta { font-size: 9pt; color: #a0aec0; margin-top: 8px; }

  /* Action Items */
  .action-list { padding-left: 24px; }
  .action-list li { margin-bottom: 8px; font-size: 10.5pt; }

  /* Empty States */
  .empty { color: #a0aec0; font-style: italic; padding: 20px 0; }

  /* Generic Data */
  .generic-data { font-size: 9pt; background: #f7fafc; padding: 16px; border-radius: 4px; overflow: auto; }

  /* Footer */
  .report-footer {
    text-align: center;
    padding: 40px;
    color: #a0aec0;
    font-size: 9pt;
    border-top: 1px solid #edf2f7;
  }

  /* Print Styles */
  .page-break { page-break-before: always; }

  @media print {
    body { font-size: 10pt; }
    .report { max-width: 100%; }
    .cover-page { min-height: 100vh; }
    .page-break { page-break-before: always; }
    .section { page-break-inside: avoid; }
    .data-table { page-break-inside: auto; }
    .data-table tr { page-break-inside: avoid; }
    .commentary { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .kpi-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .data-table th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .section-number { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .cover-logo { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }

  @page {
    margin: 15mm;
    size: A4;
    @bottom-center {
      content: counter(page);
      font-size: 9pt;
      color: #a0aec0;
    }
  }
`;
