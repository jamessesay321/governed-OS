'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const VALUE_PROPS = [
  { title: 'Set up in under 3 minutes', description: 'Connect your accounting software and let our AI do the rest.' },
  { title: 'No credit card required', description: 'Start with full access to explore every feature on the platform.' },
  { title: 'Your data stays yours', description: 'Enterprise-grade security with SOC 2 compliance and full audit trails.' },
];

export default function SignupPage() {
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
    const orgName = formData.get('orgName') as string;
    const displayName = formData.get('displayName') as string;

    try {
      const supabase = createClient();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            org_name: orgName,
            display_name: displayName,
          },
        },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError('Signup failed. Please try again.');
        setLoading(false);
        return;
      }

      if (authData.user.identities && authData.user.identities.length === 0) {
        setError('An account with this email already exists. Please log in instead.');
        setLoading(false);
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName,
          displayName,
          userId: authData.user.id,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to set up organisation');
        setLoading(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Brand & Marketing */}
      <div
        className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ backgroundColor: '#1c1b1b' }}
      >
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
            Your finance team
            <br />
            just got a lot
            <br />
            more intelligent.
          </h1>
          <p className="text-lg mb-16" style={{ color: 'rgba(245,240,235,0.6)' }}>
            Join hundreds of businesses using AI-powered financial governance to make smarter, faster decisions.
          </p>

          {/* Value props */}
          <div className="space-y-8">
            {VALUE_PROPS.map((prop, idx) => (
              <div key={prop.title} className="flex items-start gap-4">
                <div
                  className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: 'rgba(200,160,120,0.15)', color: '#c8a078' }}
                >
                  {idx + 1}
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-0.5" style={{ color: '#f5f0eb' }}>
                    {prop.title}
                  </h3>
                  <p className="text-sm" style={{ color: 'rgba(245,240,235,0.5)' }}>
                    {prop.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="relative z-10">
          <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(200,160,120,0.08)', border: '1px solid rgba(200,160,120,0.12)' }}>
            <p className="text-sm italic leading-relaxed" style={{ color: 'rgba(245,240,235,0.7)' }}>
              &ldquo;Governed OS completely transformed how we understand our finances. The AI insights alone have saved us hours every week.&rdquo;
            </p>
            <div className="flex items-center gap-3 mt-4">
              <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'rgba(200,160,120,0.2)', color: '#c8a078' }}>
                SM
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: '#f5f0eb' }}>Sarah Mitchell</p>
                <p className="text-xs" style={{ color: 'rgba(245,240,235,0.4)' }}>CFO, Luxe Brides UK</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Signup Form */}
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
              Start your free trial
            </h2>
            <p className="text-sm mt-1.5" style={{ color: '#8a8580' }}>
              Set up your organisation in under 3 minutes
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="orgName" className="text-sm font-medium" style={{ color: '#1c1b1b' }}>
                  Organisation
                </Label>
                <Input
                  id="orgName"
                  name="orgName"
                  placeholder="Acme Corp"
                  required
                  className="h-11 rounded-lg border-border/60 bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="displayName" className="text-sm font-medium" style={{ color: '#1c1b1b' }}>
                  Your Name
                </Label>
                <Input
                  id="displayName"
                  name="displayName"
                  placeholder="Jane Smith"
                  required
                  className="h-11 rounded-lg border-border/60 bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium" style={{ color: '#1c1b1b' }}>
                Work email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                required
                className="h-11 rounded-lg border-border/60 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium" style={{ color: '#1c1b1b' }}>
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={8}
                required
                placeholder="Minimum 8 characters"
                className="h-11 rounded-lg border-border/60 bg-white"
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
                  Creating account...
                </span>
              ) : (
                'Create free account'
              )}
            </Button>

            <p className="text-xs text-center" style={{ color: '#8a8580' }}>
              By creating an account, you agree to our{' '}
              <button type="button" className="underline hover:no-underline">Terms of Service</button>
              {' '}and{' '}
              <button type="button" className="underline hover:no-underline">Privacy Policy</button>
            </p>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/40" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3" style={{ backgroundColor: '#faf8f5', color: '#8a8580' }}>
                or sign up with
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
            Already have an account?{' '}
            <Link href="/login" className="font-semibold hover:underline" style={{ color: '#1c1b1b' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
