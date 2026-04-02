'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// === Mock Operations & Projects Data (demo mode only) ===

interface OperationsMetric {
  label: string;
  value: string;
  target: string;
  status: 'green' | 'amber' | 'red';
  description: string;
}

const operationsScorecard: OperationsMetric[] = [
  { label: 'Fitting Room Utilisation', value: '82%', target: '85%', status: 'amber', description: '14 appointments this week across 3 rooms' },
  { label: 'Alteration Turnaround', value: '4.2 days', target: '5 days', status: 'green', description: 'Average from receipt to completion' },
  { label: 'Quality Pass Rate', value: '94%', target: '95%', status: 'amber', description: '4 of 5 gowns passed first inspection' },
  { label: 'On-Time Delivery', value: '98%', target: '95%', status: 'green', description: 'Last 30 orders delivered on schedule' },
];

interface CapacityGauge {
  label: string;
  current: number;
  max: number;
  unit: string;
}

const capacityMetrics: CapacityGauge[] = [
  { label: 'Seamstress Capacity', current: 78, max: 100, unit: '%' },
  { label: 'Bespoke Orders (Q2)', current: 18, max: 24, unit: 'orders' },
  { label: 'Fabric Stock Level', current: 65, max: 100, unit: '%' },
  { label: 'Upcoming Fittings', current: 14, max: 21, unit: 'this week' },
];

interface Project {
  id: string;
  name: string;
  category: 'expansion' | 'collection' | 'operations' | 'marketing';
  progress: number;
  status: 'on-track' | 'at-risk' | 'completed' | 'not-started';
  dueDate: string;
  milestones: { label: string; done: boolean }[];
}

const projects: Project[] = [
  {
    id: 'proj-001',
    name: 'US Expansion — Kleinfeld Partnership',
    category: 'expansion',
    progress: 35,
    status: 'on-track',
    dueDate: 'Q2 2026',
    milestones: [
      { label: 'Contract review', done: true },
      { label: 'Collection selection', done: true },
      { label: 'Logistics planning', done: false },
      { label: 'Trunk show launch', done: false },
    ],
  },
  {
    id: 'proj-002',
    name: 'Celestial Collection Launch',
    category: 'collection',
    progress: 70,
    status: 'on-track',
    dueDate: 'Apr 2026',
    milestones: [
      { label: 'Design finalised', done: true },
      { label: 'Samples produced', done: true },
      { label: 'Photography shoot', done: true },
      { label: 'Marketing campaign', done: false },
      { label: 'Launch event', done: false },
    ],
  },
  {
    id: 'proj-003',
    name: 'Fitting Room Renovation',
    category: 'operations',
    progress: 15,
    status: 'not-started',
    dueDate: 'Q3 2026',
    milestones: [
      { label: 'Design brief', done: true },
      { label: 'Contractor quotes', done: false },
      { label: 'Renovation period', done: false },
      { label: 'Relaunch', done: false },
    ],
  },
  {
    id: 'proj-004',
    name: 'Sustainability Certification',
    category: 'operations',
    progress: 50,
    status: 'at-risk',
    dueDate: 'May 2026',
    milestones: [
      { label: 'Supplier audit', done: true },
      { label: 'Material sourcing review', done: true },
      { label: 'Documentation', done: false },
      { label: 'Certification submission', done: false },
    ],
  },
];

interface OKR {
  objective: string;
  keyResults: { label: string; current: number; target: number; unit: string }[];
}

const okrs: OKR[] = [
  {
    objective: 'Scale revenue to £1.2M ARR',
    keyResults: [
      { label: 'Monthly revenue', current: 82000, target: 100000, unit: '£' },
      { label: 'New bespoke orders per month', current: 6, target: 8, unit: '' },
      { label: 'Average order value', current: 5200, target: 5500, unit: '£' },
    ],
  },
  {
    objective: 'Successfully enter US market',
    keyResults: [
      { label: 'US stockist partnerships', current: 0, target: 3, unit: '' },
      { label: 'US trunk show bookings', current: 12, target: 20, unit: '' },
      { label: 'US revenue (Year 1)', current: 0, target: 180000, unit: '£' },
    ],
  },
];

const statusColors: Record<string, string> = {
  'on-track': 'bg-emerald-100 text-emerald-800',
  'at-risk': 'bg-amber-100 text-amber-800',
  'completed': 'bg-blue-100 text-blue-800',
  'not-started': 'bg-muted text-muted-foreground',
  'green': 'bg-emerald-100 text-emerald-800',
  'amber': 'bg-amber-100 text-amber-800',
  'red': 'bg-red-100 text-red-800',
};

export function OperationsProjectsDashboard() {
  return (
    <div className="space-y-6">
      {/* Operations Scorecard */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {operationsScorecard.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                <Badge variant="secondary" className={cn('text-[10px]', statusColors[metric.status])}>
                  {metric.status === 'green' ? 'On Target' : metric.status === 'amber' ? 'Watch' : 'Below Target'}
                </Badge>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums">{metric.value}</span>
                <span className="text-xs text-muted-foreground">target: {metric.target}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{metric.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Capacity Utilisation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Capacity Utilisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {capacityMetrics.map((gauge) => {
              const pct = Math.round((gauge.current / gauge.max) * 100);
              return (
                <div key={gauge.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{gauge.label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {gauge.current}{gauge.unit === '%' ? '%' : ` / ${gauge.max} ${gauge.unit}`}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-2 rounded-full transition-all',
                        pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-400'
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* OKRs / Rocks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Key Objectives (OKRs)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {okrs.map((okr, idx) => (
              <div key={idx} className="space-y-3">
                <p className="text-sm font-semibold">{okr.objective}</p>
                <div className="space-y-2">
                  {okr.keyResults.map((kr, krIdx) => {
                    const pct = kr.target > 0 ? Math.min(100, Math.round((kr.current / kr.target) * 100)) : 0;
                    return (
                      <div key={krIdx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{kr.label}</span>
                          <span className="tabular-nums font-medium">
                            {kr.unit === '£' ? `£${kr.current.toLocaleString()}` : kr.current} / {kr.unit === '£' ? `£${kr.target.toLocaleString()}` : kr.target}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted">
                          <div
                            className="h-1.5 rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Project Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Projects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {projects.map((project) => (
            <div key={project.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{project.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{project.category}</Badge>
                    <Badge variant="secondary" className={cn('text-[10px]', statusColors[project.status])}>
                      {project.status.replace('-', ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Due: {project.dueDate}</span>
                  </div>
                </div>
                <span className="text-lg font-bold tabular-nums">{project.progress}%</span>
              </div>
              <div className="mt-3">
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-2 rounded-full transition-all',
                      project.status === 'at-risk' ? 'bg-amber-400' :
                      project.status === 'completed' ? 'bg-emerald-400' :
                      'bg-primary'
                    )}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {project.milestones.map((ms, idx) => (
                    <span key={idx} className={cn('flex items-center gap-1 text-xs', ms.done ? 'text-emerald-600' : 'text-muted-foreground')}>
                      {ms.done ? (
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <circle cx="12" cy="12" r="10" />
                        </svg>
                      )}
                      {ms.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
