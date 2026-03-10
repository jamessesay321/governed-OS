import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { hasMinRole } from '@/lib/supabase/roles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InviteForm } from './invite-form';
import type { Role } from '@/types';

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organisations(name)')
    .eq('id', user.id)
    .single();
  if (!profile) return redirect('/login');

  const userRole = profile.role as Role;
  const canInvite = hasMinRole(userRole, 'admin');

  // Fetch team members
  const { data: members } = await supabase
    .from('profiles')
    .select('*')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: true });

  // Fetch pending invitations
  const { data: invitations } = await supabase
    .from('org_invitations')
    .select('*')
    .eq('org_id', profile.org_id)
    .eq('status', 'pending');

  const orgName = profile.organisations?.name || 'Organisation';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle>Organisation</CardTitle>
          <CardDescription>{orgName}</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {members?.length || 0} member{(members?.length || 0) !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members?.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <p className="font-medium">{member.display_name}</p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {member.role}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {canInvite && (
        <Card>
          <CardHeader>
            <CardTitle>Invite Team Member</CardTitle>
            <CardDescription>
              Send an invitation to join your organisation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteForm />
          </CardContent>
        </Card>
      )}

      {invitations && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <span>{inv.email}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {inv.role}
                    </Badge>
                    <Badge variant="secondary">Pending</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
