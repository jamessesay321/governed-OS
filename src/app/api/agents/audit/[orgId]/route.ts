import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { getAgentAuditTrail, getAgentStats } from '@/lib/agents/audit';

type Params = { params: Promise<{ orgId: string }> };

// GET /api/agents/audit/[orgId] — get agent audit trail and optional stats
export async function GET(request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    const { profile } = await requireRole('viewer');

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Not a member of this organisation' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId') ?? undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(500, Math.max(1, parseInt(limitParam, 10))) : 100;
    const includeStats = searchParams.get('stats') === 'true';

    const trail = await getAgentAuditTrail(orgId, agentId, limit);

    const response: Record<string, unknown> = { trail };

    if (includeStats && agentId) {
      const stats = await getAgentStats(orgId, agentId);
      response.stats = stats;
    }

    return NextResponse.json(response);
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[agents/audit] GET error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
