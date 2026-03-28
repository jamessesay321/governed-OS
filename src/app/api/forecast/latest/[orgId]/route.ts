import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/roles';
import { getLatestForecast } from '@/lib/forecast/engine';

/**
 * GET /api/forecast/latest/[orgId]
 * Returns the latest forecast for the given org.
 * Requires viewer role (any authenticated user in the org).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await params;
    const { profile } = await getAuthenticatedUser();

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const forecast = await getLatestForecast(orgId);

    if (!forecast) {
      return NextResponse.json(
        { error: 'No forecast found. Generate one first.' },
        { status: 404 },
      );
    }

    return NextResponse.json(forecast);
  } catch (error) {
    if ((error as Error).name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[FORECAST API] Latest fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forecast' },
      { status: 500 },
    );
  }
}
