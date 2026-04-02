'use client';

import { cn } from '@/lib/utils';

type Step = {
  label: string;
  description: string;
};

const STEPS: Step[] = [
  { label: 'Business Profile', description: 'Tell us about your business' },
  { label: 'Connect Xero', description: 'Link your accounting data' },
  { label: 'Dashboard', description: 'Explore your command centre' },
];

type Props = {
  currentStep: 1 | 2 | 3;
  completedSteps?: { interview: boolean; xero: boolean };
};

export function OnboardingProgress({ currentStep, completedSteps }: Props) {
  return (
    <div className="mb-6 sm:mb-8 px-4 sm:px-0">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted =
            (stepNumber === 1 && completedSteps?.interview) ||
            (stepNumber === 2 && completedSteps?.xero) ||
            stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep && !isCompleted;

          return (
            <div key={step.label} className="flex items-center flex-1">
              {/* Step indicator */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={cn(
                    'flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 text-xs sm:text-sm font-semibold transition-colors',
                    isCompleted &&
                      'border-primary bg-primary text-primary-foreground',
                    isCurrent &&
                      'border-primary bg-primary/10 text-primary',
                    isUpcoming &&
                      'border-muted-foreground/30 bg-muted/50 text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <svg
                      className="h-4 w-4 sm:h-5 sm:w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    stepNumber
                  )}
                </div>
                <div className="mt-1.5 sm:mt-2 text-center max-w-[80px] sm:max-w-none">
                  <p
                    className={cn(
                      'text-[10px] sm:text-xs font-medium leading-tight',
                      isCurrent || isCompleted
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Connecting line */}
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 mx-2 sm:mx-3 mt-[-1rem] sm:mt-[-1.5rem]',
                    isCompleted || isCurrent
                      ? 'bg-primary'
                      : 'bg-muted-foreground/20'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
