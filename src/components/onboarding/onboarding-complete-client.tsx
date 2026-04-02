'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Celebration } from '@/components/ui/celebration';
import { OnboardingProgress } from './onboarding-progress';

type SetupStats = {
  accountsMapped: number;
  dataHealthScore: number | null;
  periodsAvailable: number;
};

type Props = {
  orgName: string;
  interviewCompleted: boolean;
  xeroConnected: boolean;
  setupStats?: SetupStats;
};

function buildSetupTasks(stats?: SetupStats, xeroConnected?: boolean): { label: string; done: boolean }[] {
  const tasks: { label: string; done: boolean }[] = [];

  if (xeroConnected && stats?.accountsMapped && stats.accountsMapped > 0) {
    tasks.push({ label: `Mapped ${stats.accountsMapped} Xero accounts to platform categories`, done: true });
  } else if (xeroConnected) {
    tasks.push({ label: 'Account mapping in progress', done: false });
  }

  if (stats?.periodsAvailable && stats.periodsAvailable > 0) {
    tasks.push({ label: `Imported ${stats.periodsAvailable} months of financial data`, done: true });
  }

  if (stats?.dataHealthScore != null) {
    tasks.push({ label: `Data quality score: ${stats.dataHealthScore}/100`, done: true });
  }

  // Always show at least one task
  if (tasks.length === 0) {
    tasks.push({ label: 'Platform configured and ready', done: true });
  }

  return tasks;
}

export function OnboardingCompleteClient({ orgName, interviewCompleted, xeroConnected, setupStats }: Props) {
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
      <Celebration trigger={true} />
      <OnboardingProgress
        currentStep={3}
        completedSteps={{ interview: interviewCompleted, xero: xeroConnected }}
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-0 text-center">
        {/* Celebration */}
        <div className="mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-primary/10 mb-4">
            <svg className="h-8 w-8 sm:h-10 sm:w-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            You&apos;re all set!
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            <span className="font-medium text-foreground">{orgName}</span> is ready to go.
          </p>
        </div>

        {/* Setup summary */}
        <Card className="mb-6 text-left">
          <CardContent className="py-4 sm:py-6 space-y-4">
            <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider text-center mb-4">
              Setup Summary
            </h3>

            {/* Interview status */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${interviewCompleted ? 'bg-green-100' : 'bg-amber-100'}`}>
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
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {interviewCompleted ? 'Business profile completed' : 'Business profile skipped'}
                </p>
                {!interviewCompleted && (
                  <p className="text-xs text-muted-foreground">
                    You can complete this anytime from the Interview page.
                  </p>
                )}
              </div>
            </div>

            {/* Xero status */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${xeroConnected ? 'bg-green-100' : 'bg-amber-100'}`}>
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
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {xeroConnected ? 'Xero connected and syncing' : 'Xero not connected yet'}
                </p>
                {!xeroConnected && (
                  <p className="text-xs text-muted-foreground">
                    Connect Xero anytime from the Xero Integration page.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Setup Agent Activity */}
        <Card className="mb-6 text-left border-teal-200">
          <CardContent className="py-4 sm:py-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-xl flex-shrink-0">
                {'\uD83D\uDD27'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Your Setup Agent has configured your platform</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="h-2 w-2 rounded-full bg-teal-500" />
                  <span className="text-xs text-teal-600 font-medium">Complete</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {buildSetupTasks(setupStats, xeroConnected).map((task) => (
                <div key={task.label} className="flex items-center gap-2 text-sm">
                  <svg className="h-4 w-4 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-muted-foreground">{task.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Roadmap Preview */}
        <Card className="mb-6 text-left">
          <CardContent className="py-4 sm:py-6">
            <h3 className="font-semibold text-foreground text-sm mb-3">Your Activation Roadmap</h3>
            <div className="space-y-2">
              {[
                { label: 'Create your account', status: 'completed' as const },
                { label: 'Connect Xero', status: xeroConnected ? 'completed' as const : 'in_progress' as const },
                { label: 'Set budget baselines', status: 'available' as const },
              ].map((step) => (
                <div key={step.label} className="flex items-center gap-2.5">
                  {step.status === 'completed' ? (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 flex-shrink-0">
                      <svg className="h-3 w-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : step.status === 'in_progress' ? (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    </div>
                  ) : (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border border-border flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-muted" />
                    </div>
                  )}
                  <span className="text-sm text-muted-foreground">{step.label}</span>
                  {step.status === 'in_progress' && (
                    <Badge variant="secondary" className="text-xs">In progress</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="flex flex-col gap-3 items-center">
          <Button
            size="lg"
            onClick={handleGoToDashboard}
            disabled={loading}
            className="px-10 w-full sm:w-auto"
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
          <Link
            href="/roadmap"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            View Full Roadmap
          </Link>
        </div>
      </div>
    </div>
  );
}
