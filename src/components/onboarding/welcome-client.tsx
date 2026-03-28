'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

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
  const [path, setPath] = useState<'choice' | 'full-setup'>('choice');

  async function handleSignOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push('/login');
  }
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  async function handleScanAndContinue() {
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
        setTimeout(() => {
          router.push('/welcome/interview');
        }, 2500);
      } else {
        setScanError(data.error || 'Scan failed. Continuing to interview');
        setTimeout(() => {
          router.push('/welcome/interview');
        }, 2000);
      }
    } catch {
      router.push('/welcome/interview');
    }
  }

  // Scanning state for full setup path
  if (scanning) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20">
          {scanResult ? (
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
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">{scanError}</p>
              <p className="text-sm text-primary animate-pulse">Continuing to interview...</p>
            </div>
          ) : (
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

  // Full setup path: show business scan form
  if (path === 'full-setup') {
    return (
      <div className="max-w-2xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => setPath('choice')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            Let&apos;s set up your real data
          </h1>
          <p className="text-muted-foreground mt-2">
            Tell us about <span className="font-medium text-foreground">{orgName}</span> and we&apos;ll
            personalise everything for you.
          </p>
        </div>

        {/* Business info card */}
        <Card className="mb-6">
          <CardContent className="p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-foreground mb-1">
                Tell us about your business
              </h3>
              <p className="text-sm text-muted-foreground">
                We&apos;ll scan your website to personalise the setup and tailor our
                AI interview to your specific business.
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
                  We&apos;ll read your homepage to understand what you do. Nothing is stored externally.
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

        {/* What you get with full setup */}
        <Card className="mb-6 border-emerald-200">
          <CardContent className="p-4 sm:p-5">
            <h4 className="text-sm font-medium text-foreground mb-3">With full setup you get:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { icon: '🔗', label: 'Live Xero data sync' },
                { icon: '🤖', label: 'AI-powered business profile' },
                { icon: '📊', label: 'Real financial dashboard' },
                { icon: '🎁', label: '1 month free on any plan' },
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
                <span><span className="font-medium text-foreground">Connect Xero</span> (~2 min). We pull your data securely</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary flex-shrink-0">2</span>
                <span><span className="font-medium text-foreground">AI interview</span> (~10 min). We learn about your business goals</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary flex-shrink-0">3</span>
                <span><span className="font-medium text-foreground">You&apos;re live</span>. Real data, personalised insights, ready to go</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Most businesses are up and running in under 15 minutes.</p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={handleScanAndContinue}
            className="px-8 w-full sm:w-auto"
          >
            {websiteUrl.trim() || businessDescription.trim()
              ? 'Scan & continue'
              : 'Continue to interview'}
          </Button>
        </div>
      </div>
    );
  }

  // Default: Two-path choice screen
  return (
    <div className="max-w-3xl mx-auto">
      {/* Top nav with sign out and skip */}
      <div className="flex items-center justify-between mb-8 -mt-4">
        <button
          onClick={() => router.push('/home')}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip to dashboard
        </button>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{displayName}</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-muted-foreground hover:text-red-600 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Hero greeting */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
          <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome, {displayName}
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          How would you like to get started with{' '}
          <span className="font-medium text-foreground">{orgName}</span>?
        </p>
      </div>

      {/* Two path cards */}
      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        {/* Path A: Demo Mode */}
        <Card className="relative overflow-hidden hover:border-primary/50 transition-all cursor-pointer group"
          onClick={() => router.push('/welcome/demo')}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-2xl">
                🎯
              </div>
              <Badge variant="secondary" className="text-xs">~2 min</Badge>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Explore with sample data
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              See a working dashboard instantly with realistic data tailored to your industry. Perfect for a quick look around.
            </p>
            <ul className="space-y-2 mb-6">
              {[
                'Live dashboard in under 2 minutes',
                'Realistic sample data for your industry',
                'Upgrade to real data anytime',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <svg className="h-4 w-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              Get started
            </Button>
          </CardContent>
        </Card>

        {/* Path B: Full Setup */}
        <Card className="relative overflow-hidden border-primary/30 hover:border-primary transition-all cursor-pointer group"
          onClick={() => setPath('full-setup')}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">
                🚀
              </div>
              <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Recommended</Badge>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Set up with your real data
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Connect Xero, complete an AI-powered business profile, and get a fully personalised experience.
            </p>
            <ul className="space-y-2 mb-6">
              {[
                'Connect Xero for live financials',
                'AI-powered business profile',
                '1 month free on any plan',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <svg className="h-4 w-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <Button className="w-full">
              Start full setup
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* What's included free */}
      <Card className="border-emerald-200/50 bg-emerald-50/30">
        <CardContent className="p-4 sm:p-5">
          <h4 className="text-sm font-medium text-foreground mb-3">Included free with every account:</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { icon: '🔧', label: 'AI Setup Assistant' },
              { icon: '📊', label: '5 Essential Modules' },
              { icon: '🤖', label: 'AI-Powered Interview' },
              { icon: '🛡️', label: 'Governance Centre' },
              { icon: '🚀', label: 'Activation Roadmap' },
              { icon: '🔍', label: 'Free AI Stack Audit' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-base flex-shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
