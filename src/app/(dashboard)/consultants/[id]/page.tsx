'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  getConsultantById,
  type ProjectTemplate,
} from '@/lib/marketplace/consultants-data';

function availabilityConfig(availability: 'available' | 'limited' | 'busy') {
  switch (availability) {
    case 'available':
      return { label: 'Available', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' };
    case 'limited':
      return { label: 'Limited Availability', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' };
    case 'busy':
      return { label: 'Fully Booked', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' };
  }
}

const HOW_IT_WORKS = [
  {
    step: 1,
    title: 'Brief',
    description: 'Share your goals and challenges so the consultant understands your context before the first conversation.',
  },
  {
    step: 2,
    title: 'Match',
    description: 'We connect you with the right consultant and share relevant platform data with your approval.',
  },
  {
    step: 3,
    title: 'Execute',
    description: 'They work on the platform with your data, delivering insights that integrate with your existing reports.',
  },
  {
    step: 4,
    title: 'Review',
    description: 'Approve deliverables, provide feedback, and see results flow into your dashboards and board packs.',
  },
];

function ProjectTemplateCard({ template }: { template: ProjectTemplate }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{template.title}</CardTitle>
        <CardDescription>{template.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            {template.estimatedHours} hours
          </span>
          <span className="font-medium">
            {'\u00A3'}{(template.estimatedCost / 100).toLocaleString()} estimated investment
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Deliverables
          </p>
          <ul className="space-y-1.5">
            {template.deliverables.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <svg
                  className="mt-0.5 size-4 shrink-0 text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <Button className="w-full">Express Interest</Button>
      </CardContent>
    </Card>
  );
}

export default function ConsultantDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const consultant = getConsultantById(id);

  const [formName, setFormName] = useState('');
  const [formNeed, setFormNeed] = useState('');
  const [formTimeline, setFormTimeline] = useState('');

  if (!consultant) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h1 className="text-xl font-semibold text-foreground">Consultant not found</h1>
        <p className="text-sm text-muted-foreground">
          The consultant you are looking for does not exist or has been removed.
        </p>
        <Button asChild variant="outline">
          <Link href="/consultants">Back to Consultants</Link>
        </Button>
      </div>
    );
  }

  const avail = availabilityConfig(consultant.availability);

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/consultants"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        All Consultants
      </Link>

      {/* Profile header */}
      <Card>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <Avatar className="size-20">
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                {consultant.avatar}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {consultant.name}
                </h1>
                <p className="text-base text-muted-foreground">{consultant.title}</p>
                <p className="text-sm text-muted-foreground">{consultant.specialisation}</p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="font-semibold text-foreground">
                  {'\u00A3'}{(consultant.hourlyRate / 100).toLocaleString()}/hr
                </span>
                <span>
                  <span className="text-amber-500">&#9733;</span>{' '}
                  <span className="font-medium">{consultant.rating.toFixed(1)}</span>
                </span>
                <span className="text-muted-foreground">
                  {consultant.completedProjects} projects completed
                </span>
                <Badge
                  variant="secondary"
                  className={cn('text-xs border-0', avail.className)}
                >
                  {avail.label}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bio */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">About</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {consultant.bio}
        </p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {consultant.tags.map((tag) => (
          <Badge key={tag} variant="outline" className="text-sm font-normal">
            {tag}
          </Badge>
        ))}
      </div>

      {/* Project templates */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Projects They Can Help With
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {consultant.projectTemplates.map((template) => (
            <ProjectTemplateCard key={template.id} template={template} />
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">How It Works</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((item) => (
            <Card key={item.step}>
              <CardContent className="pt-0 space-y-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {item.step}
                </div>
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Data & Privacy */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Data &amp; Privacy</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Consultants only see data you explicitly share. Access is scoped to the specific
            modules and time periods you approve. All consultant activity is logged in your
            audit trail, and access can be revoked at any time. Your data remains yours.
          </p>
        </CardContent>
      </Card>

      {/* Engage CTA */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base">
            Engage {consultant.name}
          </CardTitle>
          <CardDescription>
            Tell us about your needs and preferred timeline. We will connect you directly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              placeholder="Your name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
            <Input
              placeholder="What do you need help with?"
              value={formNeed}
              onChange={(e) => setFormNeed(e.target.value)}
            />
            <Input
              placeholder="Preferred timeline"
              value={formTimeline}
              onChange={(e) => setFormTimeline(e.target.value)}
            />
          </div>
          <Button size="lg" className="w-full sm:w-auto">
            Express Interest
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
