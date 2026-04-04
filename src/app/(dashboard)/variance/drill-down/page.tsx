import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { DrillDownClient } from './drill-down-client';
import type { NormalisedFinancial, ChartOfAccount, BudgetLine } from '@/types';
import Link from 'next/link';

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

/**
 * Offset a YYYY-MM-01 period string by a number of months.
 */
function offsetPeriod(period: string, months: number): string {
  const d = new Date(period + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + months);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/**
 * Map a category slug (e.g. "revenue", "operating_expenses") to the P&L account
 * classes that feed it, so we can filter accounts.
 */
const CATEGORY_CLASS_MAP: Record<string, string[]> = {
  revenue: ['REVENUE'],
  cost_of_sales: ['DIRECTCOSTS'],
  operating_expenses: ['EXPENSE', 'OVERHEADS'],
  gross_profit: ['REVENUE', 'DIRECTCOSTS'],
  net_profit: ['REVENUE', 'DIRECTCOSTS', 'EXPENSE', 'OVERHEADS'],
};

export default async function VarianceDrillDownPage({ searchParams }: Props) {
  const params = await searchParams;
  const category = params.category ?? '';
  const period = params.period ?? '';
  const compareMode = params.compare ?? 'budget';
  const orgIdParam = params.orgId;

  // Validate required params
  if (!category || !period) {
    return (
      <div className="max-w-5xl space-y-6">
        <Link
          href="/variance"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to Variance Analysis
        </Link>
        <h2 className="text-2xl font-bold">Variance Drill-Down</h2>
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            Missing required parameters. Select a variance from the main analysis
            to drill down into the detail.
          </p>
        </div>
      </div>
    );
  }

  const { orgId: profileOrgId } = await getUserProfile();
  const orgId = orgIdParam ?? profileOrgId;
  const supabase = await createClient();

  // Fetch chart of accounts
  const { data: accountsRaw } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('org_id', orgId);

  const accounts = (accountsRaw ?? []) as ChartOfAccount[];

  // Fetch current period financials
  const { data: currentFinRaw } = await supabase
    .from('normalised_financials')
    .select('*')
    .eq('org_id', orgId)
    .eq('period', period);

  const currentFinancials = (currentFinRaw ?? []) as NormalisedFinancial[];

  // Determine comparison period for period-over-period modes
  const comparePeriod =
    compareMode === 'prev_month'
      ? offsetPeriod(period, -1)
      : compareMode === 'prev_quarter'
        ? offsetPeriod(period, -3)
        : compareMode === 'prev_year'
          ? offsetPeriod(period, -12)
          : null;

  // Build account lookup
  const accountMap = new Map<string, ChartOfAccount>();
  for (const acc of accounts) {
    accountMap.set(acc.id, acc);
  }

  // Determine which account classes belong to this category
  const targetClasses = CATEGORY_CLASS_MAP[category];

  // Helper: extract account-level rows from financials for the given classes
  function extractAccountRows(
    financials: NormalisedFinancial[],
    filterClasses: string[] | undefined,
  ): Array<{ name: string; code: string; accountId: string; amount: number }> {
    const rows: Array<{ name: string; code: string; accountId: string; amount: number }> = [];

    for (const fin of financials) {
      const account = accountMap.get(fin.account_id);
      if (!account) continue;

      // If we have known class mapping, filter by class
      if (filterClasses) {
        const cls = account.class.toUpperCase();
        if (!filterClasses.includes(cls)) continue;
      }

      rows.push({
        name: account.name,
        code: account.code,
        accountId: account.id,
        amount: Number(fin.amount),
      });
    }

    return rows;
  }

  // If category matches a known class group, extract by class.
  // Otherwise, try to match by account name (the variance engine uses
  // lowercased, underscore-joined account names as category keys).
  let currentAccounts: Array<{ name: string; code: string; accountId: string; amount: number }>;

  if (targetClasses) {
    currentAccounts = extractAccountRows(currentFinancials, targetClasses);
  } else {
    // Single-account category: find by matching the name slug
    currentAccounts = [];
    for (const fin of currentFinancials) {
      const account = accountMap.get(fin.account_id);
      if (!account) continue;
      const slug = account.name.toLowerCase().replace(/\s+/g, '_');
      if (slug === category) {
        currentAccounts.push({
          name: account.name,
          code: account.code,
          accountId: account.id,
          amount: Number(fin.amount),
        });
      }
    }
  }

  // Build baseline accounts
  let baselineAccounts: Array<{ name: string; code: string; accountId: string; amount: number }> = [];

  if (compareMode === 'budget') {
    // Budget mode: baseline from budget_lines table
    const { data: budgetRaw } = await supabase
      .from('budget_lines')
      .select('*')
      .eq('org_id', orgId)
      .eq('period', period);

    const budgetLines = (budgetRaw ?? []) as unknown as BudgetLine[];

    // Budget lines have account_code and account_name, map them to account IDs
    const codeToAccount = new Map<string, ChartOfAccount>();
    for (const acc of accounts) {
      codeToAccount.set(acc.code, acc);
    }

    if (targetClasses) {
      // Filter budget lines to accounts in the target classes
      for (const bl of budgetLines) {
        const account = codeToAccount.get(bl.account_code);
        if (!account) continue;
        const cls = account.class.toUpperCase();
        if (!targetClasses.includes(cls)) continue;
        baselineAccounts.push({
          name: bl.account_name || account.name,
          code: bl.account_code,
          accountId: account.id,
          amount: Number(bl.budgeted_amount),
        });
      }
    } else {
      // Single-account: match by category slug
      for (const bl of budgetLines) {
        const account = codeToAccount.get(bl.account_code);
        if (!account) continue;
        const slug = account.name.toLowerCase().replace(/\s+/g, '_');
        if (slug === category) {
          baselineAccounts.push({
            name: bl.account_name || account.name,
            code: bl.account_code,
            accountId: account.id,
            amount: Number(bl.budgeted_amount),
          });
        }
      }
    }
  } else if (comparePeriod) {
    // Period-over-period: baseline from prior period actuals
    const { data: priorFinRaw } = await supabase
      .from('normalised_financials')
      .select('*')
      .eq('org_id', orgId)
      .eq('period', comparePeriod);

    const priorFinancials = (priorFinRaw ?? []) as NormalisedFinancial[];

    if (targetClasses) {
      baselineAccounts = extractAccountRows(priorFinancials, targetClasses);
    } else {
      for (const fin of priorFinancials) {
        const account = accountMap.get(fin.account_id);
        if (!account) continue;
        const slug = account.name.toLowerCase().replace(/\s+/g, '_');
        if (slug === category) {
          baselineAccounts.push({
            name: account.name,
            code: account.code,
            accountId: account.id,
            amount: Number(fin.amount),
          });
        }
      }
    }
  }

  // Compute totals
  const totalActual = currentAccounts.reduce((sum, a) => sum + a.amount, 0);
  const totalBaseline = baselineAccounts.reduce((sum, a) => sum + a.amount, 0);

  return (
    <DrillDownClient
      category={category}
      period={period}
      compareMode={compareMode}
      comparePeriod={comparePeriod}
      currentAccounts={currentAccounts}
      baselineAccounts={baselineAccounts}
      totalActual={totalActual}
      totalBaseline={totalBaseline}
    />
  );
}
