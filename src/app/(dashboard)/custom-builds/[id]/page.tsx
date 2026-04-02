'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getCustomBuildById, getCustomBuilds } from '@/lib/marketplace/custom-builds-data';
import type { CustomBuildProject } from '@/lib/marketplace/custom-builds-data';

const complexityConfig: Record<
  CustomBuildProject['complexity'],
  { label: string; className: string }
> = {
  simple: {
    label: 'Simple',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  moderate: {
    label: 'Moderate',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  complex: {
    label: 'Complex',
    className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  },
};

function formatCost(pence: number): string {
  return `£${(pence / 100).toLocaleString()}`;
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4 shrink-0', className)}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

const PROCESS_STEPS = [
  {
    step: 1,
    title: 'Discovery',
    description: 'We review your requirements and business context',
  },
  {
    step: 2,
    title: 'Design',
    description: 'Interactive mockups and specification document',
  },
  {
    step: 3,
    title: 'Build',
    description: 'Iterative development with weekly check-ins',
  },
  {
    step: 4,
    title: 'Launch',
    description: 'Testing, deployment, and team training',
  },
];

const COST_BREAKDOWN = [
  { label: 'Design', percentage: 20 },
  { label: 'Development', percentage: 50 },
  { label: 'Testing', percentage: 15 },
  { label: 'Support', percentage: 15 },
];

export default function CustomBuildDetailPage() {
  const params = useParams<{ id: string }>();
  const project = getCustomBuildById(params.id);
  const allBuilds = getCustomBuilds();

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h1 className="text-xl font-semibold text-foreground">Project not found</h1>
        <p className="text-sm text-muted-foreground">
          The custom build you are looking for does not exist.
        </p>
        <Button asChild variant="outline">
          <Link href="/custom-builds">Back to Custom Builds</Link>
        </Button>
      </div>
    );
  }

  const complexity = complexityConfig[project.complexity];
  const similarProjects = allBuilds.filter((b) => b.id !== project.id);

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/custom-builds"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Custom Builds
      </Link>

      {/* Project header */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {project.category}
          </Badge>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
              complexity.className
            )}
          >
            {complexity.label}
          </span>
          {project.recommended && (
            <Badge className="bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
              Recommended
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{project.title}</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {project.description}
        </p>
      </header>

      {/* Why We Recommend This */}
      {project.recommended && project.reasoning && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">
              Why We Recommend This
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground">{project.reasoning}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* What's Included */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">What&apos;s Included</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {project.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                    <CheckIcon className="mt-0.5 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Investment breakdown */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Investment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {formatCost(project.estimatedCost)}
                </p>
                <p className="text-xs text-muted-foreground">Estimated investment</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{project.estimatedTimeline}</p>
                <p className="text-xs text-muted-foreground">Estimated timeline</p>
              </div>

              <div className="border-t border-border pt-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Includes</p>
                <ul className="space-y-1.5 text-xs text-foreground">
                  <li className="flex items-center gap-2">
                    <CheckIcon className="h-3 w-3 text-primary" />
                    Design
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="h-3 w-3 text-primary" />
                    Development
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="h-3 w-3 text-primary" />
                    Testing
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckIcon className="h-3 w-3 text-primary" />
                    3 months support
                  </li>
                </ul>
              </div>

              <div className="border-t border-border pt-4">
                <p className="mb-3 text-xs font-medium text-muted-foreground">
                  Cost Breakdown
                </p>
                <div className="space-y-2">
                  {COST_BREAKDOWN.map((item) => (
                    <div key={item.label}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium text-foreground">{item.percentage}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* How It Works */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">How It Works</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROCESS_STEPS.map((step) => (
            <Card key={step.step}>
              <CardContent className="pt-6">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {step.step}
                </div>
                <p className="font-semibold text-foreground">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Request This Build CTA */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <h2 className="text-lg font-semibold text-foreground">Ready to get started?</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Express your interest and our team will reach out to discuss your requirements,
            timeline, and next steps.
          </p>
          <Button size="lg">Express Interest</Button>
        </CardContent>
      </Card>

      {/* Similar Projects */}
      {similarProjects.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Similar Projects
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {similarProjects.map((other) => {
              const otherComplexity = complexityConfig[other.complexity];
              return (
                <Card key={other.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-tight">{other.title}</CardTitle>
                      {other.recommended && (
                        <Badge className="shrink-0 bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {other.category}
                      </Badge>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                          otherComplexity.className
                        )}
                      >
                        {otherComplexity.label}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-3">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground">Investment</span>
                      <span className="font-semibold">{formatCost(other.estimatedCost)}</span>
                    </div>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-muted-foreground">Timeline</span>
                      <span className="font-medium">{other.estimatedTimeline}</span>
                    </div>
                    <div className="mt-auto pt-2">
                      <Button asChild variant="outline" className="w-full">
                        <Link href={`/custom-builds/${other.id}`}>View Details</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
