'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function DemoBanner() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5">
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-amber-600 text-sm flex-shrink-0">🎯</span>
          <p className="text-sm text-amber-800 truncate">
            You&apos;re exploring with sample data.{' '}
            <span className="hidden sm:inline">Ready for the real thing?</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={() => router.push('/welcome')}
          >
            Connect Xero
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-400 hover:text-amber-600 transition-colors"
            aria-label="Dismiss banner"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
