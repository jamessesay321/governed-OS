import { createServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';
import { generatePeriodTimeline, hashAssumptions } from './assumptions';
import type { AssumptionInput } from './assumptions';
import { generateFullProjection } from './calculations';
import type { ActualsInput } from './calculations';
import { persistModelSnapshots, persistUnitEconomicsSnapshots, persistForecastSnapshots } from './snapshots';
import { generateUnitEconomics } from './unit-economics';
import type { SegmentInput } from './unit-economics';
import { generateAndPersistCommentary } from '@/lib/ai/commentary';

const ENGINE_VERSION = '1.0.0';

// === Scenario CRUD Operations ===

/**
 * Create a new scenario with its assumption set.
 */
export async function createScenario(
  orgId: string,
  userId: string,
  input: {
    name: string;
    description: string;
    basePeriodStart: string;
    basePeriodEnd: string;
    forecastHorizonMonths: number;
    isBase?: boolean;
  }
) {
  const supabase = await createServiceClient();

  // Create assumption set
  const { data: assumptionSet, error: asError } = await supabase
    .from('assumption_sets')
    .insert({
      org_id: orgId,
      name: `${input.name} Assumptions`,
      description: `Assumption set for ${input.name}`,
      version: 1,
      base_period_start: input.basePeriodStart,
      base_period_end: input.basePeriodEnd,
      forecast_horizon_months: input.forecastHorizonMonths,
      created_by: userId,
    })
    .select()
    .single();

  if (asError || !assumptionSet) {
    throw new Error(`Failed to create assumption set: ${asError?.message}`);
  }

  // Create scenario
  const { data: scenario, error: scError } = await supabase
    .from('scenarios')
    .insert({
      org_id: orgId,
      assumption_set_id: assumptionSet.id,
      name: input.name,
      description: input.description,
      status: 'draft',
      is_base: input.isBase ?? false,
      created_by: userId,
    })
    .select()
    .single();

  if (scError || !scenario) {
    throw new Error(`Failed to create scenario: ${scError?.message}`);
  }

  await logAudit({
    orgId,
    userId,
    action: 'scenario.created',
    entityType: 'scenario',
    entityId: scenario.id,
    changes: { name: input.name, status: 'draft' },
  });

  return { scenario, assumptionSet };
}

/**
 * Duplicate a scenario with a deep copy of all assumptions.
 */
export async function duplicateScenario(
  orgId: string,
  userId: string,
  sourceScenarioId: string,
  newName: string
) {
  const supabase = await createServiceClient();

  // Fetch source scenario + assumption set
  const { data: source, error: srcError } = await supabase
    .from('scenarios')
    .select('*, assumption_sets(*)')
    .eq('id', sourceScenarioId)
    .eq('org_id', orgId)
    .single();

  if (srcError || !source) {
    throw new Error(`Source scenario not found: ${srcError?.message}`);
  }

  const sourceSet = (source as Record<string, unknown>).assumption_sets as Record<string, unknown>;

  // Create new assumption set
  const { data: newSet, error: nsError } = await supabase
    .from('assumption_sets')
    .insert({
      org_id: orgId,
      name: `${newName} Assumptions`,
      description: `Copied from ${source.name}`,
      version: 1,
      base_period_start: sourceSet.base_period_start as string,
      base_period_end: sourceSet.base_period_end as string,
      forecast_horizon_months: sourceSet.forecast_horizon_months as number,
      created_by: userId,
    })
    .select()
    .single();

  if (nsError || !newSet) {
    throw new Error(`Failed to create assumption set copy: ${nsError?.message}`);
  }

  // Copy assumption values
  const { data: sourceValues } = await supabase
    .from('assumption_values')
    .select('*')
    .eq('assumption_set_id', source.assumption_set_id)
    .eq('org_id', orgId);

  if (sourceValues && sourceValues.length > 0) {
    const copies = sourceValues.map((v) => ({
      org_id: orgId,
      assumption_set_id: newSet.id,
      category: v.category,
      key: v.key,
      label: v.label,
      type: v.type,
      value: v.value,
      effective_from: v.effective_from,
      effective_to: v.effective_to,
      version: 1,
      created_by: userId,
    }));

    await supabase.from('assumption_values').insert(copies);
  }

  // Create new scenario
  const { data: newScenario, error: nscError } = await supabase
    .from('scenarios')
    .insert({
      org_id: orgId,
      assumption_set_id: newSet.id,
      name: newName,
      description: `Copy of ${source.name}`,
      status: 'draft',
      is_base: false,
      created_by: userId,
    })
    .select()
    .single();

  if (nscError || !newScenario) {
    throw new Error(`Failed to create scenario copy: ${nscError?.message}`);
  }

  await logAudit({
    orgId,
    userId,
    action: 'scenario.duplicated',
    entityType: 'scenario',
    entityId: newScenario.id,
    changes: { source_id: sourceScenarioId, new_name: newName },
  });

  return { scenario: newScenario, assumptionSet: newSet };
}

/**
 * Lock a scenario (requires admin role — enforced at API layer).
 */
export async function lockScenario(
  orgId: string,
  userId: string,
  scenarioId: string
) {
  const supabase = await createServiceClient();

  // Get current scenario
  const { data: scenario, error: fetchError } = await supabase
    .from('scenarios')
    .select('*')
    .eq('id', scenarioId)
    .eq('org_id', orgId)
    .single();

  if (fetchError || !scenario) {
    throw new Error(`Scenario not found: ${fetchError?.message}`);
  }

  if (scenario.status === 'locked') {
    throw new Error('Scenario is already locked');
  }

  // Lock the scenario
  const { error: updateError } = await supabase
    .from('scenarios')
    .update({
      status: 'locked',
      locked_at: new Date().toISOString(),
      locked_by: userId,
    })
    .eq('id', scenarioId)
    .eq('org_id', orgId);

  if (updateError) {
    throw new Error(`Failed to lock scenario: ${updateError.message}`);
  }

  // Create final scenario version snapshot
  const { data: values } = await supabase
    .from('assumption_values')
    .select('*')
    .eq('assumption_set_id', scenario.assumption_set_id)
    .eq('org_id', orgId);

  await supabase.from('scenario_versions').insert({
    org_id: orgId,
    scenario_id: scenarioId,
    change_summary: 'Scenario locked',
    assumption_set_snapshot: { values: values ?? [] },
    created_by: userId,
  });

  await logAudit({
    orgId,
    userId,
    action: 'scenario.locked',
    entityType: 'scenario',
    entityId: scenarioId,
  });
}

// === Model Pipeline ===

/**
 * Run the full model pipeline:
 * 1. Fetch assumptions
 * 2. Resolve assumptions for each period
 * 3. Compute projections (deterministic)
 * 4. Persist immutable snapshots
 * 5. Audit log
 */
export async function runModelPipeline(
  orgId: string,
  userId: string,
  scenarioId: string
) {
  const supabase = await createServiceClient();

  // Fetch scenario + assumption set
  const { data: scenario, error: scError } = await supabase
    .from('scenarios')
    .select('*')
    .eq('id', scenarioId)
    .eq('org_id', orgId)
    .single();

  if (scError || !scenario) {
    throw new Error(`Scenario not found: ${scError?.message}`);
  }

  if (scenario.status === 'locked') {
    throw new Error('Cannot run model on locked scenario');
  }

  // Fetch assumption set
  const { data: assumptionSet, error: asError } = await supabase
    .from('assumption_sets')
    .select('*')
    .eq('id', scenario.assumption_set_id)
    .eq('org_id', orgId)
    .single();

  if (asError || !assumptionSet) {
    throw new Error(`Assumption set not found: ${asError?.message}`);
  }

  // Fetch assumption values
  const { data: assumptionValues, error: avError } = await supabase
    .from('assumption_values')
    .select('*')
    .eq('assumption_set_id', scenario.assumption_set_id)
    .eq('org_id', orgId);

  if (avError) {
    throw new Error(`Failed to fetch assumption values: ${avError.message}`);
  }

  const assumptions: AssumptionInput[] = (assumptionValues ?? []).map((v) => ({
    key: v.key,
    category: v.category,
    type: v.type,
    value: v.value,
    effective_from: v.effective_from,
    effective_to: v.effective_to,
  }));

  // Generate period timeline
  const periods = generatePeriodTimeline(
    assumptionSet.base_period_start,
    assumptionSet.base_period_end,
    assumptionSet.forecast_horizon_months
  );

  // Fetch actuals (normalised financials)
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('*, chart_of_accounts!inner(class)')
    .eq('org_id', orgId);

  // Build actuals array from normalised financials
  const actualsMap = new Map<string, ActualsInput>();
  for (const fin of financials ?? []) {
    const period = fin.period;
    const existing = actualsMap.get(period) ?? {
      period,
      revenue: 0,
      cost_of_sales: 0,
      operating_expenses: 0,
      cash_balance: 0,
    };

    const accountClass = (fin.chart_of_accounts as Record<string, string>)?.class?.toUpperCase();
    const amount = Number(fin.amount);

    if (accountClass === 'REVENUE') {
      existing.revenue += amount;
    } else if (accountClass === 'DIRECTCOSTS') {
      existing.cost_of_sales += amount;
    } else if (accountClass === 'EXPENSE' || accountClass === 'OVERHEADS') {
      existing.operating_expenses += amount;
    }

    actualsMap.set(period, existing);
  }

  const actuals = Array.from(actualsMap.values()).sort((a, b) =>
    a.period.localeCompare(b.period)
  );

  // Compute assumption hash for reproducibility verification
  const assumptionHash = hashAssumptions(assumptions);

  // Run deterministic projection — pass raw assumptions so each period resolves
  // its own effective values (time-varying assumptions like phased growth rates
  // or seasonal overrides take effect at the correct period)
  const projections = generateFullProjection(actuals, assumptions, periods);

  // Create model version
  const { data: modelVersion, error: mvError } = await supabase
    .from('model_versions')
    .insert({
      org_id: orgId,
      scenario_id: scenarioId,
      assumption_set_id: scenario.assumption_set_id,
      assumption_hash: assumptionHash,
      engine_version: ENGINE_VERSION,
      triggered_by: userId,
    })
    .select()
    .single();

  if (mvError || !modelVersion) {
    throw new Error(`Failed to create model version: ${mvError?.message}`);
  }

  // Persist model snapshots
  const snapshotCount = await persistModelSnapshots(
    orgId,
    modelVersion.id,
    scenarioId,
    projections
  );

  // Persist forecast snapshots (revenue, net_profit, closing_cash per period)
  const forecastEntries = projections.flatMap((p) => [
    { period: p.period, metricKey: 'revenue', metricLabel: 'Revenue', forecastValue: p.revenue, actualValue: actualsMap.has(p.period) ? actualsMap.get(p.period)!.revenue : null },
    { period: p.period, metricKey: 'net_profit', metricLabel: 'Net Profit', forecastValue: p.netProfit, actualValue: null },
    { period: p.period, metricKey: 'closing_cash', metricLabel: 'Closing Cash', forecastValue: p.closingCash, actualValue: null },
  ]);

  await persistForecastSnapshots(orgId, modelVersion.id, scenarioId, forecastEntries);

  // Persist unit economics from segment assumptions (if segments exist)
  const { data: segmentValues } = await supabase
    .from('assumption_values')
    .select('*')
    .eq('assumption_set_id', scenario.assumption_set_id)
    .eq('org_id', orgId)
    .eq('category', 'revenue_drivers')
    .like('key', 'segment_%');

  if (segmentValues && segmentValues.length > 0) {
    // Group segment values by segment key prefix
    const segmentMap = new Map<string, Record<string, number>>();
    for (const sv of segmentValues) {
      // Expected key format: segment_<name>_<field>
      const parts = sv.key.split('_');
      if (parts.length < 3) continue;
      const segKey = parts.slice(1, -1).join('_');
      const field = parts[parts.length - 1];
      const existing = segmentMap.get(segKey) ?? {};
      existing[field] = Number(sv.value);
      segmentMap.set(segKey, existing);
    }

    for (const period of periods) {
      const segments: SegmentInput[] = [];
      for (const [segKey, fields] of segmentMap) {
        segments.push({
          segmentKey: segKey,
          segmentLabel: segKey.replace(/_/g, ' '),
          unitsSold: fields['units'] ?? 0,
          revenuePerUnit: fields['price'] ?? 0,
          variableCostPerUnit: fields['varcost'] ?? 0,
          acquisitionSpend: fields['acqspend'] ?? 0,
          customersAcquired: fields['customers'] ?? 0,
          avgCustomerLifespanMonths: fields['lifespan'] ?? 12,
          avgRevenuePerCustomerPerMonth: fields['arpc'] ?? 0,
        });
      }

      if (segments.length > 0) {
        const unitEcon = generateUnitEconomics(segments, period);
        await persistUnitEconomicsSnapshots(
          orgId,
          modelVersion.id,
          scenarioId,
          period,
          unitEcon.segments
        );
      }
    }
  }

  // Generate and persist AI commentary
  await generateAndPersistCommentary(orgId, modelVersion.id, scenarioId);

  // Update scenario status to active
  if (scenario.status === 'draft') {
    await supabase
      .from('scenarios')
      .update({ status: 'active' })
      .eq('id', scenarioId)
      .eq('org_id', orgId);
  }

  await logAudit({
    orgId,
    userId,
    action: 'model.pipeline_run',
    entityType: 'model_version',
    entityId: modelVersion.id,
    changes: {
      scenario_id: scenarioId,
      engine_version: ENGINE_VERSION,
      assumption_hash: assumptionHash,
      snapshot_count: snapshotCount,
    },
  });

  return {
    modelVersionId: modelVersion.id,
    snapshotCount,
    projections,
  };
}
