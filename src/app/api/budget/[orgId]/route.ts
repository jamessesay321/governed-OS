import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { getBudgetLines, upsertBudgetLines } from '@/lib/variance/engine';
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
    const message = e instanceof Error ? e.message : 'Unauthorized';
    const status = e instanceof Error && e.name === 'AuthorizationError' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

const budgetLineSchema = z.object({
  category: z.string().min(1),
  period: z.string().regex(/^\d{4}-\d{2}-01$/),
  amount_pence: z.number().int(),
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
    const { profile } = await requireRole('advisor');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = budgetLinesSchema.parse(body);

    const upserted = await upsertBudgetLines(orgId, parsed.lines);

    return NextResponse.json(
      { message: `Upserted ${upserted} budget lines` },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof Error && e.name === 'AuthorizationError') {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    const message = e instanceof Error ? e.message : 'Bad request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
