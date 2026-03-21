'use client';

import Link from 'next/link';

export default function TeamSettingsPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground">&larr; Settings</Link>
      <div>
        <h2 className="text-2xl font-bold">Team & Roles</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage team members and their access levels</p>
      </div>
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b flex items-center justify-between">
          <span className="text-sm font-medium">Team Members</span>
          <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            Invite Member
          </button>
        </div>
        <div className="p-8 text-center text-sm text-muted-foreground">
          No team members yet. Invite your first team member to get started.
        </div>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">Role Permissions</h3>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex justify-between"><span className="font-medium text-foreground">Admin</span><span>Full access: manage team, settings, billing</span></div>
          <div className="flex justify-between"><span className="font-medium text-foreground">Advisor</span><span>View all data, run assessments, create reports</span></div>
          <div className="flex justify-between"><span className="font-medium text-foreground">Viewer</span><span>View dashboards and reports only</span></div>
          <div className="flex justify-between"><span className="font-medium text-foreground">Investor</span><span>View shared reports and KPIs only</span></div>
        </div>
      </div>
    </div>
  );
}
