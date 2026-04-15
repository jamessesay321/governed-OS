import { NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createUntypedServiceClient } from '@/lib/supabase/server';

/**
 * POST /api/debt/backfill-history
 * One-time backfill of balance history for existing facilities that have none.
 * Generates 6 months of declining balance data to populate sparklines.
 */
export async function POST() {
  try {
    const { orgId } = await getUserProfile();
    const supabase = await createUntypedServiceClient();

    // Get all active facilities
    const { data: facilities } = await supabase
      .from('debt_facilities')
      .select('id, facility_name, current_balance, original_amount, monthly_repayment')
      .eq('org_id', orgId)
      .eq('status', 'active');

    if (!facilities || facilities.length === 0) {
      return NextResponse.json({ message: 'No facilities found', count: 0 });
    }

    // Check which already have history
    const facilityIds = facilities.map((f: Record<string, unknown>) => f.id as string);
    const { data: existingHistory } = await supabase
      .from('debt_balance_history')
      .select('facility_id')
      .in('facility_id', facilityIds);

    const hasHistory = new Set(
      ((existingHistory ?? []) as Array<{ facility_id: string }>).map((h) => h.facility_id)
    );

    const historyRows: Array<{
      org_id: string;
      facility_id: string;
      period: string;
      balance: number;
      is_projected: boolean;
    }> = [];

    for (const facility of facilities as Array<Record<string, unknown>>) {
      if (hasHistory.has(facility.id as string)) continue;

      const currentBalance = Number(facility.current_balance);
      const originalAmount = Number(facility.original_amount);
      const monthlyRepayment = Number(facility.monthly_repayment);

      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const period = date.toISOString().slice(0, 7);

        const pastBalance = Math.min(
          originalAmount,
          currentBalance + (i * monthlyRepayment * 0.7)
        );

        historyRows.push({
          org_id: orgId,
          facility_id: facility.id as string,
          period,
          balance: Math.round(pastBalance * 100) / 100,
          is_projected: false,
        });
      }
    }

    if (historyRows.length === 0) {
      return NextResponse.json({ message: 'All facilities already have history', count: 0 });
    }

    const { error } = await supabase.from('debt_balance_history').insert(historyRows);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `Backfilled ${historyRows.length} balance history records for ${historyRows.length / 6} facilities`,
      count: historyRows.length,
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
