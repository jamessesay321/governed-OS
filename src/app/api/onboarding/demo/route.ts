import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { logAudit } from '@/lib/audit/log';
import { z } from 'zod';
import { generateAllDemoData } from '@/lib/demo/generate-demo-data';

const demoSchema = z.object({
  companyName: z.string().min(1).max(200),
  industry: z.string().min(1).max(100),
  teamSize: z.string().min(1).max(20),
  websiteUrl: z.string().url().max(500).optional(),
  socialUrl: z.string().url().max(500).optional(),
  revenueRange: z.string().max(50).optional(),
});

/**
 * POST /api/onboarding/demo
 * Sets up demo mode: generates comprehensive sample data across
 * chart of accounts, financials, KPIs, budgets, scenarios, and playbook actions.
 */
export async function POST(request: Request) {
  try {
    const { user, profile } = await requireRole('admin');

    const body = await request.json();
    const parsed = demoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please provide at least a company name and industry' },
        { status: 400 }
      );
    }

    const { companyName, industry, teamSize, websiteUrl, socialUrl, revenueRange } = parsed.data;

    // Generate all demo data (chart of accounts, financials, KPIs, budgets, scenarios, playbook)
    await generateAllDemoData({
      orgId: profile.org_id,
      companyName,
      industry,
      teamSize,
      websiteUrl,
      socialUrl,
      revenueRange,
    });

    await logAudit({
      orgId: profile.org_id,
      userId: user.id,
      action: 'onboarding.demo_completed',
      entityType: 'organisation',
      entityId: profile.org_id,
      metadata: { industry, teamSize, companyName, revenueRange, hasWebsite: !!websiteUrl, hasSocial: !!socialUrl },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DEMO] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
