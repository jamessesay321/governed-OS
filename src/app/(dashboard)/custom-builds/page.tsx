'use client';

import { useState } from 'react';
import { IntelligencePageWrapper } from '@/components/intelligence/intelligence-page-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────

interface ProjectTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  startingFrom: number; // pence
  timeline: string;
  popular?: boolean;
}

const TEMPLATES: ProjectTemplate[] = [
  {
    id: 'custom-agent',
    title: 'Custom AI Agent',
    description: 'A bespoke AI agent tailored to your specific business processes — from data collection to autonomous decision-making',
    category: 'AI Agent',
    startingFrom: 299900,
    timeline: '2-4 weeks',
    popular: true,
  },
  {
    id: 'integration',
    title: 'Platform Integration',
    description: 'Connect any third-party tool or API to Grove with full data governance and audit trails',
    category: 'Integration',
    startingFrom: 149900,
    timeline: '1-2 weeks',
  },
  {
    id: 'dashboard',
    title: 'Custom Dashboard',
    description: 'Purpose-built analytics dashboard combining data from multiple sources with AI-powered insights',
    category: 'Analytics',
    startingFrom: 199900,
    timeline: '1-3 weeks',
  },
  {
    id: 'automation',
    title: 'Business Automation',
    description: 'End-to-end workflow automation — from invoice processing to report generation to client communications',
    category: 'Automation',
    startingFrom: 249900,
    timeline: '2-4 weeks',
  },
  {
    id: 'migration',
    title: 'Data Migration',
    description: 'Safely migrate your data from legacy systems into Grove with validation and reconciliation',
    category: 'Data',
    startingFrom: 99900,
    timeline: '1-2 weeks',
  },
  {
    id: 'ai-model',
    title: 'Custom AI Model',
    description: 'Train a model on your business data for forecasting, classification, or recommendation — fully governed',
    category: 'AI Model',
    startingFrom: 499900,
    timeline: '4-8 weeks',
  },
];

function formatPence(pence: number): string {
  return `\u00a3${(pence / 100).toLocaleString()}`;
}

// ── Component ────────────────────────────────────────────────────

export default function CustomBuildsPage() {
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [budget, setBudget] = useState('');
  const [timeline, setTimeline] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
  };

  return (
    <IntelligencePageWrapper
      title="Custom AI Builds"
      subtitle="Tell us what you need and we'll design a solution — fully governed and auditable"
      section="custom-builds"
      showSearch={false}
      showRecommendations={false}
    >
      {/* Project templates */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Popular Project Types</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => (
            <Card key={t.id} className={cn(t.popular && 'border-primary/30')}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{t.title}</p>
                    <Badge variant="secondary" className="text-[10px] mt-1">{t.category}</Badge>
                  </div>
                  {t.popular && (
                    <Badge className="bg-primary text-primary-foreground text-[10px] shrink-0">Popular</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{t.description}</p>
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <span className="text-xs text-muted-foreground">From {formatPence(t.startingFrom)}</span>
                  <span className="text-xs text-muted-foreground">{t.timeline}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Submit project form */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-base">Submit Your Project</CardTitle>
          <p className="text-xs text-muted-foreground">
            Describe what you need and our team will come back with a tailored proposal.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {submitted ? (
            <div className="text-center py-6 space-y-2">
              <div className="h-12 w-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-semibold">Project Submitted</p>
              <p className="text-xs text-muted-foreground">
                We&apos;ll review your requirements and send you a proposal within 48 hours.
              </p>
              <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>
                Submit Another
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="project-name" className="text-xs">Project Name</Label>
                  <Input
                    id="project-name"
                    placeholder="e.g. Automated Invoice Processing"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs">Category</Label>
                  <Input
                    id="category"
                    placeholder="e.g. Automation, AI Agent, Integration..."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs">Describe What You Need</Label>
                <textarea
                  id="description"
                  rows={4}
                  placeholder="Tell us about the problem you're trying to solve, the data involved, and what a successful outcome looks like..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="budget" className="text-xs">Approximate Budget</Label>
                  <Input
                    id="budget"
                    placeholder="e.g. £2,000 - £5,000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="timeline" className="text-xs">Desired Timeline</Label>
                  <Input
                    id="timeline"
                    placeholder="e.g. Within 4 weeks"
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-2">
                <p className="text-[10px] text-muted-foreground">
                  All builds include full governance, audit trail, and documentation.
                </p>
                <Button
                  onClick={handleSubmit}
                  disabled={!projectName.trim() || !description.trim()}
                  className="w-full sm:w-auto"
                >
                  Submit Project
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <h3 className="text-sm font-semibold mb-3">How It Works</h3>
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { step: '1', title: 'Submit', desc: 'Describe your project and requirements' },
              { step: '2', title: 'Proposal', desc: 'We send a tailored scope and quote within 48hrs' },
              { step: '3', title: 'Build', desc: 'Our team builds with full governance baked in' },
              { step: '4', title: 'Deploy', desc: 'Launch into your Grove instance' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary mb-2">
                  {s.step}
                </div>
                <p className="text-xs font-semibold">{s.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </IntelligencePageWrapper>
  );
}
