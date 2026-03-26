'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

type Permission = 'view' | 'comment' | 'edit' | 'co_own';

interface ShareEntry {
  email: string;
  name?: string;
  role?: string;
  permission: Permission;
}

interface ShareModalProps {
  entityType: string;
  entityName: string;
  open: boolean;
  onClose: () => void;
  onShare?: (entries: ShareEntry[], message: string) => void;
}

const PERMISSION_OPTIONS: { value: Permission; label: string; description: string }[] = [
  { value: 'view', label: 'View Only', description: 'Can see but not edit' },
  { value: 'comment', label: 'Comment', description: 'Can view and add comments' },
  { value: 'edit', label: 'Edit', description: 'Can make changes' },
  { value: 'co_own', label: 'Co-Own', description: 'Full control including sharing' },
];

export function ShareModal({ entityType, entityName, open, onClose, onShare }: ShareModalProps) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<Permission>('view');
  const [entries, setEntries] = useState<ShareEntry[]>([]);
  const [message, setMessage] = useState('');

  if (!open) return null;

  function addEntry() {
    if (!email.trim()) return;
    setEntries(prev => [...prev, { email: email.trim(), permission }]);
    setEmail('');
  }

  function removeEntry(idx: number) {
    setEntries(prev => prev.filter((_, i) => i !== idx));
  }

  function handleShare() {
    onShare?.(entries, message);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Share {entityType}</h3>
            <p className="text-sm text-muted-foreground">{entityName}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Add people */}
        <div className="space-y-2">
          <Label>Invite people</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addEntry()}
              className="flex-1"
            />
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value as Permission)}
              className="rounded-md border bg-background px-2 py-2 text-sm"
            >
              {PERMISSION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <Button size="sm" onClick={addEntry}>Add</Button>
          </div>
        </div>

        {/* Added entries */}
        {entries.length > 0 && (
          <div className="space-y-2">
            {entries.map((entry, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {entry.email[0].toUpperCase()}
                  </div>
                  <span className="text-sm">{entry.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {PERMISSION_OPTIONS.find(o => o.value === entry.permission)?.label}
                  </Badge>
                  <button onClick={() => removeEntry(i)} className="text-muted-foreground hover:text-foreground">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Optional message */}
        <div className="space-y-2">
          <Label>Add a message (optional)</Label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Here's the Q2 scenario. Need your input on hiring assumptions"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none h-20 outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Copy link */}
        <button className="flex items-center gap-2 text-sm text-primary hover:underline">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.182a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
          Copy link
        </button>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleShare} disabled={entries.length === 0} className="flex-1">
            Share
          </Button>
        </div>
      </div>
    </div>
  );
}
