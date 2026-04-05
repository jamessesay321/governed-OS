'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ClientOrg {
  id: string;
  client_org_id: string;
  org_name: string;
  industry: string | null;
  status: string;
  relationship_type: string;
}

interface ClientSwitcherProps {
  currentOrgName: string;
}

export function ClientSwitcher({ currentOrgName }: ClientSwitcherProps) {
  const router = useRouter();
  const [clients, setClients] = useState<ClientOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await fetch('/api/advisor/clients');
        if (!res.ok) return;
        const data = await res.json();
        setClients(data.clients ?? []);
      } catch (err) {
        console.error('[ClientSwitcher] Failed to fetch clients:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchClients();
  }, []);

  async function handleSwitch(orgId: string | null) {
    setSwitching(true);
    try {
      const res = await fetch('/api/advisor/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
      });
      if (res.ok) {
        router.refresh();
        // Small delay to allow cookie to propagate before full reload
        setTimeout(() => window.location.reload(), 150);
      }
    } catch (err) {
      console.error('[ClientSwitcher] Failed to switch:', err);
    } finally {
      setSwitching(false);
    }
  }

  if (loading || clients.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs font-medium border-dashed"
          disabled={switching}
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
          {switching ? 'Switching...' : 'Switch Client'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {/* My Account option to return to own org */}
        <DropdownMenuItem
          onClick={() => handleSwitch(null)}
          className={cn(
            'flex items-center gap-2 cursor-pointer',
          )}
        >
          <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
            <svg
              className="h-3 w-3 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">My Account</span>
            <span className="text-[10px] text-muted-foreground">Return to your org</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Client list */}
        <div className="px-2 py-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Client Organisations
          </span>
        </div>
        {clients.map((client) => {
          const isActive = currentOrgName === client.org_name;
          return (
            <DropdownMenuItem
              key={client.client_org_id}
              onClick={() => handleSwitch(client.client_org_id)}
              className={cn(
                'flex items-center gap-2 cursor-pointer',
                isActive && 'bg-primary/10 text-primary',
              )}
            >
              <div
                className={cn(
                  'h-5 w-5 rounded flex items-center justify-center flex-shrink-0 text-[10px] font-bold',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {client.org_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium truncate">{client.org_name}</span>
                {client.industry && (
                  <span className="text-[10px] text-muted-foreground truncate">
                    {client.industry}
                  </span>
                )}
              </div>
              {isActive && (
                <svg
                  className="ml-auto h-3.5 w-3.5 text-primary flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
