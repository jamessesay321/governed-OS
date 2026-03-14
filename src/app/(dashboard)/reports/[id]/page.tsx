import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { ReportViewer } from '@/components/reports/report-viewer';
import type { Report } from '@/types/reports';

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
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

  const { data: report, error } = await supabase
    .from('reports' as any)
    .select('*')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single();

  if (error || !report) return notFound();

  return (
    <div className="space-y-6">
      <ReportViewer report={report as unknown as Report} orgId={profile.org_id} />
    </div>
  );
}
