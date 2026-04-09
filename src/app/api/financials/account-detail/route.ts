import { NextResponse, type NextRequest } from 'next/server';
import { requireRole } from '@/lib/supabase/roles';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

/**
 * Query schema for account-detail drill-down.
 * Accepts orgId, accountId (UUID from chart_of_accounts), and a date range.
 */
const querySchema = z.object({
  orgId: z.string().uuid('orgId must be a valid UUID'),
  accountId: z.string().min(1, 'accountId is required'), // UUID or account code
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'periodStart must be YYYY-MM-DD'),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'periodEnd must be YYYY-MM-DD'),
});

export interface AccountDetailLineItem {
  id: string;
  date: string;
  contactName: string;
  description: string;
  reference: string;
  amount: number;
  type: string;
}

/**
 * GET /api/financials/account-detail?orgId=...&accountId=...&periodStart=...&periodEnd=...
 *
 * Returns invoice-level line items from raw_transactions for a given account
 * within the specified date range. Supports drill-down from the income statement.
 *
 * Auth: requireRole('viewer') + org_id ownership check.
 * RLS: Uses service client but validates org membership server-side.
 */
export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireRole('viewer');

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      orgId: url.searchParams.get('orgId'),
      accountId: url.searchParams.get('accountId'),
      periodStart: url.searchParams.get('periodStart'),
      periodEnd: url.searchParams.get('periodEnd'),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const { orgId, accountId, periodStart, periodEnd } = parsed.data;

    // Org ownership check — user must belong to this org
    if (profile.org_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createServiceClient();

    // Look up the account — try by UUID first, then by code (fallback)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accountId);
    const accountQuery = isUuid
      ? supabase.from('chart_of_accounts').select('id, code, name').eq('id', accountId).eq('org_id', orgId).single()
      : supabase.from('chart_of_accounts').select('id, code, name').eq('code', accountId).eq('org_id', orgId).single();

    const { data: account } = await accountQuery;

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Fetch raw transactions for this org in the date range
    // Only invoices and bills (not bank_transactions to avoid double-counting)
    const { data: rawTransactions, error: txError } = await supabase
      .from('raw_transactions')
      .select('id, xero_id, date, type, contact_name, line_items, raw_payload')
      .eq('org_id', orgId)
      .gte('date', periodStart)
      .lte('date', periodEnd)
      .in('type', ['invoice', 'bill', 'credit_note']);

    if (txError) {
      console.error('[ACCOUNT_DETAIL] Query error:', txError);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    // Extract line items coded to this account
    const lineItems: AccountDetailLineItem[] = [];

    for (const tx of rawTransactions ?? []) {
      const raw = tx.raw_payload as Record<string, unknown> | null;
      const lines = (tx.line_items ?? []) as Array<Record<string, unknown>>;

      for (const line of lines) {
        const lineAccountCode = String(line.AccountCode ?? line.accountCode ?? '');
        if (lineAccountCode === account.code) {
          lineItems.push({
            id: `${tx.id}-${lineItems.length}`,
            date: tx.date,
            contactName: tx.contact_name ?? '',
            description: String(line.Description ?? line.description ?? ''),
            reference: String(
              raw?.Reference ?? raw?.reference ?? raw?.InvoiceNumber ?? raw?.invoiceNumber ?? ''
            ),
            amount: Number(line.LineAmount ?? line.lineAmount ?? 0),
            type: tx.type,
          });
        }
      }
    }

    // Sort by date descending
    lineItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      account: { id: accountId, code: account.code, name: account.name },
      periodStart,
      periodEnd,
      lineItems,
      count: lineItems.length,
      total: lineItems.reduce((sum, li) => sum + li.amount, 0),
    });
  } catch (err) {
    console.error('[ACCOUNT_DETAIL] Error:', err);
    if (err instanceof Error && err.name === 'AuthorizationError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch account detail' },
      { status: 500 }
    );
  }
}
