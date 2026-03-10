import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';
import { authSetupSchema } from '@/lib/schemas';

/**
 * POST /api/auth/setup
 * Creates an organisation and owner profile after signup.
 * Uses service role client to bypass RLS during initial setup.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = authSetupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { orgName, displayName, userId } = parsed.data;
    const supabase = await createServiceClient();

    // 1. Create organisation
    const { data: org, error: orgError } = await supabase
      .from('organisations')
      .insert({ name: orgName })
      .select()
      .single();

    if (orgError) {
      console.error('[SETUP] Failed to create org:', orgError);
      return NextResponse.json(
        { error: 'Failed to create organisation' },
        { status: 500 }
      );
    }

    // 2. Create owner profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      org_id: org.id,
      role: 'owner',
      display_name: displayName,
    });

    if (profileError) {
      console.error('[SETUP] Failed to create profile:', profileError);
      // Clean up the org we just created
      await supabase.from('organisations').delete().eq('id', org.id);
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500 }
      );
    }

    // 3. Audit log
    await logAudit({
      orgId: org.id,
      userId,
      action: 'org.created',
      entityType: 'organisation',
      entityId: org.id,
      changes: { name: orgName },
    });

    return NextResponse.json({ orgId: org.id });
  } catch (err) {
    console.error('[SETUP] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
