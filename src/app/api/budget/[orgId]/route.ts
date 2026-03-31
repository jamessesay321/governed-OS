import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { getBudgetLines, upsertBudgetLines } from '@/lib/variance/engine';
import { logAudit } from '@/lib/audit/log';
import { z } from 'zod';

// GET /api/budget/[orgId]?period=YYYY-MM-01 — Get budget lines (viewer+)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { profile } = await requireRole('viewer');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const period = url.searchParams.get('period') || undefined;

    const lines = await getBudgetLines(orgId, period);
    return NextResponse.json(lines);
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch budget lines' }, { status: 500 });
  }
}

const budgetLineSchema = z.object({
  category: z.string().min(1),
  period: z.string().regex(/^\d{4}-\d{2}-01$/),
  budgeted_amount: z.number(),
  account_code: z.string().optional(),
  account_name: z.string().optional(),
});

const budgetLinesSchema = z.object({
  lines: z.array(budgetLineSchema).min(1),
});

// POST /api/budget/[orgId] — Upsert budget lines (advisor+)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { user, profile } = await requireRole('advisor');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = budgetLinesSchema.parse(body);

    const upserted = await upsertBudgetLines(orgId, parsed.lines);

    await logAudit({
      orgId,
      userId: user.id,
      action: 'budget.lines_upserted',
      entityType: 'budget_line',
      metadata: { lineCount: parsed.lines.length, upserted },
    });

    return NextResponse.json(
      { message: `Upserted ${upserted} budget lines` },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Invalid budget data' }, { status: 400 });
  }
}
