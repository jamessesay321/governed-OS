import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { HealthPageClient } from './health-client';

export default async function DataHealthPage() {
  const { orgId } = await getUserProfile();
  const supabase = await createClient();

  // Fetch real data in parallel
  const [xeroResult, syncResult, healthResult, syncErrorsResult] = await Promise.all([
    supabase
      .from('xero_connections')
      .select('status, updated_at')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .single(),
    supabase
      .from('sync_log')
      .select('status, records_synced, started_at, completed_at, error_message')
      .eq('org_id', orgId)
      .order('started_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('data_health_reports')
      .select('*')
      .eq('org_id', orgId)
      .order('period', { ascending: false })
      .limit(3),
    supabase
      .from('sync_log')
      .select('id, status, error_message, started_at')
      .eq('org_id', orgId)
      .not('error_message', 'is', null)
      .order('started_at', { ascending: false })
      .limit(10),
  ]);

  const xeroConnected = !!xeroResult.data;
  const lastSync = syncResult.data;
  const healthReports = healthResult.data ?? [];
  const syncErrors = (syncErrorsResult.data ?? []).map((e, i) => ({
    id: e.id || String(i),
    integration: 'Xero',
    message: e.error_message || 'Unknown error',
    timestamp: e.started_at,
    severity: (e.status === 'failed' ? 'error' : 'warning') as 'error' | 'warning',
  }));

  // Count total records from last sync
  const recordCount = lastSync?.records_synced ?? 0;

  // Compute overall health from most recent report
  const latestReport = healthReports[0] ?? null;
  const overallScore = latestReport?.overall_score ?? 0;
  const checks = (latestReport?.checks ?? []) as Array<{
    name: string;
    score: number;
    status: 'pass' | 'warn' | 'fail';
    message: string;
  }>;

  // Derive integration status from health score
  let integrationStatus: 'healthy' | 'warning' | 'error' | 'inactive' = 'inactive';
  if (xeroConnected) {
    if (overallScore >= 80) integrationStatus = 'healthy';
    else if (overallScore >= 50) integrationStatus = 'warning';
    else integrationStatus = 'error';
  }

  // Format last sync time
  const lastSyncAt = lastSync?.completed_at || lastSync?.started_at || null;
  const lastSyncLabel = lastSyncAt
    ? formatTimeAgo(new Date(lastSyncAt))
    : 'Never';

  const integration = xeroConnected
    ? {
        name: 'Xero',
        colour: '#13B5EA',
        status: integrationStatus,
        lastSync: lastSyncLabel,
        dataQuality: overallScore,
        recordCount,
      }
    : null;

  return (
    <HealthPageClient
      integration={integration}
      healthReports={healthReports}
      checks={checks}
      syncErrors={syncErrors}
      orgId={orgId}
    />
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}
