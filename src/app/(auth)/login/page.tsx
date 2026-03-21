'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const FEATURES = [
  {
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: 'Real-Time Financial Intelligence',
    description: 'AI-powered insights across your P&L, balance sheet, and cash flow, updated continuously.',
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
    title: 'Five Specialist AI Agents',
    description: 'Finance, marketing, compliance, strategy, and operations agents working as your digital team.',
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: 'Governance & Compliance Built In',
    description: 'Full audit trail, role-based access, and regulatory-ready reporting from day one.',
  },
  {
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
    title: 'Scenario Planning & Forecasting',
    description: 'Model any business scenario instantly. See the financial impact before you commit.',
  },
];

const TRUST_STATS = [
  { value: '16+', label: 'Financial Modules' },
  { value: '5', label: 'AI Agents' },
];

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Brand & Marketing */}
      <div
        className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ backgroundColor: '#2c2a29' }}
      >
        {/* Subtle gradient overlay */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(ellipse at 30% 20%, rgba(200,160,120,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(180,140,100,0.1) 0%, transparent 50%)',
          }}
        />

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(200,160,120,0.15)', border: '1px solid rgba(200,160,120,0.2)' }}>
              <svg className="h-5 w-5" style={{ color: '#c8a078' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
              </svg>
            </div>
            <span className="text-xl font-semibold tracking-tight" style={{ color: '#f5f0eb' }}>
              Governed OS
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight leading-tight mb-4" style={{ color: '#f5f0eb' }}>
            The financial operating
            <br />
            system for ambitious
            <br />
            businesses.
          </h1>
          <p className="text-lg mb-12" style={{ color: 'rgba(245,240,235,0.6)' }}>
            AI-powered financial intelligence, governance, and strategic planning. All in one platform.
          </p>

          {/* Feature list */}
          <div className="space-y-6">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex items-start gap-4">
                <div
                  className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: 'rgba(200,160,120,0.1)', color: '#c8a078' }}
                >
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-0.5" style={{ color: '#f5f0eb' }}>
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(245,240,235,0.5)' }}>
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — Trust stats */}
        <div className="relative z-10">
          <div className="flex items-center gap-8 mb-6">
            {TRUST_STATS.map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold" style={{ color: '#c8a078' }}>{stat.value}</p>
                <p className="text-xs" style={{ color: 'rgba(245,240,235,0.4)' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12" style={{ backgroundColor: '#faf8f5' }}>
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1c1b1b' }}>
            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
          </div>
          <span className="text-lg font-semibold" style={{ color: '#1c1b1b' }}>Governed OS</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: '#1c1b1b' }}>
              Welcome back
            </h2>
            <p className="text-sm mt-1.5" style={{ color: '#8a8580' }}>
              Sign in to your financial command centre
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium" style={{ color: '#1c1b1b' }}>
                Email address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                required
                className="h-11 rounded-lg border-border/60 bg-white focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium" style={{ color: '#1c1b1b' }}>
                  Password
                </Label>
                <button type="button" className="text-xs font-medium hover:underline" style={{ color: '#c8a078' }}>
                  Forgot password?
                </button>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="h-11 rounded-lg border-border/60 bg-white focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-lg text-sm font-semibold"
              disabled={loading}
              style={{ backgroundColor: '#1c1b1b', color: '#f5f0eb' }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/40" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3" style={{ backgroundColor: '#faf8f5', color: '#8a8580' }}>
                or continue with
              </span>
            </div>
          </div>

          {/* SSO Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-2 h-11 rounded-lg border border-border/60 bg-white text-sm font-medium hover:bg-muted/50 transition-colors opacity-50 cursor-not-allowed relative"
              style={{ color: '#1c1b1b' }}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
              <span className="absolute -top-2 -right-2 text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Soon</span>
            </button>
            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-2 h-11 rounded-lg border border-border/60 bg-white text-sm font-medium hover:bg-muted/50 transition-colors opacity-50 cursor-not-allowed relative"
              style={{ color: '#1c1b1b' }}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
              </svg>
              Apple
              <span className="absolute -top-2 -right-2 text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Soon</span>
            </button>
          </div>

          <p className="text-center text-sm mt-8" style={{ color: '#8a8580' }}>
            New to Governed OS?{' '}
            <Link href="/signup" className="font-semibold hover:underline" style={{ color: '#1c1b1b' }}>
              Start your free trial
            </Link>
          </p>

          {/* Compliance badges */}
          <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-border/30">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: '#8a8580' }}>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              SOC 2 Compliant
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: '#8a8580' }}>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              256-bit Encryption
            </div>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: '#8a8580' }}>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
              GDPR Ready
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
