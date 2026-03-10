import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { compareScenarioSchema } from '@/lib/schemas';
import { getLatestModelSnapshots } from '@/lib/scenarios/snapshots';
import { createClient } from '@/lib/supabase/server';
import { compareScenarios } from '@/lib/scenarios/scenarios';
import type { PeriodProjection } from '@/lib/scenarios/calculations';
import type { ModelSnapshot } from '@/types';

function snapshotToProjection(s: ModelSnapshot): PeriodProjection {
  return {
    period: s.period,
    revenue: s.revenue,
    costOfSales: s.cost_of_sales,
    grossProfit: s.gross_profit,
    grossMarginPct: s.gross_margin_pct,
    operatingExpenses: s.operating_expenses,
    netProfit: s.net_profit,
    netMarginPct: s.net_margin_pct,
    cashIn: s.cash_in,
    cashOut: s.cash_out,
    netCashFlow: s.net_cash_flow,
    closingCash: s.closing_cash,
    burnRate: s.burn_rate,
    runwayMonths: s.runway_months,
    isBreakEven: s.is_break_even,
  };
}

// POST /api/scenarios/compare — Compare two scenarios (viewer+)
export async function POST(request: Request) {
  try {
    const { profile } = await requireRole('viewer');
    const body = await request.json();
    const parsed = compareScenarioSchema.parse(body);

    const supabase = await createClient();

    // Fetch both scenarios
    const [baseRes, compRes] = await Promise.all([
      supabase.from('scenarios').select('name').eq('id', parsed.baseScenarioId).eq('org_id', profile.org_id).single(),
      supabase.from('scenarios').select('name').eq('id', parsed.comparisonScenarioId).eq('org_id', profile.org_id).single(),
    ]);

    if (!baseRes.data || !compRes.data) {
      return NextResponse.json({ error: 'One or both scenarios not found' }, { status: 404 });
    }

    // Fetch snapshots for both
    const [baseSnaps, compSnaps] = await Promise.all([
      getLatestModelSnapshots(profile.org_id, parsed.baseScenarioId),
      getLatestModelSnapshots(profile.org_id, parsed.comparisonScenarioId),
    ]);

    const result = compareScenarios(
      {
        name: baseRes.data.name,
        projections: baseSnaps.snapshots.map(snapshotToProjection),
      },
      {
        name: compRes.data.name,
        projections: compSnaps.snapshots.map(snapshotToProjection),
      }
    );

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    const message = e instanceof Error ? e.message : 'Bad request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
