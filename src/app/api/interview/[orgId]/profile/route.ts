import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

type Params = { params: Promise<{ orgId: string }> };

const profileSchema = z.object({
  companyName: z.string().max(200).optional().default(''),
  website: z.string().max(500).optional().default(''),
  linkedIn: z.string().max(500).optional().default(''),
  twitter: z.string().max(500).optional().default(''),
  instagram: z.string().max(500).optional().default(''),
  tiktok: z.string().max(500).optional().default(''),
  pinterest: z.string().max(500).optional().default(''),
  industry: z.string().max(200).optional().default(''),
  companySize: z.string().max(100).optional().default(''),
  revenueRange: z.string().max(100).optional().default(''),
  fiscalYearEnd: z.string().max(50).optional().default(''),
  country: z.string().max(100).optional().default(''),
  yearEstablished: z.string().max(10).optional().default(''),
  description: z.string().max(2000).optional().default(''),
  goals: z.string().max(2000).optional().default(''),
  challenges: z.string().max(2000).optional().default(''),
});

// POST /api/interview/[orgId]/profile — Save business profile form data
export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    const { profile } = await requireRole('viewer');

    // Verify org membership
    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Not a member of this organisation' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
    }

    const formData = parsed.data;
    const service = await createServiceClient();

    // Check for existing profile row for this org
    const { data: existing } = await service
      .from('business_context_profiles' as any)
      .select('id, interview_status')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      // Update existing row — store form data in raw_interview_data and mapped columns
      await service
        .from('business_context_profiles' as any)
        .update({
          industry: formData.industry || null,
          revenue_range: formData.revenueRange || null,
          employee_count: parseEmployeeCount(formData.companySize),
          raw_interview_data: {
            ...((existing as any).raw_interview_data || {}),
            company_profile: formData,
          },
          interview_status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', (existing as any).id);
    } else {
      // Create new profile row
      await service
        .from('business_context_profiles' as any)
        .insert({
          org_id: orgId,
          created_by: profile.id,
          industry: formData.industry || null,
          revenue_range: formData.revenueRange || null,
          employee_count: parseEmployeeCount(formData.companySize),
          raw_interview_data: { company_profile: formData },
          interview_status: 'completed',
          completed_at: new Date().toISOString(),
        } as any);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[interview/profile] POST error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/interview/[orgId]/profile — Load saved business profile
export async function GET(_request: Request, { params }: Params) {
  try {
    const { orgId } = await params;
    const { profile } = await requireRole('viewer');

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Not a member of this organisation' }, { status: 403 });
    }

    const service = await createServiceClient();

    const { data } = await service
      .from('business_context_profiles' as any)
      .select('id, raw_interview_data, industry, revenue_range, employee_count, interview_status')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!data) {
      return NextResponse.json({ profile: null });
    }

    const raw = (data as any).raw_interview_data?.company_profile;
    return NextResponse.json({ profile: raw || null, status: (data as any).interview_status });
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[interview/profile] GET error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function parseEmployeeCount(size: string): number | null {
  if (!size) return null;
  const match = size.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}
