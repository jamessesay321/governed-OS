'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useUser } from '@/components/providers/user-context';

// ============================================================
// Types
// ============================================================

interface TeamMember {
  id: string;
  display_name: string;
  role: string;
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  advisor: 'Advisor',
  viewer: 'Viewer',
};

const ROLE_COLOURS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  advisor: 'bg-emerald-100 text-emerald-800',
  viewer: 'bg-gray-100 text-gray-600',
};

// ============================================================
// Component
// ============================================================

export default function TeamSettingsPage() {
  const { role: currentUserRole } = useUser();
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'owner';

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch('/api/team');
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members);
        setInvitations(data.invitations);
      }
    } catch {
      console.error('Failed to fetch team');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (res.ok) {
        setSuccess(`Invitation sent to ${inviteEmail}`);
        setInviteEmail('');
        setShowInviteForm(false);
        fetchTeam();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to send invitation');
      }
    } catch {
      setError('Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    setError('');
    try {
      const res = await fetch(`/api/team/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        fetchTeam();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to change role');
      }
    } catch {
      setError('Failed to change role');
    }
  };

  const handleRemove = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from the team?`)) return;
    setError('');
    try {
      const res = await fetch(`/api/team/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTeam();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to remove');
      }
    } catch {
      setError('Failed to remove');
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Settings
      </Link>
      <div>
        <h2 className="text-2xl font-bold" style={{ color: '#1c1b1b' }}>Team & Roles</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage team members and their access levels</p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {/* Team Members */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b flex items-center justify-between">
          <span className="text-sm font-medium">
            Team Members {!loading && `(${members.length})`}
          </span>
          {isAdmin && (
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {showInviteForm ? 'Cancel' : 'Invite Member'}
            </button>
          )}
        </div>

        {/* Invite Form */}
        {showInviteForm && (
          <form onSubmit={handleInvite} className="p-4 border-b bg-gray-50 space-y-3">
            <div className="flex gap-3">
              <input
                type="email"
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="viewer">Viewer</option>
                <option value="advisor">Advisor</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={inviting}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {inviting ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading team...</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No team members yet. Invite your first team member to get started.
          </div>
        ) : (
          <div className="divide-y">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                    {(member.display_name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{member.display_name || 'Unnamed'}</p>
                    <p className="text-xs text-muted-foreground">Joined {formatDate(member.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && member.role !== 'owner' ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleChangeRole(member.id, e.target.value)}
                      className="rounded-md border border-gray-200 px-2 py-1 text-xs bg-white"
                    >
                      <option value="admin">Admin</option>
                      <option value="advisor">Advisor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLOURS[member.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {ROLE_LABELS[member.role] ?? member.role}
                    </span>
                  )}
                  {isAdmin && member.role !== 'owner' && (
                    <button
                      onClick={() => handleRemove(member.id, member.display_name)}
                      className="text-xs text-red-500 hover:text-red-700 ml-2"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="rounded-lg border bg-card">
          <div className="p-4 border-b">
            <span className="text-sm font-medium">Pending Invitations ({invitations.length})</span>
          </div>
          <div className="divide-y">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Invited {formatDate(inv.created_at)} &middot; Expires {formatDate(inv.expires_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLOURS[inv.role] ?? 'bg-gray-100 text-gray-600'}`}>
                    {ROLE_LABELS[inv.role] ?? inv.role}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => handleRemove(inv.id, inv.email)}
                      className="text-xs text-red-500 hover:text-red-700 ml-2"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role Permissions Reference */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">Role Permissions</h3>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex justify-between"><span className="font-medium text-foreground">Owner</span><span>Full access, cannot be removed or demoted</span></div>
          <div className="flex justify-between"><span className="font-medium text-foreground">Admin</span><span>Full access: manage team, settings, billing</span></div>
          <div className="flex justify-between"><span className="font-medium text-foreground">Advisor</span><span>View all data, run assessments, create reports</span></div>
          <div className="flex justify-between"><span className="font-medium text-foreground">Viewer</span><span>View dashboards and reports only</span></div>
        </div>
      </div>
    </div>
  );
}
