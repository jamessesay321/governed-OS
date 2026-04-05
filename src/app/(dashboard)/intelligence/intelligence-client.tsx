'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IntelligenceFeed } from '@/components/intelligence/intelligence-feed';
import type { IntelligenceEvent, IntelligenceImpact, Role } from '@/types';
import { ROLE_HIERARCHY } from '@/types';

type EventWithImpact = IntelligenceEvent & {
  impact?: IntelligenceImpact | null;
};

interface IntelligenceClientProps {
  events: EventWithImpact[];
  orgId: string;
  role: string;
}

function hasMinRole(userRole: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

export function IntelligenceClient({
  events: initialEvents,
  orgId,
  role,
}: IntelligenceClientProps) {
  const [events, setEvents] = useState(initialEvents);
  const [seeding, setSeeding] = useState(false);
  const [analysing, setAnalysing] = useState<string | null>(null);

  const canSeed = hasMinRole(role as Role, 'admin');
  const canAnalyse = hasMinRole(role as Role, 'advisor');

  async function handleSeed() {
    setSeeding(true);
    try {
      const res = await fetch('/api/intelligence/events', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setEvents((prev) => [
          ...data.events.map((e: IntelligenceEvent) => ({ ...e, impact: null })),
          ...prev,
        ]);
      }
    } finally {
      setSeeding(false);
    }
  }

  async function handleAnalyse(eventId: string) {
    if (!canAnalyse) return;
    setAnalysing(eventId);
    try {
      const res = await fetch('/api/intelligence/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          org_name: 'Your Organisation',
          sector: 'technology',
          country: 'GB',
          annual_revenue: 50000000, // £500k in pence
          employee_count: 15,
          outstanding_debt: 10000000, // £100k in pence
        }),
      });

      if (res.ok) {
        const impact = await res.json();
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId ? { ...e, impact } : e
          )
        );
      }
    } finally {
      setAnalysing(null);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/home" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Home
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Intelligence</h2>
          <p className="text-sm text-muted-foreground">
            Economic events and their impact on your business
          </p>
        </div>
        {canSeed && events.length === 0 && (
          <Button onClick={handleSeed} disabled={seeding}>
            {seeding ? 'Seeding...' : 'Seed Events'}
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Analysed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.filter((e) => e.impact).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              High/Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {events.filter((e) => e.severity === 'high' || e.severity === 'critical').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event feed */}
      <IntelligenceFeed
        events={events}
        orgId={orgId}
        onAnalyse={canAnalyse ? handleAnalyse : undefined}
        analysing={analysing}
      />
    </div>
  );
}
