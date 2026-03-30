'use client';

import Link from 'next/link';
import { AlertCircle, ArrowRight } from 'lucide-react';
import type { TrendItem } from './page';

interface TrendsClientProps {
  trends: TrendItem[];
  hasData: boolean;
}

export function TrendsClient({ trends, hasData }: TrendsClientProps) {
  if (!hasData) {
    return (
      <div className="max-w-4xl space-y-6">
        <Link href="/intelligence" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Intelligence
        </Link>
        <h2 className="text-2xl font-bold">Trend Analysis</h2>
        <p className="text-sm text-muted-foreground">
          AI-identified trends across your financial and operational data
        </p>
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No Financial Data</h3>
          <p className="mt-2 text-sm text-gray-500">
            Connect your accounting software to see real trends.
          </p>
          <Link
            href="/settings"
            className="mt-4 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            Connect Account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="max-w-4xl space-y-6">
        <Link href="/intelligence" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Intelligence
        </Link>
        <h2 className="text-2xl font-bold">Trend Analysis</h2>
        <p className="text-sm text-muted-foreground">
          AI-identified trends across your financial and operational data
        </p>
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Insufficient Data</h3>
          <p className="mt-2 text-sm text-gray-500">
            At least 2 periods of data are needed to identify trends.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/intelligence" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Intelligence
      </Link>
      <h2 className="text-2xl font-bold">Trend Analysis</h2>
      <p className="text-sm text-muted-foreground">
        AI-identified trends across your financial and operational data
      </p>
      <div className="space-y-3">
        {trends.map((t, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  t.direction === 'up'
                    ? 'bg-green-100 text-green-600'
                    : t.direction === 'down'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {t.direction === 'up' ? '\u2191' : t.direction === 'down' ? '\u2193' : '\u2192'}
              </div>
              <div>
                <h3 className="text-sm font-semibold">{t.title}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{t.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
