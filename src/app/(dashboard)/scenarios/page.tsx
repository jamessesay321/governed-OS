import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { ScenariosListClient, type ScenarioSparklines } from './scenarios-list-client';

export default async function ScenariosPage() {
  const { orgId, role } = await getUserProfile();
  const supabase = await createClient();

  const { data: scenarios } = await supabase
    .from('scenarios')
    .select('*, assumption_sets(name, base_period_start, base_period_end, forecast_horizon_months)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  // Fetch available actuals periods for auto-populating the create form
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('period')
    .eq('org_id', orgId);

  const periodSet = new Set((financials ?? []).map((f) => String(f.period)));
  const availablePeriods = Array.from(periodSet).sort();

  // Fetch model snapshots for sparkline previews per scenario.
  // We use the latest model version per scenario; the client component just
  // consumes the period-ordered arrays.
  const scenarioIds = (scenarios ?? []).map((s) => s.id);
  const sparklinesByScenarioId: Record<string, ScenarioSparklines> = {};

  if (scenarioIds.length > 0) {
    const { data: snapshots } = await supabase
      .from('model_snapshots')
      .select('scenario_id, model_version_id, period, revenue, net_profit, closing_cash')
      .in('scenario_id', scenarioIds)
      .order('period', { ascending: true });

    // Group by scenario_id, keeping only the latest model_version per scenario.
    const latestVersionByScenario = new Map<string, string>();
    for (const row of snapshots ?? []) {
      const prev = latestVersionByScenario.get(row.scenario_id);
      // model_version_id is a uuid — we can't order strictly, but the query is
      // ordered by period ASC and DB inserts the newest version with the latest
      // created_at, so take the max model_version_id we see per scenario.
      if (!prev || String(row.model_version_id) > prev) {
        latestVersionByScenario.set(row.scenario_id, String(row.model_version_id));
      }
    }

    for (const row of snapshots ?? []) {
      if (latestVersionByScenario.get(row.scenario_id) !== String(row.model_version_id)) {
        continue;
      }
      const existing = sparklinesByScenarioId[row.scenario_id] ?? {
        revenue: [],
        netProfit: [],
        closingCash: [],
      };
      existing.revenue.push(Number(row.revenue) || 0);
      existing.netProfit.push(Number(row.net_profit) || 0);
      existing.closingCash.push(Number(row.closing_cash) || 0);
      sparklinesByScenarioId[row.scenario_id] = existing;
    }
  }

  return (
    <ScenariosListClient
      scenarios={scenarios ?? []}
      role={role}
      availablePeriods={availablePeriods}
      sparklinesByScenarioId={sparklinesByScenarioId}
    />
  );
}
