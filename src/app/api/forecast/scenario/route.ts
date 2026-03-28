import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { llmLimiter } from '@/lib/rate-limit';
import { parseScenarioFromNaturalLanguage, runScenario } from '@/lib/forecast/scenarios';
import type { ForecastAssumption } from '@/lib/forecast/engine';

/**
 * POST /api/forecast/scenario
 * Body (natural language): { query: string }
 * Body (direct):           { name: string, assumptions: ForecastAssumption[] }
 * Requires admin role. Rate limited.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await requireRole('admin');

    const limited = llmLimiter.check(user.id);
    if (limited) return limited;

    const body = await request.json();
    const orgId = profile.org_id as string;

    let name: string;
    let assumptions: ForecastAssumption[];

    if (typeof body.query === 'string' && body.query.trim()) {
      // Natural language mode
      const parsed = await parseScenarioFromNaturalLanguage(orgId, body.query);
      assumptions = parsed.assumptions;
      name = body.name || body.query.slice(0, 80);
    } else if (Array.isArray(body.assumptions)) {
      // Direct assumptions mode
      assumptions = body.assumptions;
      name = body.name || 'Custom Scenario';
    } else {
      return NextResponse.json(
        { error: 'Provide either "query" (string) or "name" + "assumptions" (array).' },
        { status: 400 },
      );
    }

    const months = Math.min(Math.max(Number(body.months) || 12, 1), 36);
    const scenario = await runScenario(orgId, name, assumptions, months);

    return NextResponse.json(scenario, { status: 201 });
  } catch (error) {
    if ((error as Error).name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[FORECAST API] Scenario error:', error);
    return NextResponse.json(
      { error: 'Failed to run scenario' },
      { status: 500 },
    );
  }
}
