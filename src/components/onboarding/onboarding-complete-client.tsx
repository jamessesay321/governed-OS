'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { OnboardingProgress } from './onboarding-progress';

type Props = {
  orgName: string;
  interviewCompleted: boolean;
  xeroConnected: boolean;
};

export function OnboardingCompleteClient({ orgName, interviewCompleted, xeroConnected }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleGoToDashboard() {
    setLoading(true);
    try {
      await fetch('/api/onboarding/complete', { method: 'POST' });
      router.push('/dashboard');
    } catch {
      router.push('/dashboard');
    }
  }

  return (
    <div>
      <OnboardingProgress
        currentStep={3}
        completedSteps={{ interview: interviewCompleted, xero: xeroConnected }}
      />

      <div className="max-w-2xl mx-auto text-center">
        {/* Celebration */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-primary/10 mb-4">
            <svg className="h-10 w-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-2">
            You&apos;re all set!
          </h2>
          <p className="text-lg text-muted-foreground">
            <span className="font-medium text-foreground">{orgName}</span> is ready to go.
          </p>
        </div>

        {/* Setup summary */}
        <Card className="mb-8 text-left">
          <CardContent className="py-6 space-y-4">
            <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider text-center mb-4">
              Setup Summary
            </h3>

            {/* Interview status */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${interviewCompleted ? 'bg-green-100' : 'bg-amber-100'}`}>
                {interviewCompleted ? (
                  <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {interviewCompleted ? 'Business profile completed' : 'Business profile skipped'}
                </p>
                {!interviewCompleted && (
                  <p className="text-xs text-muted-foreground">
                    You can complete this anytime from the Interview page in the sidebar.
                  </p>
                )}
              </div>
            </div>

            {/* Xero status */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${xeroConnected ? 'bg-green-100' : 'bg-amber-100'}`}>
                {xeroConnected ? (
                  <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {xeroConnected ? 'Xero connected and syncing' : 'Xero not connected yet'}
                </p>
                {!xeroConnected && (
                  <p className="text-xs text-muted-foreground">
                    Connect Xero anytime from the Xero Integration page in the sidebar.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Button
          size="lg"
          onClick={handleGoToDashboard}
          disabled={loading}
          className="px-10"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
              Loading...
            </>
          ) : (
            'Go to your dashboard'
          )}
        </Button>
      </div>
    </div>
  );
}
