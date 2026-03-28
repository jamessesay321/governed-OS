import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { llmLimiter } from '@/lib/rate-limit';
import { generateForecast, type ForecastAssumption } from '@/lib/forecast/engine';

/**
 * POST /api/forecast/generate
 * Body: { months: number, assumptions: ForecastAssumption[] }
 * Requires admin role. Rate limited.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await requireRole('admin');

    // Rate limit by user
    const limited = llmLimiter.check(user.id);
    if (limited) return limited;

    const body = await request.json();
    const months = Math.min(Math.max(Number(body.months) || 12, 1), 36);
    const assumptions: ForecastAssumption[] = Array.isArray(body.assumptions)
      ? body.assumptions
      : [];

    // Determine start period as next month from now
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startPeriod = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

    const forecast = await generateForecast({
      orgId: profile.org_id as string,
      startPeriod,
      months,
      assumptions,
    });

    return NextResponse.json(forecast, { status: 201 });
  } catch (error) {
    if ((error as Error).name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[FORECAST API] Generate error:', error);
    return NextResponse.json(
      { error: 'Failed to generate forecast' },
      { status: 500 },
    );
  }
}
