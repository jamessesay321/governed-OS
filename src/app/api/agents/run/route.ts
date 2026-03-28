import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/supabase/roles';
import { getUserProfile } from '@/lib/auth/get-user-profile';
import { updateTrustLevel } from '@/lib/agents/runtime';
import type { BaseAgent } from '@/lib/agents/runtime';
import { FinanceAgent } from '@/lib/agents/implementations/finance-agent';
import { SetupAgent } from '@/lib/agents/implementations/setup-agent';

// ---------------------------------------------------------------------------
// Agent registry — maps agent IDs to their implementations
// ---------------------------------------------------------------------------

const AGENT_IMPLEMENTATIONS: Record<string, () => BaseAgent> = {
  'agent-finance': () => new FinanceAgent(),
  'agent-setup': () => new SetupAgent(),
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const RunAgentSchema = z.object({
  agentId: z.string().min(1),
  context: z.record(z.string(), z.unknown()).optional().default({}),
});

// ---------------------------------------------------------------------------
// POST /api/agents/run — trigger an agent run
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    await requireRole('admin');
    const { orgId } = await getUserProfile();

    const body = await request.json();
    const parsed = RunAgentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { agentId, context } = parsed.data;

    // Look up the agent implementation
    const factory = AGENT_IMPLEMENTATIONS[agentId];
    if (!factory) {
      return NextResponse.json(
        { error: `Unknown agent: ${agentId}. Available: ${Object.keys(AGENT_IMPLEMENTATIONS).join(', ')}` },
        { status: 400 },
      );
    }

    const agent = factory();

    // Run the agent pipeline
    const result = await agent.run(orgId, context);

    // After a successful run, re-evaluate trust level
    if (result.status !== 'failed') {
      await updateTrustLevel(orgId, agentId);
    }

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[agents/run] POST error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
