// @ts-nocheck
// TODO: Fix type mismatches between ReportTemplate and expected shape
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/ai-reasoning';
import { BUILDER_TEMPLATES as REPORT_TEMPLATES } from '@/lib/reports/templates';
import type { ReportType, ReportSectionType } from '@/types/reports';

interface ReportBuilderProps {
  orgId: string;
  availablePeriods: string[];
}

type Step = 'type' | 'config' | 'preview';

export function ReportBuilder({ orgId, availablePeriods }: ReportBuilderProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('type');
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [title, setTitle] = useState('');
  const [periodStart, setPeriodStart] = useState(availablePeriods[availablePeriods.length - 1] || '');
  const [periodEnd, setPeriodEnd] = useState(availablePeriods[0] || '');
  const [selectedSections, setSelectedSections] = useState<ReportSectionType[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);

  const template = REPORT_TEMPLATES.find((t) => t.type === selectedType);

  function handleTypeSelect(type: ReportType) {
    setSelectedType(type);
    const tmpl = REPORT_TEMPLATES.find((t) => t.type === type);
    if (tmpl) {
      setSelectedSections(tmpl.sections.map((s) => s.type));
      setTitle(tmpl.label);
    }
    setStep('config');
  }

  function toggleSection(sectionType: ReportSectionType) {
    const tmplSection = template?.sections.find((s) => s.type === sectionType);
    if (tmplSection?.required) return;

    setSelectedSections((prev) =>
      prev.includes(sectionType)
        ? prev.filter((s) => s !== sectionType)
        : [...prev, sectionType]
    );
  }

  async function handleGenerate() {
    if (!selectedType) return;
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/reports/${orgId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: selectedType,
          periodStart,
          periodEnd,
          selectedSections,
          title: title || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate report');
      }

      const { report } = await response.json();
      router.push(`/reports/${report.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        <StepIndicator label="Report Type" number={1} active={step === 'type'} completed={step !== 'type'} />
        <div className="h-px flex-1 bg-border" />
        <StepIndicator label="Configure" number={2} active={step === 'config'} completed={step === 'preview'} />
        <div className="h-px flex-1 bg-border" />
        <StepIndicator label="Generate" number={3} active={step === 'preview'} completed={false} />
      </div>

      {/* Step 1: Select type */}
      {step === 'type' && (
        <div className="grid gap-4 md:grid-cols-2">
          {REPORT_TEMPLATES.map((tmpl) => (
            <Card
              key={tmpl.type}
              className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
              onClick={() => handleTypeSelect(tmpl.type)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <ReportTypeIcon type={tmpl.type} />
                  </div>
                  <div>
                    <CardTitle className="text-base">{tmpl.label}</CardTitle>
                    <CardDescription className="text-xs">{tmpl.sections.length} sections</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{tmpl.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Step 2: Configure */}
      {step === 'config' && template && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Report Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Report Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={template.label}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="periodStart">Period Start</Label>
                  <Input
                    id="periodStart"
                    type="month"
                    value={periodStart?.slice(0, 7) || ''}
                    onChange={(e) => setPeriodStart(e.target.value + '-01')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="periodEnd">Period End</Label>
                  <Input
                    id="periodEnd"
                    type="month"
                    value={periodEnd?.slice(0, 7) || ''}
                    onChange={(e) => setPeriodEnd(e.target.value + '-01')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sections</CardTitle>
              <CardDescription>Select the sections to include in your report</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {template.sections.map((section) => {
                  const isSelected = selectedSections.includes(section.type);
                  return (
                    <label
                      key={section.type}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      } ${section.required ? 'opacity-100' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSection(section.type)}
                        disabled={section.required}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="flex-1 text-sm font-medium">{section.title}</span>
                      {section.required && (
                        <Badge variant="secondary" className="text-xs">Required</Badge>
                      )}
                    </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep('type')}>
              Back
            </Button>
            <Button onClick={() => setStep('preview')}>
              Review &amp; Generate
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Preview & Generate */}
      {step === 'preview' && template && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Report Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Type</p>
                  <p className="text-sm font-medium">{template.label}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Title</p>
                  <p className="text-sm font-medium">{title || template.label}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Period</p>
                  <p className="text-sm font-medium">{periodStart} to {periodEnd}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Sections</p>
                  <p className="text-sm font-medium">{selectedSections.length} sections</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Included Sections</p>
                <div className="flex flex-wrap gap-2">
                  {template.sections
                    .filter((s) => selectedSections.includes(s.type))
                    .map((s) => (
                      <Badge key={s.type} variant="secondary">{s.title}</Badge>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep('config')}>
              Back
            </Button>
            <Button onClick={() => setShowGenerateConfirm(true)} disabled={generating}>
              {generating ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating Report...
                </span>
              ) : (
                'Generate Report'
              )}
            </Button>
          </div>

          {/* Confirmation dialog */}
          <ConfirmDialog
            open={showGenerateConfirm}
            title="Generate Report"
            description={`This will generate a "${title || template?.label || 'report'}" covering ${periodStart} to ${periodEnd} with ${selectedSections.length} sections. This uses AI credits and may take a moment.`}
            confirmLabel="Generate Report"
            variant="default"
            onConfirm={() => {
              setShowGenerateConfirm(false);
              handleGenerate();
            }}
            onCancel={() => setShowGenerateConfirm(false)}
          />
        </div>
      )}
    </div>
  );
}

function StepIndicator({ label, number, active, completed }: { label: string; number: number; active: boolean; completed: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
          active
            ? 'bg-primary text-primary-foreground'
            : completed
              ? 'bg-primary/20 text-primary'
              : 'bg-muted text-muted-foreground'
        }`}
      >
        {completed ? (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          number
        )}
      </div>
      <span className={`text-sm ${active ? 'font-medium' : 'text-muted-foreground'}`}>{label}</span>
    </div>
  );
}

function ReportTypeIcon({ type }: { type: ReportType }) {
  switch (type) {
    case 'board_pack':
      return (
        <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
    case 'monthly_review':
      return (
        <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      );
    case 'investor_update':
      return (
        <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      );
    default:
      return (
        <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.648 3.237 1.079-6.29-4.57-4.455 6.316-.918L11.42 1l2.823 5.744 6.316.918-4.57 4.455 1.079 6.29-5.648-3.237z" />
        </svg>
      );
  }
}
