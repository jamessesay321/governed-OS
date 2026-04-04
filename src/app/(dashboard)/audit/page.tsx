import { getUserProfile } from '@/lib/auth/get-user-profile';
import { createClient } from '@/lib/supabase/server';
import { hasMinRole } from '@/lib/supabase/roles';
import type { Role } from '@/types';
import AuditLogClient from './audit-log-client';

export default async function AuditPage() {
  const { orgId, role } = await getUserProfile();
  const supabase = await createClient();

  const userRole = role as Role;
  if (!hasMinRole(userRole, 'advisor')) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">
          You do not have permission to view audit logs.
        </p>
      </div>
    );
  }

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(500);

  // Fetch profile names for display
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('org_id', orgId);

  const nameMap: Record<string, string> = {};
  for (const p of profiles ?? []) {
    nameMap[p.id] = p.display_name;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Audit Log</h2>
        <p className="text-sm text-muted-foreground">
          Immutable log of all actions. Cannot be modified or deleted.
        </p>
      </div>

      <AuditLogClient logs={logs ?? []} nameMap={nameMap} />
    </div>
  );
}
