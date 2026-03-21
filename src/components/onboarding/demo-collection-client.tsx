'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Props = {
  displayName: string;
  orgName: string;
  orgId: string;
};

const INDUSTRIES = [
  { value: 'technology', label: 'Technology / SaaS' },
  { value: 'retail', label: 'Retail / E-Commerce' },
  { value: 'professional-services', label: 'Professional Services' },
  { value: 'hospitality', label: 'Hospitality / Food & Drink' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'creative-agency', label: 'Creative / Design Agency' },
  { value: 'construction', label: 'Construction / Trades' },
  { value: 'fashion', label: 'Fashion / Luxury' },
  { value: 'education', label: 'Education / Training' },
  { value: 'other', label: 'Other' },
];

const TEAM_SIZES = [
  { value: '1-10', label: '1-10 people' },
  { value: '11-50', label: '11-50 people' },
  { value: '51-200', label: '51-200 people' },
  { value: '200+', label: '200+ people' },
];

const REVENUE_RANGES = [
  { value: 'pre-revenue', label: 'Pre-revenue' },
  { value: '0-100k', label: 'Up to £100k' },
  { value: '100k-500k', label: '£100k - £500k' },
  { value: '500k-1m', label: '£500k - £1M' },
  { value: '1m-5m', label: '£1M - £5M' },
  { value: '5m-10m', label: '£5M - £10M' },
  { value: '10m+', label: '£10M+' },
];

const LOADING_STEPS = [
  'Reading your company details...',
  'Building a realistic chart of accounts...',
  'Generating 12 months of financial data...',
  'Creating KPIs and targets...',
  'Setting up budgets and scenarios...',
  'Preparing your dashboard...',
];

export function DemoCollectionClient({ displayName, orgName, orgId }: Props) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState(orgName || '');
  const [industry, setIndustry] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [socialUrl, setSocialUrl] = useState('');
  const [revenueRange, setRevenueRange] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Company name and industry are required, everything else is optional
  const canSubmit = companyName.trim() && industry;

  async function handleSubmit() {
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    // Animate through loading steps
    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => Math.min(prev + 1, LOADING_STEPS.length - 1));
    }, 2500);

    try {
      const res = await fetch('/api/onboarding/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          industry,
          teamSize: teamSize || '11-50',
          websiteUrl: websiteUrl.trim() || undefined,
          socialUrl: socialUrl.trim() || undefined,
          revenueRange: revenueRange || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate demo data');
      }

      clearInterval(stepInterval);
      setLoadingStep(LOADING_STEPS.length - 1);

      // Brief pause on final step, then redirect
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (err) {
      clearInterval(stepInterval);
      setLoading(false);
      setLoadingStep(0);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-6">
            <svg className="h-8 w-8 text-primary animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Building your demo...
          </h2>
          <p className="text-muted-foreground mb-8">
            Creating a personalised experience for {companyName}
          </p>

          <div className="w-full max-w-xs space-y-3">
            {LOADING_STEPS.map((step, i) => (
              <div
                key={step}
                className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                  i <= loadingStep ? 'opacity-100' : 'opacity-30'
                }`}
              >
                {i < loadingStep ? (
                  <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : i === loadingStep ? (
                  <div className="h-4 w-4 flex-shrink-0 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  </div>
                ) : (
                  <div className="h-4 w-4 flex-shrink-0 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-muted" />
                  </div>
                )}
                <span className={i <= loadingStep ? 'text-foreground' : 'text-muted-foreground'}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.push('/welcome')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-amber-50 mb-4 text-2xl">
          🎯
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Tell us about your business
        </h1>
        <p className="text-muted-foreground mt-2">
          The more you share, the more realistic your demo will be. Only company name and industry are required.
        </p>
      </div>

      {/* Section 1: The basics */}
      <Card className="mb-4">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">1</div>
            <h3 className="text-sm font-semibold text-foreground">The basics</h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-name">Company name</Label>
            <Input
              id="company-name"
              placeholder="e.g. Acme Ltd"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger id="industry">
                <SelectValue placeholder="Select your industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind.value} value={ind.value}>
                    {ind.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="team-size">Team size</Label>
              <Select value={teamSize} onValueChange={setTeamSize}>
                <SelectTrigger id="team-size">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_SIZES.map((size) => (
                    <SelectItem key={size.value} value={size.value}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="revenue-range">Annual turnover</Label>
              <Select value={revenueRange} onValueChange={setRevenueRange}>
                <SelectTrigger id="revenue-range">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {REVENUE_RANGES.map((rev) => (
                    <SelectItem key={rev.value} value={rev.value}>
                      {rev.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Help us personalise */}
      <Card className="mb-6">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">2</div>
            <h3 className="text-sm font-semibold text-foreground">Help us personalise</h3>
            <span className="text-xs text-muted-foreground ml-auto">Optional</span>
          </div>

          <p className="text-sm text-muted-foreground -mt-2">
            Share a link and we&apos;ll use it to make your demo feel like home
          </p>

          <div className="space-y-2">
            <Label htmlFor="website-url">Website</Label>
            <Input
              id="website-url"
              type="url"
              placeholder="e.g. https://acme.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="social-url">Social media or LinkedIn</Label>
            <Input
              id="social-url"
              type="url"
              placeholder="e.g. https://linkedin.com/company/acme"
              value={socialUrl}
              onChange={(e) => setSocialUrl(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive mb-4 text-center">{error}</p>
      )}

      <Button
        size="lg"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full"
      >
        Generate my dashboard
      </Button>

      <p className="text-xs text-center text-muted-foreground mt-4">
        You can switch to real data anytime by connecting Xero
      </p>
    </div>
  );
}
