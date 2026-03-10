import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { hasMinRole } from '@/lib/supabase/roles';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Role } from '@/types';

export default async function AuditPage() {
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

  const userRole = profile.role as Role;
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
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false })
    .limit(100);

  // Fetch profile names for display
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('org_id', profile.org_id);

  const nameMap = new Map<string, string>();
  for (const p of profiles || []) {
    nameMap.set(p.id, p.display_name);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Audit Log</h2>

      <Card>
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
          <CardDescription>
            Immutable log of all actions. Cannot be modified or deleted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(!logs || logs.length === 0) ? (
            <p className="py-8 text-center text-muted-foreground">
              No audit entries yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {nameMap.get(log.user_id) || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.entity_type}
                      {log.entity_id && (
                        <span className="ml-1 text-muted-foreground">
                          ({log.entity_id.slice(0, 8)})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                      {log.changes
                        ? JSON.stringify(log.changes)
                        : log.metadata
                          ? JSON.stringify(log.metadata)
                          : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
