import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createScenario, runModelPipeline } from '@/lib/scenarios/scenario-pipeline';
import { createServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

/**
 * POST /api/scenarios/seed-strategic-plan
 *
 * Creates a "Strategic Plan 2026 — Alonuko" scenario pre-loaded with
 * real assumption values from the draft accounts and strategic plan.
 * Admin-only endpoint used to bootstrap the scenario engine with
 * production-grade data.
 */
export async function POST(request: Request) {
  try {
    const { user, profile } = await requireRole('admin');

    // Parse optional body flags
    let runPipeline = false;
    try {
      const body = await request.json();
      runPipeline = body?.runPipeline === true;
    } catch {
      // No body or invalid JSON — that's fine, defaults apply
    }

    // ── 1. Create the scenario + assumption set ──────────────────────
    const { scenario, assumptionSet } = await createScenario(
      profile.org_id,
      user.id,
      {
        name: 'Strategic Plan 2026 — Alonuko',
        description:
          'FY 2026/27 strategic plan seeded from draft accounts and board strategic plan. ' +
          'Covers revenue drivers (trunk shows, new categories), cost restructure, ' +
          'pricing strategy, and capital position.',
        basePeriodStart: '2025-04-01',
        basePeriodEnd: '2026-03-01',
        forecastHorizonMonths: 12,
        isBase: false,
      }
    );

    // ── 2. Seed assumption values ────────────────────────────────────
    const supabase = await createServiceClient();

    // Define all assumption values from draft accounts / strategic plan
    type AssumptionCategory = 'revenue_drivers' | 'pricing' | 'costs' | 'growth_rates' | 'headcount' | 'marketing' | 'capital' | 'custom';
    type AssumptionType = 'percentage' | 'currency' | 'integer' | 'boolean' | 'decimal';

    const assumptions: Array<{
      category: AssumptionCategory;
      key: string;
      label: string;
      type: AssumptionType;
      value: number;
      effective_from: string;
      effective_to: string | null;
    }> = [
      // ─── Revenue Drivers ───────────────────────────────────────────
      {
        category: 'revenue_drivers',
        key: 'baseline_revenue',
        label: 'Baseline Revenue (Draft Accounts Turnover)',
        type: 'currency',
        value: 1433012,
        effective_from: '2025-04-01',
        effective_to: null,
      },
      {
        category: 'revenue_drivers',
        key: 'other_income',
        label: 'Other Income',
        type: 'currency',
        value: 25000,
        effective_from: '2025-04-01',
        effective_to: null,
      },
      {
        category: 'revenue_drivers',
        key: 'trunk_show_revenue_2026',
        label: 'Trunk Show Revenue 2026 (12 shows)',
        type: 'currency',
        value: 930000,
        effective_from: '2025-04-01',
        effective_to: null,
      },
      {
        category: 'revenue_drivers',
        key: 'new_category_revenue',
        label: 'New Category Revenue (Civil/All Black)',
        type: 'currency',
        value: 146000,
        effective_from: '2025-04-01',
        effective_to: null,
      },

      // ─── Pricing ──────────────────────────────────────────────────
      {
        category: 'pricing',
        key: 'average_dress_price',
        label: 'Average Dress Price',
        type: 'currency',
        value: 7000,
        effective_from: '2025-04-01',
        effective_to: null,
      },
      {
        category: 'pricing',
        key: 'civil_ceremony_price',
        label: 'Civil Ceremony Dress Price (midpoint)',
        type: 'currency',
        value: 2250,
        effective_from: '2025-04-01',
        effective_to: null,
      },
      {
        category: 'pricing',
        key: 'all_black_price',
        label: 'All Black Evening Wear Price (midpoint)',
        type: 'currency',
        value: 1400,
        effective_from: '2025-04-01',
        effective_to: null,
      },

      // ─── Costs ────────────────────────────────────────────────────
      {
        category: 'costs',
        key: 'cogs_rate',
        label: 'Cost of Goods Sold Rate',
        type: 'percentage',
        value: 25.7,
        effective_from: '2025-04-01',
        effective_to: null,
      },
      {
        category: 'costs',
        key: 'staff_costs_pre_restructure',
        label: 'Staff Costs (Pre-Restructure)',
        type: 'currency',
        value: 780168,
        effective_from: '2025-04-01',
        effective_to: null,
      },
      {
        category: 'costs',
        key: 'staff_saving_from_restructure',
        label: 'Staff Saving from Restructure',
        type: 'currency',
        value: 110000,
        effective_from: '2026-06-01',
        effective_to: null,
      },
      {
        category: 'costs',
        key: 'other_charges',
        label: 'Other Charges (Draft Accounts)',
        type: 'currency',
        value: 749427,
        effective_from: '2025-04-01',
        effective_to: null,
      },
      {
        category: 'costs',
        key: 'depreciation',
        label: 'Depreciation',
        type: 'currency',
        value: 47170,
        effective_from: '2025-04-01',
        effective_to: null,
      },
      {
        category: 'costs',
        key: 'interest_payable',
        label: 'Interest Payable',
        type: 'currency',
        value: 257003,
        effective_from: '2025-04-01',
        effective_to: null,
      },

      // ─── Growth Rates ─────────────────────────────────────────────
      {
        category: 'growth_rates',
        key: 'revenue_growth_rate',
        label: 'Revenue Growth Rate YoY',
        type: 'percentage',
        value: 7,
        effective_from: '2025-04-01',
        effective_to: null,
      },
      {
        category: 'growth_rates',
        key: 'trunk_show_ramp_q1',
        label: 'Trunk Show Revenue per Show — Q1',
        type: 'currency',
        value: 40000,
        effective_from: '2025-04-01',
        effective_to: null,
      },
      {
        category: 'growth_rates',
        key: 'trunk_show_ramp_q2',
        label: 'Trunk Show Revenue per Show — Q2',
        type: 'currency',
        value: 55000,
        effective_from: '2025-04-01',
        effective_to: null,
      },
      {
        category: 'growth_rates',
        key: 'trunk_show_ramp_q3',
        label: 'Trunk Show Revenue per Show — Q3',
        type: 'currency',
        value: 100000,
        effective_from: '2025-04-01',
        effective_to: null,
      },
      {
        category: 'growth_rates',
        key: 'trunk_show_ramp_q4',
        label: 'Trunk Show Revenue per Show — Q4',
        type: 'currency',
        value: 130000,
        effective_from: '2025-04-01',
        effective_to: null,
      },

      // ─── Headcount ────────────────────────────────────────────────
      {
        category: 'headcount',
        key: 'headcount_current',
        label: 'Current Headcount',
        type: 'integer',
        value: 18,
        effective_from: '2025-04-01',
        effective_to: null,
      },
      {
        category: 'headcount',
        key: 'headcount_post_restructure',
        label: 'Headcount Post-Restructure',
        type: 'integer',
        value: 15,
        effective_from: '2026-06-01',
        effective_to: null,
      },

      // ─── Marketing ────────────────────────────────────────────────
      {
        category: 'marketing',
        key: 'google_ads_monthly',
        label: 'Google Ads Monthly Spend (midpoint)',
        type: 'currency',
        value: 650,
        effective_from: '2025-04-01',
        effective_to: null,
      },
      {
        category: 'marketing',
        key: 'campaign_shoots_total',
        label: 'Campaign Shoots Total (2 shoots)',
        type: 'currency',
        value: 31000,
        effective_from: '2025-04-01',
        effective_to: null,
      },
      {
        category: 'marketing',
        key: 'china_trip',
        label: 'China Sourcing Trip (May 2026)',
        type: 'currency',
        value: 3000,
        effective_from: '2025-04-01',
        effective_to: null,
      },

      // ─── Capital ──────────────────────────────────────────────────
      {
        category: 'capital',
        key: 'total_debt',
        label: 'Total Debt (approx. from facilities)',
        type: 'currency',
        value: 700000,
        effective_from: '2025-04-01',
        effective_to: null,
      },
      {
        category: 'capital',
        key: 'annual_interest',
        label: 'Annual Interest (Draft Accounts)',
        type: 'currency',
        value: 257003,
        effective_from: '2025-04-01',
        effective_to: null,
      },
      {
        category: 'capital',
        key: 'cash_position',
        label: 'Cash Position (Draft Accounts)',
        type: 'currency',
        value: 22375,
        effective_from: '2025-04-01',
        effective_to: null,
      },
    ];

    // Bulk-insert all assumption values in a single DB round-trip
    const rows = assumptions.map((a) => ({
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
      console.error('[seed-strategic-plan] Insert error:', insertError.message);
      return NextResponse.json(
        { error: 'Failed to insert assumption values', detail: insertError.message },
        { status: 500 }
      );
    }

    await logAudit({
      orgId: profile.org_id,
      userId: user.id,
      action: 'scenario.seeded',
      entityType: 'scenario',
      entityId: scenario.id,
      metadata: {
        name: 'Strategic Plan 2026 — Alonuko',
        assumptionCount: insertedValues?.length ?? assumptions.length,
        source: 'draft_accounts_and_strategic_plan',
      },
    });

    // ── 3. Optionally run the model pipeline ─────────────────────────
    let pipelineResult = null;
    if (runPipeline) {
      pipelineResult = await runModelPipeline(profile.org_id, user.id, scenario.id);
    }

    // ── 4. Return the result ─────────────────────────────────────────
    return NextResponse.json(
      {
        scenarioId: scenario.id,
        assumptionSetId: assumptionSet.id,
        assumptionCount: insertedValues?.length ?? assumptions.length,
        pipelineResult: pipelineResult
          ? {
              modelVersionId: pipelineResult.modelVersionId,
              snapshotCount: pipelineResult.snapshotCount,
            }
          : null,
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden — admin role required' }, { status: 403 });
    }
    console.error('[seed-strategic-plan] Error:', e);
    return NextResponse.json(
      { error: 'Failed to seed strategic plan scenario' },
      { status: 500 }
    );
  }
}
