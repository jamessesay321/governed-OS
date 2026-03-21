'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  displayName: string;
  orgName: string;
};

type ScanResult = {
  company_name: string;
  industry: string;
  business_type: string;
  target_market: string;
  products_services: string[];
  value_proposition: string;
  estimated_stage: string;
  estimated_team_size: string;
  key_differentiators: string[];
  potential_challenges: string[];
  suggested_kpis: string[];
  suggested_modules: string[];
  conversation_starters: string[];
};

export function WelcomeClient({ displayName, orgName }: Props) {
  const router = useRouter();
  const [skipping, setSkipping] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  async function handleSkip() {
    setSkipping(true);
    try {
      await fetch('/api/onboarding/skip', { method: 'POST' });
      router.push('/dashboard');
    } catch {
      router.push('/dashboard');
    }
  }

  async function handleScanAndContinue() {
    // If no website or description, just go to interview
    if (!websiteUrl.trim() && !businessDescription.trim()) {
      router.push('/welcome/interview');
      return;
    }

    setScanning(true);
    setScanError(null);

    try {
      const res = await fetch('/api/onboarding/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteUrl: websiteUrl.trim() || undefined,
          businessDescription: businessDescription.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.scan) {
        setScanResult(data.scan);
        // Brief pause to show results, then navigate
        setTimeout(() => {
          router.push('/welcome/interview');
        }, 2500);
      } else {
        setScanError(data.error || 'Scan failed — continuing to interview');
        setTimeout(() => {
          router.push('/welcome/interview');
        }, 2000);
      }
    } catch {
      // Continue anyway — scan is best effort
      router.push('/welcome/interview');
    }
  }

  // Scanning state — show progress
  if (scanning) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20">
          {scanResult ? (
            // Scan complete — showing brief summary
            <div className="text-center space-y-4 animate-in fade-in duration-500">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-2">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-foreground">Got it!</h2>
              <p className="text-muted-foreground">
                We identified <span className="font-medium text-foreground">{scanResult.company_name}</span> as
                a <span className="font-medium text-foreground">{scanResult.business_type}</span> in
                the <span className="font-medium text-foreground">{scanResult.industry}</span> space.
              </p>
              {scanResult.suggested_modules.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  We&apos;ll suggest relevant modules like{' '}
                  <span className="font-medium">
                    {scanResult.suggested_modules.slice(0, 2).join(' and ')}
                  </span>{' '}
                  based on your business type.
                </p>
              )}
              <p className="text-sm text-primary animate-pulse mt-4">
                Preparing your personalised interview...
              </p>
            </div>
          ) : scanError ? (
            // Scan failed — continuing anyway
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">{scanError}</p>
              <p className="text-sm text-primary animate-pulse">Continuing to interview...</p>
            </div>
          ) : (
            // Still scanning
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-2">
                <svg className="h-8 w-8 text-primary animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">
                  Researching your business...
                </h2>
                <p className="text-muted-foreground">
                  We&apos;re scanning your website to personalise the onboarding experience.
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground max-w-xs mx-auto">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  Analysing your products and services
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
                  Identifying your industry and market
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:600ms]" />
                  Tailoring interview questions
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero greeting */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
          <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome, {displayName}
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          Let&apos;s set up <span className="font-medium text-foreground">{orgName}</span>&apos;s
          financial command centre.
        </p>
      </div>

      {/* Business info card */}
      <Card className="mb-6">
        <CardContent className="p-6 space-y-5">
          <div>
            <h3 className="font-semibold text-foreground mb-1">
              Tell us a bit about your business
            </h3>
            <p className="text-sm text-muted-foreground">
              We&apos;ll scan your website to personalise the setup experience and tailor our
              AI interview questions to your specific business.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="website">Website URL</Label>
              <Input
                id="website"
                type="url"
                placeholder="e.g., www.yourbusiness.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll read your homepage to understand what you do — nothing is stored externally.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Brief description <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="description"
                placeholder="e.g., We're a SaaS company selling project management tools to SMEs"
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What's Included */}
      <Card className="mb-6 border-emerald-200">
        <CardContent className="p-4 sm:p-5">
          <h4 className="text-sm font-medium text-foreground mb-3">What&apos;s included — free forever:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { icon: '\uD83D\uDD27', label: 'AI Setup Assistant' },
              { icon: '\uD83D\uDCCA', label: '5 Essential Modules' },
              { icon: '\uD83E\uDD16', label: 'AI-Powered Interview' },
              { icon: '\uD83D\uDEE1\uFE0F', label: 'Governance Centre' },
              { icon: '\uD83D\uDE80', label: 'Activation Roadmap' },
              { icon: '\uD83D\uDD0D', label: 'Free AI Stack Audit' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-base flex-shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="mb-8 bg-muted/30">
        <CardContent className="p-4 sm:p-5">
          <h4 className="text-sm font-medium text-foreground mb-3">How it works:</h4>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary flex-shrink-0">1</span>
              <span><span className="font-medium text-foreground">Connect Xero</span> (~2 min) — we pull your data securely</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary flex-shrink-0">2</span>
              <span><span className="font-medium text-foreground">Setup Agent configures</span> (~5 min) — AI maps accounts, sets budgets, checks quality</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary flex-shrink-0">3</span>
              <span><span className="font-medium text-foreground">You&apos;re live</span> — dashboard, KPIs, and intelligence ready to go</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Most businesses are up and running in under 15 minutes.</p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={handleSkip}
          disabled={skipping}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline text-center sm:text-left"
        >
          {skipping ? 'Redirecting...' : 'Skip setup for now'}
        </button>
        <Button
          size="lg"
          onClick={handleScanAndContinue}
          className="px-8 w-full sm:w-auto"
        >
          {websiteUrl.trim() || businessDescription.trim()
            ? 'Scan & get started'
            : 'Get started'}
        </Button>
      </div>
    </div>
  );
}
