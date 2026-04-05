import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient, createUntypedServiceClient } from '@/lib/supabase/server';
import { callLLMCached } from '@/lib/ai/cache';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/ai/rate-limiter';
import { hasBudgetRemaining, trackTokenUsage } from '@/lib/ai/token-budget';
import { buildPnL, getAvailablePeriods } from '@/lib/financial/aggregate';
import { getSkillAsSystemPrompt } from '@/lib/skills/company-skill';
import {
  governedOutput,
  xeroFinancialsSource,
  companySkillSource,
} from '@/lib/governance/checkpoint';
import { llmLimiter } from '@/lib/rate-limit';
import { calculateKPIs } from '@/lib/kpi/engine';
import { z } from 'zod';
import type { NormalisedFinancial, ChartOfAccount } from '@/types';

const querySchema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

/**
 * GET /api/briefing/[orgId]
 * Generate a structured daily briefing using Claude API.
 * Combines financial pulse, open challenges, anomalies, and KPI status
 * into an actionable briefing for the business owner.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { profile } = await requireRole('viewer');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Rate limit: 10 LLM calls per minute per org
    const limited = llmLimiter.check(orgId);
    if (limited) return limited;

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      period: url.searchParams.get('period') || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();
    const untypedDb = await createUntypedServiceClient();

    // Fetch financial data, challenges, and company skill in parallel
    const [
      financialsResult,
      accountsResult,
      challengesResult,
      companySystemPrompt,
      syncResult,
    ] = await Promise.all([
      supabase.from('normalised_financials').select('*').eq('org_id', orgId),
      supabase.from('chart_of_accounts').select('*').eq('org_id', orgId),
      untypedDb
        .from('number_challenges')
        .select('*')
        .eq('org_id', orgId)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(10),
      getSkillAsSystemPrompt(orgId),
      supabase
        .from('sync_log')
        .select('completed_at')
        .eq('org_id', orgId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single(),
    ]);

    const fins = (financialsResult.data ?? []) as NormalisedFinancial[];
    const accs = (accountsResult.data ?? []) as ChartOfAccount[];
    const openChallenges = (challengesResult.data ?? []) as Record<string, unknown>[];
    const lastSync = syncResult.data;

    const periods = getAvailablePeriods(fins);
    if (periods.length === 0) {
      return NextResponse.json({
        sections: [
          {
            title: 'Getting Started',
            icon: 'Sunrise',
            content:
              'Connect your Xero account and sync data to see your daily briefing.',
            links: [{ label: 'Connect Xero', href: '/integrations' }],
          },
        ],
        generatedAt: new Date().toISOString(),
        period: null,
      });
    }

    const period =
      parsed.data.period && periods.includes(parsed.data.period)
        ? parsed.data.period
        : periods[0];

    // Build current and previous P&L
    const currentPnL = buildPnL(fins, accs, period);
    const periodIdx = periods.indexOf(period);
    const previousPeriod =
      periodIdx < periods.length - 1 ? periods[periodIdx + 1] : null;
    const previousPnL = previousPeriod
      ? buildPnL(fins, accs, previousPeriod)
      : null;

    // Calculate KPIs (best-effort)
    let kpiData: { key: string; label: string; formatted_value: string; benchmark_status: string }[] = [];
    try {
      const kpis = await calculateKPIs(orgId, period + '-01', 'universal');
      kpiData = kpis.map((k) => ({
        key: k.key,
        label: k.label,
        formatted_value: k.formatted_value,
        benchmark_status: k.benchmark_status,
      }));
    } catch {
      // KPIs are optional for the briefing
    }

    // Fetch anomalies (best-effort, from cached detection results if available)
    let anomalyData: { title: string; severity: string }[] = [];
    try {
      const { data: anomalies } = await untypedDb
        .from('detected_anomalies')
        .select('title, severity')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(5);
      anomalyData = (anomalies ?? []) as { title: string; severity: string }[];
    } catch {
      // Anomalies table may not exist yet — graceful degradation
    }

    const currentData = {
      period,
      revenue: currentPnL.revenue,
      costOfSales: currentPnL.costOfSales,
      grossProfit: currentPnL.grossProfit,
      grossMargin:
        currentPnL.revenue > 0
          ? ((currentPnL.grossProfit / currentPnL.revenue) * 100).toFixed(1)
          : '0',
      expenses: currentPnL.expenses,
      netProfit: currentPnL.netProfit,
      netMargin:
        currentPnL.revenue > 0
          ? ((currentPnL.netProfit / currentPnL.revenue) * 100).toFixed(1)
          : '0',
    };

    const previousData = previousPnL
      ? {
          period: previousPeriod,
          revenue: previousPnL.revenue,
          grossProfit: previousPnL.grossProfit,
          expenses: previousPnL.expenses,
          netProfit: previousPnL.netProfit,
        }
      : null;

    // Build system prompt
    const systemPrompt = `${companySystemPrompt}

## Daily Briefing Task
This is a UK company. Apply FRS 102/FRS 105 standards as appropriate.
Use ACCA/ICAEW practitioner methodology for ratio analysis.
Reference ISA 570 going concern indicators where relevant.
Generate a structured daily briefing for a UK-based SME business owner.
Use GBP currency formatting. Be concise, actionable, and data-driven.

You MUST respond with ONLY valid JSON matching this schema:
{
  "sections": [
    {
      "title": "Financial Pulse",
      "icon": "Sunrise",
      "content": "2-3 sentences on revenue, profit, and cash position for the period.",
      "links": [{ "label": "string", "href": "string" }]
    },
    {
      "title": "Key Changes",
      "icon": "ArrowUpDown",
      "content": "What moved since last period — highlight significant changes with numbers.",
      "links": [{ "label": "string", "href": "string" }]
    },
    {
      "title": "Items Needing Attention",
      "icon": "AlertCircle",
      "content": "Open challenges, anomalies, KPIs below benchmark — things the owner should review.",
      "links": [{ "label": "string", "href": "string" }]
    },
    {
      "title": "Suggested Actions",
      "icon": "Lightbulb",
      "content": "2-3 actionable next steps the owner can take today.",
      "links": [{ "label": "string", "href": "string" }]
    }
  ]
}

Rules:
- Every section must have all four fields: title, icon, content, links
- Content should be 2-3 sentences max per section
- Links should point to relevant Grove pages: /dashboard, /financials, /intelligence, /intelligence/anomalies, /kpis, /scenarios
- Reference specific numbers from the data
- If no previous period data exists, skip "Key Changes" comparisons and focus on current position
- If no challenges/anomalies exist, say "No open issues" in Items Needing Attention
- Keep icons exactly as shown above`;

    // Build user message with all data context
    const challengeSummary =
      openChallenges.length > 0
        ? openChallenges
            .slice(0, 5)
            .map(
              (c) =>
                `- [${c.severity}] ${c.metric_label}: ${c.reason}`
            )
            .join('\n')
        : 'No open challenges.';

    const kpiSummary =
      kpiData.length > 0
        ? kpiData
            .map(
              (k) =>
                `- ${k.label}: ${k.formatted_value} (status: ${k.benchmark_status})`
            )
            .join('\n')
        : 'No KPI data available.';

    const anomalySummary =
      anomalyData.length > 0
        ? anomalyData
            .map((a) => `- [${a.severity}] ${a.title}`)
            .join('\n')
        : 'No recent anomalies.';

    const userMessage = `Current period (${period}):
${JSON.stringify(currentData, null, 2)}

${previousData ? `Previous period (${previousData.period}):\n${JSON.stringify(previousData, null, 2)}` : 'No previous period data available.'}

Open Challenges:
${challengeSummary}

KPI Status:
${kpiSummary}

Recent Anomalies:
${anomalySummary}`;

    // Rate limit + budget checks
    const rateCheck = checkRateLimit(orgId, 'daily_briefing');
    if (!rateCheck.allowed) {
      const headers = getRateLimitHeaders(rateCheck);
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers }
      );
    }

    const hasBudget = await hasBudgetRemaining(orgId);
    if (!hasBudget) {
      return NextResponse.json(
        { error: 'Monthly AI token budget exhausted. Upgrade your plan for more.' },
        { status: 402 }
      );
    }

    const llmResult = await callLLMCached({
      systemPrompt,
      userMessage,
      orgId,
      temperature: 0.3,
      model: 'sonnet',
      cacheSystemPrompt: true,
      cacheTTLMinutes: 60,
    });
    const responseText = llmResult.response;
    await trackTokenUsage(orgId, llmResult.tokensUsed, 'daily_briefing');

    // Parse JSON response
    type BriefingSection = {
      title: string;
      icon: string;
      content: string;
      links: { label: string; href: string }[];
    };
    let sections: BriefingSection[];
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        sections = parsed.sections;
        if (!Array.isArray(sections)) {
          throw new Error('sections is not an array');
        }
      } else {
        throw new Error('No JSON in response');
      }
    } catch {
      // Fallback: return raw text as a single section
      sections = [
        {
          title: 'Financial Pulse',
          icon: 'Sunrise',
          content: responseText.slice(0, 500),
          links: [{ label: 'View Dashboard', href: '/dashboard' }],
        },
      ];
    }

    // Pass through governance checkpoint
    const governed = await governedOutput({
      orgId,
      userId: profile.id as string,
      outputType: 'daily_briefing',
      content: JSON.stringify(sections),
      modelTier: 'sonnet',
      modelId: 'claude-sonnet-4-20250514',
      dataSources: [
        xeroFinancialsSource(
          period,
          lastSync?.completed_at as string | undefined
        ),
        companySkillSource('2'),
      ],
      tokensUsed: llmResult.tokensUsed,
      cached: llmResult.cached,
    });

    return NextResponse.json({
      sections,
      generatedAt: new Date().toISOString(),
      period,
      governanceId: governed.id,
    });
  } catch (err) {
    console.error('[BRIEFING] Error:', err);
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to generate daily briefing' },
      { status: 500 }
    );
  }
}
