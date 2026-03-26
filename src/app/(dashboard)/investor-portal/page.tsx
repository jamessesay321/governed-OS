'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface InvestorRoom {
  id: string;
  name: string;
  template: 'light' | 'detailed' | 'custom';
  status: 'draft' | 'active' | 'archived';
  investorCount: number;
  lastViewed: string | null;
  readinessScore: number | null;
  createdAt: string;
}

const DEMO_ROOMS: InvestorRoom[] = [
  {
    id: '1',
    name: 'Series A: Exploration',
    template: 'detailed',
    status: 'active',
    investorCount: 3,
    lastViewed: '2 hours ago',
    readinessScore: 78,
    createdAt: '2026-03-20',
  },
  {
    id: '2',
    name: 'Angel Round: Overview',
    template: 'light',
    status: 'active',
    investorCount: 5,
    lastViewed: '1 day ago',
    readinessScore: 85,
    createdAt: '2026-03-15',
  },
  {
    id: '3',
    name: 'Advisory Board Pack',
    template: 'custom',
    status: 'draft',
    investorCount: 0,
    lastViewed: null,
    readinessScore: null,
    createdAt: '2026-03-25',
  },
];

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  draft: 'bg-slate-100 text-slate-600',
  archived: 'bg-slate-50 text-slate-400',
};

export default function InvestorPortalPage() {
  const [rooms] = useState<InvestorRoom[]>(DEMO_ROOMS);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Investor Portal</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create secure, branded data rooms for investors and advisors
          </p>
        </div>
        <Link href="/investor-portal/builder">
          <Button>
            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Room
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{rooms.filter(r => r.status === 'active').length}</div>
            <p className="text-sm text-muted-foreground">Active Rooms</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{rooms.reduce((s, r) => s + r.investorCount, 0)}</div>
            <p className="text-sm text-muted-foreground">Total Investors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">82%</div>
            <p className="text-sm text-muted-foreground">Avg Readiness Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">12</div>
            <p className="text-sm text-muted-foreground">Total Views This Week</p>
          </CardContent>
        </Card>
      </div>

      {/* Rooms list */}
      <div className="space-y-3">
        {rooms.map((room) => (
          <Card key={room.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-foreground">{room.name}</h3>
                    <Badge variant="outline" className={STATUS_STYLES[room.status]}>
                      {room.status}
                    </Badge>
                    <Badge variant="outline" className="bg-slate-50 text-slate-500">
                      {room.template}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-1.997M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                      </svg>
                      {room.investorCount} investors
                    </span>
                    {room.lastViewed && <span>Last viewed {room.lastViewed}</span>}
                    {room.readinessScore !== null && (
                      <span className="flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Readiness: {room.readinessScore}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">Preview</Button>
                  <Button variant="outline" size="sm">Share</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTA to build more */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <svg className="h-10 w-10 text-muted-foreground mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
          </svg>
          <h3 className="font-semibold text-foreground mb-1">Share with confidence</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Create a branded data room with live financials, interactive scenarios, and engagement tracking.
            Your investors see a premium experience, not a document dump.
          </p>
          <Link href="/investor-portal/builder" className="mt-4">
            <Button variant="outline">Create Your First Room</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
