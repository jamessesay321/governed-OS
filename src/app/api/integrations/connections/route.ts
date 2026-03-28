import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import {
  INTEGRATIONS,
  getConnectedIntegrations,
  upsertConnection,
} from '@/lib/integrations/framework';
import { z } from 'zod';

const createConnectionSchema = z.object({
  integrationId: z.string(),
  syncFrequency: z.enum(['realtime', 'hourly', 'daily', 'manual']).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

/**
 * GET /api/integrations/connections
 * List all integrations with their connection status for the current org.
 */
export async function GET() {
  try {
    const { profile } = await requireRole('viewer');
    const orgId = profile.org_id as string;

    const connections = await getConnectedIntegrations(orgId);
    const connectedIds = new Set(connections.map((c) => c.integrationId));

    // Return the full registry with connection status
    const integrations = INTEGRATIONS.map((def) => ({
      ...def,
      status: connectedIds.has(def.id) ? 'connected' as const : def.status,
      connection: connections.find((c) => c.integrationId === def.id) ?? null,
    }));

    return NextResponse.json({ integrations, connections });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[INTEGRATIONS] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/integrations/connections
 * Create or update an integration connection.
 */
export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireRole('admin');
    const orgId = profile.org_id as string;

    const body = await request.json();
    const parsed = createConnectionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const { integrationId, syncFrequency, config } = parsed.data;

    // Verify integration exists in registry
    const def = INTEGRATIONS.find((i) => i.id === integrationId);
    if (!def) {
      return NextResponse.json(
        { error: `Unknown integration: ${integrationId}` },
        { status: 400 }
      );
    }

    const connection = await upsertConnection(orgId, integrationId, {
      status: 'active',
      syncFrequency: syncFrequency ?? 'manual',
      config: config ?? {},
    });

    return NextResponse.json({ connection });
  } catch (err) {
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[INTEGRATIONS] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
