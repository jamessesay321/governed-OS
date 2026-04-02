import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { runHealthCheck } from '@/lib/analysis/health-check';
import { llmLimiter } from '@/lib/rate-limit';
import { createNotification } from '@/lib/notifications/notify';

type Params = { params: Promise<{ orgId: string }> };

/**
 * GET /api/analysis/health/[orgId]
 * Run a health check and return results.
 */
export async function GET(
  _request: NextRequest,
  { params }: Params
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

    const result = await runHealthCheck(orgId);

    // Push notification for critical health alerts
    const criticalAlerts = (result.alerts ?? []).filter(
      (a) => a.severity === 'critical'
    );
    if (criticalAlerts.length > 0) {
      await createNotification({
        userId: profile.id as string,
        orgId,
        type: 'intelligence',
        title: `${criticalAlerts.length} critical health alert${criticalAlerts.length === 1 ? '' : 's'}`,
        body: criticalAlerts
          .slice(0, 3)
          .map((a) => a.message)
          .join('; '),
        actionUrl: '/health',
      }).catch(() => {}); // Fire-and-forget
    }

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[analysis/health] GET error:', err);
    return NextResponse.json({ error: 'Failed to run health check' }, { status: 500 });
  }
}
