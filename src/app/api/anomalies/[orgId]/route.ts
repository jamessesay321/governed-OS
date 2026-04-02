import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { detectAnomalies } from '@/lib/ai/anomaly-detection';
import { logAudit } from '@/lib/audit/log';
import { llmLimiter } from '@/lib/rate-limit';
import { createNotification } from '@/lib/notifications/notify';

type Params = { params: Promise<{ orgId: string }> };

// GET /api/anomalies/[orgId] — Run anomaly detection on latest data
export async function GET(request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    const { user, profile } = await requireRole('viewer');

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Not a member of this organisation' }, { status: 403 });
    }

    // Rate limit: 10 LLM calls per minute per org
    const limited = llmLimiter.check(orgId);
    if (limited) return limited;

    const { searchParams } = new URL(request.url);
    const periodEnd = searchParams.get('periodEnd') ?? new Date().toISOString().slice(0, 7) + '-01';

    const result = await detectAnomalies(orgId, periodEnd);

    if (result.anomalies.length > 0) {
      const highCount = result.anomalies.filter((a) => a.severity === 'high').length;

      await logAudit({
        orgId,
        userId: user.id,
        action: 'anomaly.detection_run',
        entityType: 'anomaly_detection',
        entityId: orgId,
        metadata: {
          anomalyCount: result.anomalies.length,
          highSeverity: highCount,
          periodEnd,
        },
      });

      // Push notification for high-severity anomalies
      if (highCount > 0) {
        await createNotification({
          userId: user.id,
          orgId,
          type: 'intelligence',
          title: `${highCount} high-severity anomal${highCount === 1 ? 'y' : 'ies'} detected`,
          body: result.anomalies
            .filter((a) => a.severity === 'high')
            .slice(0, 3)
            .map((a) => a.title)
            .join('; '),
          actionUrl: '/intelligence/anomalies',
        }).catch(() => {}); // Fire-and-forget
      }
    }

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[anomalies] GET error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
