'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Status = 'validating' | 'success' | 'expired' | 'invalid' | 'error';

export default function InvestorLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p>Loading...</p></div>}>
      <InvestorLoginContent />
    </Suspense>
  );
}

function InvestorLoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('validating');
  const [message, setMessage] = useState('Validating your invite link...');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setMessage('No invite token provided. Please use the link from your email.');
      return;
    }

    async function validate() {
      try {
        const res = await fetch('/api/auth/investor-validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.code === 'expired') {
            setStatus('expired');
            setMessage('This invite link has expired. Please ask the organisation owner to resend.');
          } else if (data.code === 'invalid') {
            setStatus('invalid');
            setMessage('This invite link is not valid. It may have already been used.');
          } else {
            setStatus('error');
            setMessage(data.error || 'Something went wrong. Please try again.');
          }
          return;
        }

        setStatus('success');
        setMessage('Access granted. Redirecting to your investor dashboard...');

        // Redirect to the investor dashboard for the org
        setTimeout(() => {
          router.push('/investor-portal');
        }, 1500);
      } catch {
        setStatus('error');
        setMessage('Network error. Please check your connection and try again.');
      }
    }

    validate();
  }, [token, router]);

  const statusIcon: Record<Status, React.ReactNode> = {
    validating: (
      <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    ),
    success: (
      <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
        <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    ),
    expired: (
      <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
        <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    ),
    invalid: (
      <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
        <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    ),
    error: (
      <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
        <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
    ),
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">G</span>
            </div>
          </div>
          <CardTitle className="text-xl">Investor Portal</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          {statusIcon[status]}
          <p className="text-sm text-muted-foreground text-center max-w-xs">{message}</p>
          {(status === 'expired' || status === 'invalid' || status === 'error') && (
            <Button variant="outline" onClick={() => router.push('/login')}>
              Go to Login
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
