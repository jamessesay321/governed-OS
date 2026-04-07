import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';
import { ProductionClient } from './production-client';

// ── Types ──

export interface ProductionLineCost {
  code: string;
  name: string;
  amounts: Record<string, number>;
  total: number;
  pctOfTotal: number;
}

export interface MaterialBreakdown {
  name: string;
  total: number;
}

export interface StockMovement {
  period: string;
  label: string;
  wip: number;
  rawMaterials: number;
  finishedGoods: number;
}

export interface ProductionPeriodSummary {
  period: string;
  label: string;
  byLine: Record<string, number>;
  total: number;
}

// ── Account Code Mapping ──

const WIP_CODES = {
  openingWip: '295',
  closingWip: '320',
  openingFinished: '296',
  closingFinished: '322',
  openingRaw: '306',
  closingRaw: '321',
};

const COGS_LINE_CODES: Record<string, string> = {
  '311': 'Bridal Bespoke',
  '312': 'Made to Order',
  '313': 'Ready to Wear',
  '314': 'Undergarments',
  '315': 'Robes',
  '316': 'Accessories',
  '317': 'Other',
  '318': 'Wholesale',
  '319': 'Evening Wear',
};

const MATERIAL_CODES: Record<string, string> = {
  '309': 'Fabric',
  '309.01': 'Embroidery',
  '309.02': 'Sewing Accessories',
};

const SHIPPING_CODE = '395';

function monthLabel(period: string): string {
  const d = new Date(period);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

// ── Page ──

export default async function ProductionPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createUntypedServiceClient();

  // All relevant account codes
  const allCodes = [
    ...Object.values(WIP_CODES),
    ...Object.keys(COGS_LINE_CODES),
    ...Object.keys(MATERIAL_CODES),
    SHIPPING_CODE,
  ];

  // Fetch chart_of_accounts for these codes
  const { data: coaData } = await supabase
    .from('chart_of_accounts')
    .select('id, name, code, class')
    .eq('org_id', orgId)
    .in('code', allCodes);

  const accounts = (coaData ?? []) as unknown as Array<{
    id: string; name: string; code: string; class: string;
  }>;

  const accountByCode = new Map(accounts.map((a) => [a.code, a]));
  const accountIds = accounts.map((a) => a.id);

  // Fetch normalised_financials for these accounts
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('period, amount, account_id')
    .eq('org_id', orgId)
    .in('account_id', accountIds)
    .order('period', { ascending: true });

  const rows = (financials ?? []) as unknown as Array<{
    period: string; amount: number; account_id: string;
  }>;

  // Build reverse map: account_id -> code
  const idToCode = new Map(accounts.map((a) => [a.id, a.code]));

  // Aggregate amounts by code and period
  const codeAmounts = new Map<string, Record<string, number>>();
  const allPeriods = new Set<string>();

  for (const row of rows) {
    const code = idToCode.get(row.account_id);
    if (!code) continue;
    allPeriods.add(row.period);

    if (!codeAmounts.has(code)) {
      codeAmounts.set(code, {});
    }
    const byPeriod = codeAmounts.get(code)!;
    byPeriod[row.period] = (byPeriod[row.period] ?? 0) + Number(row.amount);
  }

  const sortedPeriods = Array.from(allPeriods).sort().slice(-12);

  // ── Compute WIP & Stock Movements ──
  function sumForCode(code: string): number {
    const byPeriod = codeAmounts.get(code);
    if (!byPeriod) return 0;
    return Object.values(byPeriod).reduce((s, v) => s + v, 0);
  }

  function amountForCodePeriod(code: string, period: string): number {
    return codeAmounts.get(code)?.[period] ?? 0;
  }

  const openingWipTotal = sumForCode(WIP_CODES.openingWip);
  const closingWipTotal = sumForCode(WIP_CODES.closingWip);
  const wipMovement = openingWipTotal - closingWipTotal;

  const openingRawTotal = sumForCode(WIP_CODES.openingRaw);
  const closingRawTotal = sumForCode(WIP_CODES.closingRaw);
  const rawMaterialsMovement = openingRawTotal - closingRawTotal;

  const openingFinishedTotal = sumForCode(WIP_CODES.openingFinished);
  const closingFinishedTotal = sumForCode(WIP_CODES.closingFinished);
  const finishedGoodsMovement = openingFinishedTotal - closingFinishedTotal;

  // WIP Balance = Closing WIP (latest value, or total across periods)
  const wipBalance = closingWipTotal;
  const rawMaterialsBalance = closingRawTotal;
  const finishedGoodsBalance = closingFinishedTotal;

  // ── Stock Movement over time ──
  const stockMovements: StockMovement[] = sortedPeriods.map((period) => ({
    period,
    label: monthLabel(period),
    wip: amountForCodePeriod(WIP_CODES.openingWip, period) - amountForCodePeriod(WIP_CODES.closingWip, period),
    rawMaterials: amountForCodePeriod(WIP_CODES.openingRaw, period) - amountForCodePeriod(WIP_CODES.closingRaw, period),
    finishedGoods: amountForCodePeriod(WIP_CODES.openingFinished, period) - amountForCodePeriod(WIP_CODES.closingFinished, period),
  }));

  // ── Material Cost Breakdown ──
  const materialBreakdown: MaterialBreakdown[] = Object.entries(MATERIAL_CODES).map(
    ([code, name]) => ({
      name,
      total: sumForCode(code),
    })
  );

  const totalMaterials = materialBreakdown.reduce((s, m) => s + m.total, 0);

  // ── Production Cost per Product Line (CoGS) ──
  let totalProductionCost = 0;
  const productionLines: ProductionLineCost[] = [];

  for (const [code, lineName] of Object.entries(COGS_LINE_CODES)) {
    const amounts: Record<string, number> = {};
    let total = 0;

    for (const period of sortedPeriods) {
      const amt = amountForCodePeriod(code, period);
      amounts[period] = amt;
      total += amt;
    }

    totalProductionCost += total;
    productionLines.push({
      code,
      name: lineName,
      amounts,
      total,
      pctOfTotal: 0, // filled below
    });
  }

  // Fill percentages
  for (const line of productionLines) {
    line.pctOfTotal = totalProductionCost > 0 ? (line.total / totalProductionCost) * 100 : 0;
  }

  // Sort by total descending
  productionLines.sort((a, b) => b.total - a.total);

  // Add shipping
  const shippingTotal = sumForCode(SHIPPING_CODE);
  const totalAllProductionCost = totalProductionCost + totalMaterials + shippingTotal;

  // ── Period summaries for stacked bar ──
  const periodSummaries: ProductionPeriodSummary[] = sortedPeriods.map((period) => {
    const byLine: Record<string, number> = {};
    let total = 0;

    for (const [code, lineName] of Object.entries(COGS_LINE_CODES)) {
      const amt = amountForCodePeriod(code, period);
      if (amt !== 0) {
        byLine[lineName] = amt;
        total += amt;
      }
    }

    return { period, label: monthLabel(period), byLine, total };
  });

  return (
    <ProductionClient
      wipBalance={wipBalance}
      rawMaterialsBalance={rawMaterialsBalance}
      finishedGoodsBalance={finishedGoodsBalance}
      totalProductionCost={totalAllProductionCost}
      wipMovement={wipMovement}
      rawMaterialsMovement={rawMaterialsMovement}
      finishedGoodsMovement={finishedGoodsMovement}
      stockMovements={stockMovements}
      materialBreakdown={materialBreakdown}
      totalMaterials={totalMaterials}
      productionLines={productionLines}
      totalCogsProductionCost={totalProductionCost}
      shippingTotal={shippingTotal}
      periodSummaries={periodSummaries}
      periods={sortedPeriods}
    />
  );
}
