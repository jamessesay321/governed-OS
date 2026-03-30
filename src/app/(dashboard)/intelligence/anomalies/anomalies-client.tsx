'use client';

import Link from 'next/link';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useCurrency } from '@/components/providers/currency-context';
import type { Anomaly } from './page';

interface AnomaliesClientProps {
  anomalies: Anomaly[];
  hasData: boolean;
}

export function AnomaliesClient({ anomalies, hasData }: AnomaliesClientProps) {
  const { format } = useCurrency();

  if (!hasData) {
    return (
      <div className="max-w-4xl space-y-6">
        <Link href="/intelligence" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Intelligence
        </Link>
        <h2 className="text-2xl font-bold">Anomaly Detection</h2>
        <p className="text-sm text-muted-foreground">
          AI identifies unusual patterns, outliers, and trend breaks in your financial data
        </p>
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No Financial Data</h3>
          <p className="mt-2 text-sm text-gray-500">
            Connect your accounting software to detect real anomalies.
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

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/intelligence" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Intelligence
      </Link>
      <h2 className="text-2xl font-bold">Anomaly Detection</h2>
      <p className="text-sm text-muted-foreground">
        AI identifies unusual patterns, outliers, and trend breaks in your financial data
      </p>

      {anomalies.length === 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <h3 className="text-lg font-semibold text-emerald-900">No Anomalies Detected</h3>
          <p className="mt-2 text-sm text-emerald-700">
            All accounts are within normal variation ranges between the latest two periods.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {anomalies.map((a, i) => (
            <div key={i} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        a.severity === 'high'
                          ? 'bg-red-500'
                          : a.severity === 'medium'
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                      }`}
                    />
                    <h3 className="text-sm font-semibold">{a.title}</h3>
                  </div>
                  <p className="mt-1 ml-4 text-xs text-muted-foreground">{a.detail}</p>
                </div>
                <span className="ml-4 whitespace-nowrap text-xs font-medium text-muted-foreground">
                  {a.impact}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
