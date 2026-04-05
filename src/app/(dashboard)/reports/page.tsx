import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ReportList } from '@/components/reports/report-list';

export default async function ReportsPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from('reports' as any)
    .select('id, org_id, report_type, title, status, period_start, period_end, generated_by, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <Link href="/home" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Home
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Generate and manage board packs, monthly reviews, and investor updates.
          </p>
        </div>
        <Link
          href="/reports/new"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Generate New Report
        </Link>
      </div>

      <ReportList reports={(reports as any) || []} orgId={orgId} />
    </div>
  );
}
