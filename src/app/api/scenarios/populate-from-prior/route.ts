import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createScenario, runModelPipeline } from '@/lib/scenarios/scenario-pipeline';
import { createServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';
import {
  populateFromPrior,
  type CategoryOverrides,
} from '@/lib/scenarios/populate-from-prior';

// Allow enough time for runModelPipeline to complete on larger scenarios
export const maxDuration = 120;

/**
 * POST /api/scenarios/populate-from-prior
 *
 * Creates a new scenario pre-loaded with assumption values derived from
 * a historical period range (typically the prior financial year) plus a
 * percentage uplift. This is the engine behind the Forecast Wizard.
 *
 * Body:
 *   name:             string                     (required)
 *   description?:     string
 *   sourceStart:      YYYY-MM-DD                 (first month of prior-year range)
 *   sourceEnd:        YYYY-MM-DD                 (last month of prior-year range)
 *   targetStart:      YYYY-MM-DD                 (first month the forecast applies to)
 *   forecastHorizonMonths: number                (default 12)
 *   overrides:        CategoryOverrides          (default { global: 0 })
 *   isBase?:          boolean
 *   rolling?:         boolean                    (currently stored only; behaviour later)
 *   autoVat?:         boolean                    (currently stored only; behaviour later)
 *   runPipeline?:     boolean                    (default true — run the model immediately)
 *
 * Returns:
 *   { scenarioId, assumptionSetId, aggregates, assumptionCount, pipelineResult? }
 */
export async function POST(request: Request) {
  try {
    const { user, profile } = await requireRole('advisor');

    const body = await request.json().catch(() => ({}));

    const {
      name,
      description,
      sourceStart,
      sourceEnd,
      targetStart,
      forecastHorizonMonths = 12,
      overrides: rawOverrides,
      isBase = false,
      rolling = false,
      autoVat = false,
      runPipeline = true,
    } = body ?? {};

    // ── Validate ───────────────────────────────────────────────────────
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!isIsoMonth(sourceStart) || !isIsoMonth(sourceEnd) || !isIsoMonth(targetStart)) {
      return NextResponse.json(
        { error: 'sourceStart, sourceEnd and targetStart must be YYYY-MM-DD dates' },
        { status: 400 }
      );
    }
    if (sourceStart > sourceEnd) {
      return NextResponse.json(
        { error: 'sourceStart must be on or before sourceEnd' },
        { status: 400 }
      );
    }
    if (
      !Number.isFinite(forecastHorizonMonths) ||
      forecastHorizonMonths < 1 ||
      forecastHorizonMonths > 60
    ) {
      return NextResponse.json(
        { error: 'forecastHorizonMonths must be between 1 and 60' },
        { status: 400 }
      );
    }

    const overrides: CategoryOverrides = coerceOverrides(rawOverrides);

    // ── 1. Create the scenario + assumption_set ────────────────────────
    const targetEnd = addMonths(targetStart, forecastHorizonMonths - 1);
    const { scenario, assumptionSet } = await createScenario(
      profile.org_id,
      user.id,
      {
        name,
        description: description || buildDefaultDescription(sourceStart, sourceEnd, overrides),
        basePeriodStart: targetStart,
        basePeriodEnd: targetEnd,
        forecastHorizonMonths,
        isBase,
      }
    );

    // ── 2. Aggregate prior year + build assumption seeds ───────────────
    const supabase = await createServiceClient();

    const { aggregates, seeds } = await populateFromPrior(supabase, profile.org_id, {
      sourceStart,
      sourceEnd,
      targetStart,
      overrides,
    });

    // If the source range has no data, fail fast — don't create an empty forecast.
    if (aggregates.periodsFound === 0) {
      // roll back the empty scenario + assumption set
      await supabase.from('scenarios').delete().eq('id', scenario.id);
      await supabase.from('assumption_sets').delete().eq('id', assumptionSet.id);
      return NextResponse.json(
        {
          error:
            'No data found in the source period range. Sync Xero first, or pick a different source range.',
          sourceRange: { start: sourceStart, end: sourceEnd },
        },
        { status: 422 }
      );
    }

    // ── 3. Bulk-insert assumption values ───────────────────────────────
    const rows = seeds.map((a) => ({
      org_id: profile.org_id,
      assumption_set_id: assumptionSet.id,
      category: a.category,
      key: a.key,
      label: a.label,
      type: a.type,
      value: a.value,
      effective_from: a.effective_from,
      effective_to: a.effective_to,
      version: 1,
      created_by: user.id,
    }));

    const { data: insertedValues, error: insertError } = await supabase
      .from('assumption_values')
      .insert(rows)
      .select();

    if (insertError) {
      console.error('[populate-from-prior] Insert error:', insertError.message);
      return NextResponse.json(
        { error: 'Failed to insert assumption values', detail: insertError.message },
        { status: 500 }
      );
    }

    // ── 4. Stamp provenance on the scenario ────────────────────────────
    const populateConfig = {
      source_range: { start: sourceStart, end: sourceEnd },
      target_range: { start: targetStart, end: targetEnd },
      forecast_horizon_months: forecastHorizonMonths,
      overrides,
      rolling,
      auto_vat: autoVat,
      aggregates_snapshot: {
        revenue: aggregates.revenue,
        other_income: aggregates.otherIncome,
        cost_of_sales: aggregates.costOfSales,
        employee_costs: aggregates.employeeCosts,
        other_overheads: aggregates.otherOverheads,
        interest_and_finance: aggregates.interestAndFinance,
        depreciation: aggregates.depreciation,
        periods_found: aggregates.periodsFound,
      },
      generated_at: new Date().toISOString(),
    };

    await supabase
      .from('scenarios')
      .update({
        created_via: 'prior_year',
        populate_config: populateConfig,
      })
      .eq('id', scenario.id);

    await logAudit({
      orgId: profile.org_id,
      userId: user.id,
      action: 'scenario.populated_from_prior',
      entityType: 'scenario',
      entityId: scenario.id,
      metadata: {
        name,
        assumptionCount: insertedValues?.length ?? seeds.length,
        sourceRange: populateConfig.source_range,
        targetRange: populateConfig.target_range,
        overrides,
      },
    });

    // ── 5. Optionally run the pipeline ─────────────────────────────────
    let pipelineResult: { modelVersionId: string; snapshotCount: number } | null = null;
    if (runPipeline) {
      try {
        const result = await runModelPipeline(profile.org_id, user.id, scenario.id);
        pipelineResult = {
          modelVersionId: result.modelVersionId,
          snapshotCount: result.snapshotCount,
        };
      } catch (pipelineError) {
        console.error('[populate-from-prior] Pipeline error:', pipelineError);
        // Return success on scenario creation but flag the pipeline failure.
        return NextResponse.json(
          {
            scenarioId: scenario.id,
            assumptionSetId: assumptionSet.id,
            aggregates,
            assumptionCount: insertedValues?.length ?? seeds.length,
            pipelineResult: null,
            pipelineError:
              pipelineError instanceof Error ? pipelineError.message : String(pipelineError),
          },
          { status: 201 }
        );
      }
    }

    // ── 6. Return the result ───────────────────────────────────────────
    return NextResponse.json(
      {
        scenarioId: scenario.id,
        assumptionSetId: assumptionSet.id,
        aggregates,
        assumptionCount: insertedValues?.length ?? seeds.length,
        pipelineResult,
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[populate-from-prior] Error:', e);
    return NextResponse.json(
      { error: 'Failed to populate scenario from prior year' },
      { status: 500 }
    );
  }
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function isIsoMonth(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function coerceOverrides(raw: unknown): CategoryOverrides {
  if (!raw || typeof raw !== 'object') return { global: 0 };
  const r = raw as Record<string, unknown>;
  const num = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v) ? v : undefined;
  return {
    global: num(r.global) ?? 0,
    revenue: num(r.revenue),
    cost_of_sales: num(r.cost_of_sales),
    employee_costs: num(r.employee_costs),
    other_overheads: num(r.other_overheads),
    interest_and_finance: num(r.interest_and_finance),
    depreciation: num(r.depreciation),
  };
}

function buildDefaultDescription(
  sourceStart: string,
  sourceEnd: string,
  overrides: CategoryOverrides
): string {
  const range = `${sourceStart.slice(0, 7)} to ${sourceEnd.slice(0, 7)}`;
  const pct = overrides.global ?? 0;
  const sign = pct >= 0 ? '+' : '';
  return `Populated from actuals ${range} with a ${sign}${pct}% global uplift. Category-level overrides may apply. Edit assumptions to refine.`;
}
