import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAvailablePeriods } from '@/lib/financial/aggregate';
import { ReportBuilder } from '@/components/reports/report-builder';

export default async function NewReportPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) return redirect('/login');

  // Fetch available periods from financial data
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('period')
    .eq('org_id', profile.org_id);

  const periods = getAvailablePeriods(
    (financials || []).map((f) => ({
      ...f,
      id: '',
      org_id: profile.org_id,
      account_id: '',
      amount: 0,
      transaction_count: 0,
      source: '',
      created_at: '',
      updated_at: '',
    }))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Generate New Report</h1>
        <p className="text-sm text-muted-foreground">
          Select a report type and configure the parameters to generate a professional report.
        </p>
      </div>

      <ReportBuilder orgId={profile.org_id} availablePeriods={periods} />
    </div>
  );
}
