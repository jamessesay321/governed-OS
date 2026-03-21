import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { getAvailablePeriods } from '@/lib/financial/aggregate';
import { ReportBuilder } from '@/components/reports/report-builder';

export default async function NewReportPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createClient();

  // Fetch available periods from financial data
  const { data: financials } = await supabase
    .from('normalised_financials')
    .select('period')
    .eq('org_id', orgId);

  const periods = getAvailablePeriods(
    (financials || []).map((f) => ({
      ...f,
      id: '',
      org_id: orgId,
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

      <ReportBuilder orgId={orgId} availablePeriods={periods} />
    </div>
  );
}
