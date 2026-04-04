import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

/* ─── Zod schemas ─── */

const createChallengeSchema = z.object({
  page: z.string().min(1).max(100),
  metricLabel: z.string().min(1).max(200),
  metricValue: z.string().max(100).optional(),
  period: z.string().max(20).optional(),
  accountId: z.string().uuid().optional(),
  reason: z.string().min(1).max(2000),
  expectedValue: z.string().max(200).optional(),
  severity: z.enum(['question', 'concern', 'error']).default('question'),
  contextJson: z.record(z.string(), z.unknown()).optional(),
});

const updateChallengeSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['open', 'investigating', 'resolved', 'dismissed']),
  resolutionNotes: z.string().max(2000).optional(),
});

/* ─── GET: List challenges for org ─── */

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const orgId = profile.org_id as string;

  const { data: challenges, error } = await supabase
    .from('number_challenges' as any)
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ challenges: challenges ?? [] });
}

/* ─── POST: Create a new challenge ─── */

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const orgId = profile.org_id as string;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createChallengeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;

  const { data: challenge, error } = await supabase
    .from('number_challenges' as any)
    .insert({
      org_id: orgId,
      created_by: user.id,
      page: input.page,
      metric_label: input.metricLabel,
      metric_value: input.metricValue ?? null,
      period: input.period ?? null,
      account_id: input.accountId ?? null,
      reason: input.reason,
      expected_value: input.expectedValue ?? null,
      severity: input.severity,
      context_json: input.contextJson ?? null,
      status: 'open',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log
  await logAudit(
    {
      orgId,
      userId: user.id,
      action: 'challenge.created',
      entityType: 'number_challenge',
      entityId: ((challenge as unknown) as Record<string, unknown>).id as string,
      changes: {
        page: input.page,
        metric_label: input.metricLabel,
        severity: input.severity,
      },
    },
    { critical: false },
  );

  return NextResponse.json({ challenge }, { status: 201 });
}

/* ─── PATCH: Update challenge status (resolve/dismiss) ─── */

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const role = profile.role as string;
  if (!['owner', 'admin', 'advisor'].includes(role)) {
    return NextResponse.json({ error: 'Only admins can resolve challenges' }, { status: 403 });
  }

  const orgId = profile.org_id as string;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateChallengeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;

  const updateData: Record<string, unknown> = {
    status: input.status,
  };

  if (input.status === 'resolved' || input.status === 'dismissed') {
    updateData.resolved_by = user.id;
    updateData.resolved_at = new Date().toISOString();
    updateData.resolution_notes = input.resolutionNotes ?? null;
  }

  const { data: challenge, error } = await supabase
    .from('number_challenges' as any)
    .update(updateData)
    .eq('id', input.id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit(
    {
      orgId,
      userId: user.id,
      action: `challenge.${input.status}`,
      entityType: 'number_challenge',
      entityId: input.id,
      changes: { status: input.status, resolution_notes: input.resolutionNotes },
    },
    { critical: false },
  );

  return NextResponse.json({ challenge });
}
