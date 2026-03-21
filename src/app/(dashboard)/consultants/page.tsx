'use client';

import { useState } from 'react';
import { IntelligencePageWrapper } from '@/components/intelligence/intelligence-page-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// ── Mock consultant data ─────────────────────────────────────────

interface Consultant {
  id: string;
  name: string;
  title: string;
  specialisms: string[];
  rating: number;
  reviews: number;
  hourlyRate: number;
  availability: 'available' | 'busy' | 'unavailable';
  bio: string;
}

const CONSULTANTS: Consultant[] = [
  {
    id: 'c1',
    name: 'Sarah Mitchell',
    title: 'Fractional CFO',
    specialisms: ['Cash Flow', 'Fundraising', 'Board Reporting'],
    rating: 4.9,
    reviews: 23,
    hourlyRate: 175,
    availability: 'available',
    bio: 'Former Big 4 with 15+ years helping SMEs scale. Specialises in SaaS and e-commerce financial strategy.',
  },
  {
    id: 'c2',
    name: 'David Chen',
    title: 'AI Governance Specialist',
    specialisms: ['AI Compliance', 'Data Protection', 'Risk Assessment'],
    rating: 4.8,
    reviews: 17,
    hourlyRate: 200,
    availability: 'available',
    bio: 'Helps businesses implement responsible AI practices. GDPR and AI Act certified.',
  },
  {
    id: 'c3',
    name: 'Priya Sharma',
    title: 'Growth Strategy Advisor',
    specialisms: ['Market Entry', 'Pricing Strategy', 'Unit Economics'],
    rating: 4.7,
    reviews: 31,
    hourlyRate: 150,
    availability: 'busy',
    bio: 'Scaled 3 startups from seed to Series B. Deep expertise in fashion, beauty and D2C brands.',
  },
  {
    id: 'c4',
    name: 'James Okafor',
    title: 'Tax & Compliance Advisor',
    specialisms: ['Corporation Tax', 'VAT', 'R&D Tax Credits'],
    rating: 4.9,
    reviews: 42,
    hourlyRate: 160,
    availability: 'available',
    bio: 'Chartered accountant specialising in creative industries. Saved clients over £2M in R&D credits.',
  },
  {
    id: 'c5',
    name: 'Elena Rodriguez',
    title: 'Operations & Systems Consultant',
    specialisms: ['Process Automation', 'Xero Setup', 'Integrations'],
    rating: 4.6,
    reviews: 19,
    hourlyRate: 125,
    availability: 'unavailable',
    bio: 'Streamlines business operations with smart automation. Xero Platinum partner.',
  },
];

const AVAILABILITY_STYLES: Record<string, { label: string; dot: string }> = {
  available: { label: 'Available', dot: 'bg-emerald-500' },
  busy: { label: 'Limited availability', dot: 'bg-amber-500' },
  unavailable: { label: 'Fully booked', dot: 'bg-rose-400' },
};

const SPECIALISM_FILTERS = ['All', 'Finance', 'AI & Governance', 'Growth', 'Tax', 'Operations'];

// ── Component ────────────────────────────────────────────────────

export default function ConsultantsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const filtered = CONSULTANTS.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.specialisms.some((s) => s.toLowerCase().includes(search.toLowerCase()))) {
      return false;
    }
    return true;
  });

  return (
    <IntelligencePageWrapper
      title="Consultants"
      subtitle="Connect with vetted advisors who understand your business through Grove data"
      section="consultants"
      showSearch={false}
      showRecommendations={false}
    >
      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search by name or specialism..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {SPECIALISM_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Consultant cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => {
          const avail = AVAILABILITY_STYLES[c.availability];
          return (
            <Card key={c.id} className="flex flex-col">
              <CardContent className="flex-1 p-4 sm:p-5 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {c.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.title}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={cn('h-2 w-2 rounded-full', avail.dot)} />
                    <span className="text-[10px] text-muted-foreground">{avail.label}</span>
                  </div>
                </div>

                {/* Bio */}
                <p className="text-xs text-muted-foreground leading-relaxed">{c.bio}</p>

                {/* Specialisms */}
                <div className="flex flex-wrap gap-1">
                  {c.specialisms.map((s) => (
                    <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                  ))}
                </div>

                {/* Rating + price */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-xs font-medium">{c.rating}</span>
                    <span className="text-[10px] text-muted-foreground">({c.reviews} reviews)</span>
                  </div>
                  <span className="text-xs font-semibold">&pound;{c.hourlyRate}/hr</span>
                </div>

                {/* CTA */}
                <Button
                  size="sm"
                  className="w-full"
                  disabled={c.availability === 'unavailable'}
                >
                  {c.availability === 'unavailable' ? 'Fully Booked' : 'Express Interest'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Become a consultant CTA */}
      <Card className="border-dashed">
        <CardContent className="p-4 sm:p-5 text-center">
          <p className="text-sm font-medium">Are you an advisor or consultant?</p>
          <p className="text-xs text-muted-foreground mt-1">
            Join our network and connect with businesses who need your expertise.
          </p>
          <Button variant="outline" size="sm" className="mt-3" disabled>
            Apply to Join
          </Button>
        </CardContent>
      </Card>
    </IntelligencePageWrapper>
  );
}
