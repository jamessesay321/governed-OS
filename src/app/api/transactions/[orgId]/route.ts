import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const querySchema = z.object({
  accountId: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
});

/**
 * GET /api/transactions/[orgId]?accountId=...&period=...
 * Fetch raw Xero transactions for a specific account and period.
 * Supports drill-down from P&L → account → transactions.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { profile } = await requireRole('viewer');
    const { orgId } = await params;

    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      accountId: url.searchParams.get('accountId'),
      period: url.searchParams.get('period'),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const { accountId, period } = parsed.data;

    // Get the account code for this account ID
    const supabase = await createServiceClient();
    const { data: account } = await supabase
      .from('chart_of_accounts')
      .select('code, name')
      .eq('id', accountId)
      .eq('org_id', orgId)
      .single();

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Fetch raw transactions for this account code in the given period
    // Period format: YYYY-MM → filter transactions by date within that month
    const startDate = `${period}-01`;
    const [year, month] = period.split('-').map(Number);
    const endDate = new Date(year, month, 0); // Last day of month
    const endDateStr = endDate.toISOString().split('T')[0];

    const { data: rawTransactions } = await supabase
      .from('raw_transactions')
      .select('id, xero_id, date, type, contact_name, line_items, raw_payload')
      .eq('org_id', orgId)
      .gte('date', startDate)
      .lte('date', endDateStr);

    // Filter and extract line items that match this account code
    const transactions: Array<{
      id: string;
      date: string;
      reference: string;
      contact_name: string;
      description: string;
      amount: number;
      type: string;
    }> = [];

    for (const tx of rawTransactions ?? []) {
      const raw = tx.raw_payload as Record<string, unknown> | null;
      const lineItems = (tx.line_items ?? []) as Array<Record<string, unknown>>;

      for (const line of lineItems) {
        const lineAccountCode = String(line.AccountCode ?? line.accountCode ?? '');
        if (lineAccountCode === account.code) {
          transactions.push({
            id: `${tx.id}-${lineAccountCode}`,
            date: tx.date,
            reference: String(raw?.Reference ?? raw?.reference ?? raw?.InvoiceNumber ?? ''),
            contact_name: tx.contact_name ?? '',
            description: String(line.Description ?? line.description ?? ''),
            amount: Number(line.LineAmount ?? line.lineAmount ?? 0),
            type: tx.type,
          });
        }
      }
    }

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      account: { code: account.code, name: account.name },
      period,
      transactions,
      count: transactions.length,
    });
  } catch (err) {
    console.error('[TRANSACTIONS] Error:', err);
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
