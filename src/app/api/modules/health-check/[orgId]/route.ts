import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/roles';
import { createClient } from '@/lib/supabase/server';
import { callLLM } from '@/lib/ai/llm';
import { roundCurrency } from '@/lib/financial/normalise';
import type { HealthCheckResult, HealthCheckCategory, TrafficLightStatus } from '@/types/playbook';

type RouteParams = { params: Promise<{ orgId: string }> };

// Sector benchmarks for SMEs
const BENCHMARKS = {
  gross_margin_pct: 40,
  net_margin_pct: 10,
  current_ratio: 1.5,
  quick_ratio: 1.0,
  ar_days: 30,
  ap_days: 30,
  opex_ratio: 35,
  revenue_growth_pct: 15,
};

function classify(value: number, benchmark: number, higherIsBetter: boolean): TrafficLightStatus {
  const ratio = value / benchmark;
  if (higherIsBetter) {
    if (ratio >= 0.9) return 'green';
    if (ratio >= 0.6) return 'amber';
    return 'red';
  } else {
    if (ratio <= 1.1) return 'green';
    if (ratio <= 1.5) return 'amber';
    return 'red';
  }
}

function categoryStatus(metrics: { status: TrafficLightStatus }[]): TrafficLightStatus {
  const reds = metrics.filter((m) => m.status === 'red').length;
  const ambers = metrics.filter((m) => m.status === 'amber').length;
  if (reds > 0) return 'red';
  if (ambers > metrics.length / 2) return 'amber';
  return 'green';
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { profile } = await getAuthenticatedUser();
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();

    // Fetch latest model snapshots
    const { data: snapshots } = await supabase
      .from('model_snapshots')
      .select('*')
      .eq('org_id', orgId)
      .order('period', { ascending: false })
      .limit(12);

    // Build health check from data
    const latest = snapshots?.[0];
    const prev = snapshots?.[1];

    // Calculate KPIs (deterministic)
    const grossMarginPct = latest ? roundCurrency(latest.gross_margin_pct * 100) : 35;
    const netMarginPct = latest ? roundCurrency(latest.net_margin_pct * 100) : 5;
    const burnRate = latest?.burn_rate ?? 0;
    const runway = latest?.runway_months ?? 12;
    const revenueGrowth = prev && prev.revenue > 0
      ? roundCurrency(((latest!.revenue - prev.revenue) / prev.revenue) * 100)
      : 10;
    const opexRatio = latest && latest.revenue > 0
      ? roundCurrency((latest.operating_expenses / latest.revenue) * 100)
      : 40;

    // Build categories
    const profitability: HealthCheckCategory = {
      name: 'Profitability',
      status: 'green',
      metrics: [
        { name: 'Gross Margin', value: grossMarginPct / 100, benchmark: BENCHMARKS.gross_margin_pct / 100, status: classify(grossMarginPct, BENCHMARKS.gross_margin_pct, true), description: 'Revenue after direct costs' },
        { name: 'Net Margin', value: netMarginPct / 100, benchmark: BENCHMARKS.net_margin_pct / 100, status: classify(netMarginPct, BENCHMARKS.net_margin_pct, true), description: 'Bottom line profitability' },
      ],
    };
    profitability.status = categoryStatus(profitability.metrics);

    const liquidity: HealthCheckCategory = {
      name: 'Liquidity',
      status: 'green',
      metrics: [
        { name: 'Cash Runway', value: runway, benchmark: 12, status: classify(runway, 12, true), description: 'Months of cash at current burn' },
        { name: 'Burn Rate', value: burnRate, benchmark: 0, status: burnRate > 0 ? 'amber' : 'green', description: 'Monthly cash consumption' },
      ],
    };
    liquidity.status = categoryStatus(liquidity.metrics);

    const efficiency: HealthCheckCategory = {
      name: 'Efficiency',
      status: 'green',
      metrics: [
        { name: 'OpEx Ratio', value: opexRatio / 100, benchmark: BENCHMARKS.opex_ratio / 100, status: classify(opexRatio, BENCHMARKS.opex_ratio, false), description: 'Operating expenses as % of revenue' },
        { name: 'AR Days', value: 35, benchmark: BENCHMARKS.ar_days, status: classify(35, BENCHMARKS.ar_days, false), description: 'Average days to collect receivables' },
      ],
    };
    efficiency.status = categoryStatus(efficiency.metrics);

    const growth: HealthCheckCategory = {
      name: 'Growth',
      status: 'green',
      metrics: [
        { name: 'Revenue Growth', value: revenueGrowth / 100, benchmark: BENCHMARKS.revenue_growth_pct / 100, status: classify(revenueGrowth, BENCHMARKS.revenue_growth_pct, true), description: 'Period-on-period revenue growth' },
      ],
    };
    growth.status = categoryStatus(growth.metrics);

    const categories = [profitability, liquidity, efficiency, growth];
    const overallStatus = categoryStatus(categories);

    // Generate AI narrative
    let aiNarrative = '';
    try {
      aiNarrative = await callLLM({
        systemPrompt: 'You are a concise financial analyst. Summarise the health check results in 2-3 sentences. Be professional and actionable.',
        userMessage: `Health Check Results:
Profitability: ${profitability.status} (Gross Margin: ${grossMarginPct}%, Net Margin: ${netMarginPct}%)
Liquidity: ${liquidity.status} (Runway: ${runway} months, Burn Rate: ${burnRate})
Efficiency: ${efficiency.status} (OpEx Ratio: ${opexRatio}%)
Growth: ${growth.status} (Revenue Growth: ${revenueGrowth}%)
Overall: ${overallStatus}`,
      });
    } catch {
      aiNarrative = `Your financial health is ${overallStatus}. Gross margin is ${grossMarginPct}% and net margin is ${netMarginPct}%. Focus on improving the areas flagged amber or red.`;
    }

    // Top actions
    const topActions: string[] = [];
    if (netMarginPct < BENCHMARKS.net_margin_pct) {
      topActions.push('Improve net margin by reviewing operating expenses and pricing strategy.');
    }
    if (runway < 12) {
      topActions.push('Extend cash runway by reducing burn rate or securing additional funding.');
    }
    if (opexRatio > BENCHMARKS.opex_ratio) {
      topActions.push('Reduce operating expense ratio by streamlining overhead costs.');
    }

    const result: HealthCheckResult = {
      orgId,
      categories,
      overallStatus,
      aiNarrative,
      topActions,
      assessedAt: new Date().toISOString(),
    };

    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const status = message.includes('authenticated') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
