/**
 * Parse Xero's Reports/ProfitAndLoss API response into structured totals.
 * DETERMINISTIC — pure function, no side effects.
 *
 * Xero P&L report structure:
 * Reports[0].Rows[] → each Row has RowType ('Header'|'Section'|'SummaryRow')
 * Sections have Title (e.g. 'Income', 'Cost of Sales', 'Operating Expenses')
 * Section.Rows[] → Row.Cells[0] = account name, Cells[0].Attributes has account code
 * Section.Rows[] → Row.Cells[1].Value = amount for the period
 */

export interface XeroPnLTotals {
  /** Per-account totals keyed by Xero account ID (NOT code) */
  byAccountId: Map<string, number>;
  /** Per-account totals keyed by account code */
  byAccountCode: Map<string, number>;
  totalRevenue: number;
  totalCostOfSales: number;
  totalExpenses: number;
  netProfit: number;
}

interface ReportCell {
  Value: string;
  Attributes?: Array<{ Id: string; Value: string }>;
}

interface ReportRow {
  RowType: string;
  Cells?: ReportCell[];
  Rows?: ReportRow[];
  Title?: string;
}

interface XeroReport {
  Rows?: ReportRow[];
}

const REVENUE_TITLES = ['income', 'revenue', 'trading income'];
const COGS_TITLES = ['cost of sales', 'direct costs', 'cost of goods sold', 'purchases', 'less cost of sales'];
const EXPENSE_TITLES = [
  'operating expenses',
  'expenses',
  'overheads',
  'administrative expenses',
  'other expenses',
  'less operating expenses',
];

/**
 * Match a section title against candidates.
 * Checks COGS first (most specific) to avoid false positives like "Cost of Sales" matching "sales".
 */
function classifySection(title: string): 'revenue' | 'cogs' | 'expense' | 'unknown' {
  const lower = title.toLowerCase().trim();

  // Check COGS first — "Cost of Sales" would falsely match revenue "sales" otherwise
  if (COGS_TITLES.some((c) => lower.includes(c))) return 'cogs';
  if (EXPENSE_TITLES.some((c) => lower.includes(c))) return 'expense';
  if (REVENUE_TITLES.some((c) => lower.includes(c))) return 'revenue';

  return 'unknown';
}

/**
 * Parse a Xero P&L report response into structured totals.
 * Returns account-level amounts and section totals.
 */
export function parseXeroPnLReport(reportJson: unknown): XeroPnLTotals {
  const byAccountId = new Map<string, number>();
  const byAccountCode = new Map<string, number>();
  let totalRevenue = 0;
  let totalCostOfSales = 0;
  let totalExpenses = 0;

  const reports = (reportJson as { Reports?: XeroReport[] })?.Reports;
  const report = reports?.[0];
  if (!report?.Rows) {
    return { byAccountId, byAccountCode, totalRevenue, totalCostOfSales, totalExpenses, netProfit: 0 };
  }

  for (const section of report.Rows) {
    if (section.RowType !== 'Section' || !section.Rows || !section.Title) continue;

    const sectionType = classifySection(section.Title);

    for (const row of section.Rows) {
      if (row.RowType === 'SummaryRow') continue;
      if (row.RowType !== 'Row' || !row.Cells || row.Cells.length < 2) continue;

      const accountCell = row.Cells[0];
      const amountCell = row.Cells[1];

      const accountId = accountCell?.Attributes?.find(
        (a) => a.Id === 'account'
      )?.Value;

      const amount = parseFloat(amountCell?.Value || '0') || 0;
      if (amount === 0) continue;

      if (accountId) {
        byAccountId.set(accountId, (byAccountId.get(accountId) || 0) + amount);
      }

      // Extract account code from Attributes if available
      const accountCode = accountCell?.Attributes?.find(
        (a) => a.Id === 'account'
      )?.Value;
      if (accountCode) {
        byAccountCode.set(accountCode, (byAccountCode.get(accountCode) || 0) + amount);
      }

      // Accumulate section totals
      switch (sectionType) {
        case 'revenue':
          totalRevenue += amount;
          break;
        case 'cogs':
          totalCostOfSales += amount;
          break;
        case 'expense':
          totalExpenses += amount;
          break;
      }
    }
  }

  // Xero reports negative amounts for costs/expenses
  const netProfit = totalRevenue + totalCostOfSales + totalExpenses;

  return {
    byAccountId,
    byAccountCode,
    totalRevenue,
    totalCostOfSales: Math.abs(totalCostOfSales),
    totalExpenses: Math.abs(totalExpenses),
    netProfit,
  };
}
