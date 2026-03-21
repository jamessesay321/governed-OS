'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Business Profile: Simplified Setup Flow                           */
/* ------------------------------------------------------------------ */

type Props = {
  orgId: string;
  interviewCompleted: boolean;
  completedInterviewId: string | null;
  existingProfile: Record<string, unknown> | null;
  existingMessages: { role: 'user' | 'assistant'; content: string; stage: string }[];
  currentInterviewId: string | null;
  currentStage: string;
};

const INDUSTRIES = [
  'Digital Services & Tech',
  'Professional Services',
  'Creative & Design Agency',
  'E-Commerce & Retail',
  'Construction & Trades',
  'Healthcare & Wellness',
  'Education & Training',
  'Food & Hospitality',
  'Manufacturing',
  'Property & Real Estate',
  'Financial Services',
  'Non-Profit / Charity',
  'Other',
];

const COMPANY_SIZES = [
  '1-5 employees',
  '6-15 employees',
  '16-50 employees',
  '51-100 employees',
  '100+ employees',
];

const REVENUE_RANGES = [
  'Under £100K',
  '£100K - £500K',
  '£500K - £1M',
  '£1M - £5M',
  '£5M - £10M',
  '£10M - £20M',
  '£20M+',
];

const FISCAL_YEAR_ENDS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface FormData {
  companyName: string;
  website: string;
  linkedIn: string;
  twitter: string;
  instagram: string;
  tiktok: string;
  pinterest: string;
  industry: string;
  companySize: string;
  revenueRange: string;
  fiscalYearEnd: string;
  country: string;
  yearEstablished: string;
  description: string;
  goals: string;
  challenges: string;
}

const STEPS = [
  { id: 'basics', label: 'Company Basics', description: 'Name, website, and socials' },
  { id: 'details', label: 'Business Details', description: 'Industry, size, and revenue' },
  { id: 'context', label: 'Goals & Context', description: 'Optional. Helps AI give better insights' },
];

export function InterviewPageClient({
  orgId,
  interviewCompleted,
  existingProfile,
}: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(interviewCompleted);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const [form, setForm] = useState<FormData>({
    companyName: (existingProfile?.company_name as string) || '',
    website: (existingProfile?.website as string) || '',
    linkedIn: (existingProfile?.linkedin as string) || '',
    twitter: (existingProfile?.twitter as string) || '',
    instagram: (existingProfile?.instagram as string) || '',
    tiktok: (existingProfile?.tiktok as string) || '',
    pinterest: (existingProfile?.pinterest as string) || '',
    industry: (existingProfile?.industry as string) || '',
    companySize: (existingProfile?.company_size as string) || '',
    revenueRange: (existingProfile?.revenue_range as string) || '',
    fiscalYearEnd: (existingProfile?.fiscal_year_end as string) || '',
    country: (existingProfile?.country as string) || 'United Kingdom',
    yearEstablished: (existingProfile?.year_established as string) || '',
    description: (existingProfile?.description as string) || '',
    goals: (existingProfile?.goals as string) || '',
    challenges: (existingProfile?.challenges as string) || '',
  });

  const update = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const completedFields = Object.values(form).filter((v) => v.trim() !== '').length;
  const totalFields = Object.keys(form).length;
  const completionPct = Math.round((completedFields / totalFields) * 100);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/interview/${orgId}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSaved(true);
      }
    } catch {
      // silent fail: log server-side
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = () => {
    // Trigger file input
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.xlsx,.xls,.csv,.doc,.docx';
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        const names = Array.from(files).map((f) => f.name);
        setUploadedFiles((prev) => [...prev, ...names]);
      }
    };
    input.click();
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Business Profile</h1>
        <p className="text-muted-foreground mt-1">
          Tell us about your business. The more we know, the better our AI insights will be.
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Profile completeness</span>
          <span className="text-sm font-medium text-primary">{completionPct}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2.5">
          <div
            className="bg-primary h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {completionPct < 30
            ? 'Get started by filling in the basics'
            : completionPct < 70
              ? 'Great progress! More info helps our AI give better insights'
              : completionPct < 100
                ? 'Almost there! Optional fields help fine-tune recommendations'
                : 'Profile complete!'}
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex gap-2 mb-8">
        {STEPS.map((step, idx) => (
          <button
            key={step.id}
            onClick={() => setCurrentStep(idx)}
            className={cn(
              'flex-1 rounded-lg border p-3 text-left transition-all',
              currentStep === idx
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border hover:border-primary/50'
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold',
                  currentStep === idx
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {idx + 1}
              </div>
              <div>
                <div className="text-sm font-medium">{step.label}</div>
                <div className="text-xs text-muted-foreground">{step.description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Step 1: Company Basics */}
      {currentStep === 0 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">Company Name *</label>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => update('companyName', e.target.value)}
              placeholder="e.g. Westfield Digital Ltd"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Website</label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => update('website', e.target.value)}
              placeholder="https://yourcompany.com"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              We&apos;ll use this to auto-populate some information about your business
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">Social Accounts</label>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold flex-shrink-0">in</div>
                <input
                  type="text"
                  value={form.linkedIn}
                  onChange={(e) => update('linkedIn', e.target.value)}
                  placeholder="linkedin.com/company/..."
                  className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-sky-100 flex items-center justify-center text-sky-600 text-xs font-bold flex-shrink-0">X</div>
                <input
                  type="text"
                  value={form.twitter}
                  onChange={(e) => update('twitter', e.target.value)}
                  placeholder="x.com/..."
                  className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-pink-100 flex items-center justify-center text-pink-600 text-xs font-bold flex-shrink-0">IG</div>
                <input
                  type="text"
                  value={form.instagram}
                  onChange={(e) => update('instagram', e.target.value)}
                  placeholder="instagram.com/..."
                  className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-gray-900 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">TT</div>
                <input
                  type="text"
                  value={form.tiktok}
                  onChange={(e) => update('tiktok', e.target.value)}
                  placeholder="tiktok.com/@..."
                  className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-red-100 flex items-center justify-center text-red-600 text-xs font-bold flex-shrink-0">P</div>
                <input
                  type="text"
                  value={form.pinterest}
                  onChange={(e) => update('pinterest', e.target.value)}
                  placeholder="pinterest.com/..."
                  className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Upload Documents</label>
            <p className="text-xs text-muted-foreground mb-3">
              Upload existing financial reports, business plans, or any relevant documents. Supports PDF, Excel, CSV, Word.
            </p>
            <div
              className="w-full rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-8 text-center opacity-60"
            >
              <div className="flex flex-col items-center gap-2">
                <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span className="text-sm text-muted-foreground">Document upload coming soon</span>
                <span className="text-xs text-muted-foreground">PDF, XLSX, CSV, DOCX up to 10MB</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Business Details */}
      {currentStep === 1 && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">Industry *</label>
            <select
              value={form.industry}
              onChange={(e) => update('industry', e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="">Select your industry</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Company Size *</label>
            <div className="grid grid-cols-3 gap-2">
              {COMPANY_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => update('companySize', size)}
                  className={cn(
                    'rounded-lg border px-3 py-2.5 text-sm font-medium transition-all',
                    form.companySize === size
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 text-muted-foreground'
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Annual Revenue Range</label>
            <div className="grid grid-cols-2 gap-2">
              {REVENUE_RANGES.map((range) => (
                <button
                  key={range}
                  onClick={() => update('revenueRange', range)}
                  className={cn(
                    'rounded-lg border px-3 py-2.5 text-sm font-medium transition-all text-left',
                    form.revenueRange === range
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 text-muted-foreground'
                  )}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Fiscal Year End</label>
              <select
                value={form.fiscalYearEnd}
                onChange={(e) => update('fiscalYearEnd', e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">Select month</option>
                {FISCAL_YEAR_ENDS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Year Established</label>
              <input
                type="text"
                value={form.yearEstablished}
                onChange={(e) => update('yearEstablished', e.target.value)}
                placeholder="e.g. 2018"
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Country</label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => update('country', e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        </div>
      )}

      {/* Step 3: Goals & Context (Optional) */}
      {currentStep === 2 && (
        <div className="space-y-5">
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 mb-2">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-primary">This section is optional</p>
                <p className="text-xs text-primary/80 mt-0.5">
                  More context helps our AI give you better, more personalised insights. You can skip this and come back later.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Business Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Brief description of what your company does, your main services/products, and who your customers are..."
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Key Business Goals</label>
            <textarea
              value={form.goals}
              onChange={(e) => update('goals', e.target.value)}
              placeholder="What are your top 2-3 priorities right now? e.g. 'Increase revenue by 30% this year', 'Reduce cash cycle to under 30 days'..."
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Current Challenges</label>
            <textarea
              value={form.challenges}
              onChange={(e) => update('challenges', e.target.value)}
              placeholder="Any specific challenges you're facing? e.g. 'Cash flow is tight', 'Margins are shrinking', 'Need to hire but unsure if we can afford it'..."
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
            />
          </div>

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              className={cn('h-4 w-4 transition-transform', showAdvanced ? 'rotate-90' : '')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Add more detail (AI interview)
          </button>

          {showAdvanced && (
            <div className="rounded-lg border border-border p-4 bg-muted/20">
              <p className="text-sm text-muted-foreground mb-3">
                Want a deeper analysis? Our AI can ask follow-up questions to better understand your business model, competitive landscape, and growth opportunities.
              </p>
              <a
                href={`/interview/deep-dive`}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Start AI Interview
              </a>
            </div>
          )}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t">
        <div>
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep((s) => s - 1)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Back
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {currentStep < STEPS.length - 1 && (
            <button
              onClick={() => setCurrentStep((s) => s + 1)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip
            </button>
          )}
          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={() => setCurrentStep((s) => s + 1)}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                'rounded-lg px-6 py-2 text-sm font-medium transition-colors',
                saved
                  ? 'bg-green-600 text-white'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90',
                saving && 'opacity-50 cursor-not-allowed'
              )}
            >
              {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Profile'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
