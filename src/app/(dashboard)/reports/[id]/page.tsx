import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ReportViewer } from '@/components/reports/report-viewer';
import type { Report } from '@/types/reports';

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  const { orgId } = await getUserProfile();
  const supabase = await createClient();

  const { data: report, error } = await supabase
    .from('reports' as any)
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .single();

  if (error || !report) return notFound();

  return (
    <div className="space-y-6">
      <ReportViewer report={report as unknown as Report} orgId={orgId} />
    </div>
  );
}
