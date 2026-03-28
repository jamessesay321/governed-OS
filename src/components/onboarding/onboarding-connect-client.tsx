'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { OnboardingProgress } from './onboarding-progress';

type Props = {
  isConnected: boolean;
  tenantName: string | null;
  interviewCompleted: boolean;
};

export function OnboardingConnectClient({ isConnected, tenantName, interviewCompleted }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justConnected = searchParams.get('success') === 'true';
  const connected = isConnected || justConnected;
  const displayTenant = tenantName || searchParams.get('tenant') || 'Xero Organisation';

  return (
    <div>
      <OnboardingProgress
        currentStep={2}
        completedSteps={{ interview: interviewCompleted, xero: connected }}
      />

      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Connect your Xero account
            </h2>
            <p className="text-muted-foreground mt-1">
              Link your accounting data to power your financial dashboard.
            </p>
          </div>
          {!connected && (
            <button
              onClick={() => router.push('/welcome/interview')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline flex-shrink-0"
            >
              Skip for now
            </button>
          )}
        </div>

        {connected ? (
          /* Success state */
          <Card className="mb-8">
            <CardContent className="flex flex-col items-center text-center py-10">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-1">
                Xero Connected
              </h3>
              <p className="text-muted-foreground">
                Successfully connected to <span className="font-medium">{displayTenant}</span>.
                Your data is now syncing.
              </p>
            </CardContent>
          </Card>
        ) : (
          /* Connect prompt */
          <Card className="mb-8">
            <CardContent className="py-8">
              {/* Privacy messaging */}
              <div className="flex items-start gap-4 mb-6 p-4 rounded-lg bg-muted/50">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Your data stays private
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Each business connects their own Xero account. Your financial data is
                    isolated to your organisation. No other users or businesses can access it.
                  </p>
                </div>
              </div>

              {/* How it works */}
              <div className="space-y-3 mb-6">
                <h4 className="text-sm font-medium text-foreground">How it works:</h4>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">1</span>
                  Click Connect. You&apos;ll be taken to Xero to authorise
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">2</span>
                  Log in to your Xero account and approve access
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">3</span>
                  Your data syncs automatically. No manual uploads needed
                </div>
              </div>

              {/* Connect button */}
              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={() => {
                    window.location.href = '/api/xero/connect';
                  }}
                  className="px-8"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Connect Xero
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next button — go to interview now that we have data */}
        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={() => router.push('/welcome/interview')}
            className="px-8"
          >
            {connected ? 'Continue to interview' : 'Continue without Xero'}
          </Button>
        </div>
      </div>
    </div>
  );
}
