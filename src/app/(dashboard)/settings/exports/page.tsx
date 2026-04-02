'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Data Export Centre                                                  */
/* ------------------------------------------------------------------ */

const EXPORT_OPTIONS = [
  {
    label: 'Financial Statements',
    description: 'P&L, Balance Sheet, Cash Flow, last 12 months',
    formats: ['CSV'],
    apiType: 'financials',
    icon: '📊',
  },
  {
    label: 'Transaction History',
    description: 'All synced transactions with categories and notes',
    formats: ['CSV'],
    apiType: 'transactions',
    icon: '📋',
  },
  {
    label: 'KPI & Metrics Report',
    description: 'All tracked KPIs with historical data and targets',
    formats: ['CSV'],
    apiType: 'kpis',
    icon: '📈',
  },
  {
    label: 'Audit Trail',
    description: 'Full governance and compliance audit log',
    formats: ['CSV'],
    apiType: 'audit_trail',
    icon: '🔒',
  },
];

const SCHEDULED_EXPORTS = [
  { name: 'Monthly P&L Summary', frequency: 'Monthly', nextRun: '1 Apr 2026', format: 'PDF', status: 'active' },
  { name: 'Weekly Cash Position', frequency: 'Weekly', nextRun: '24 Mar 2026', format: 'XLSX', status: 'active' },
];

export default function ExportsPage() {
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (apiType: string, format: string, label: string) => {
    const key = label + format;
    setExporting(key);
    try {
      const res = await fetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: apiType, format: format.toLowerCase() }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? `grove-export.${format.toLowerCase()}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      console.error('Export failed');
    } finally {
      setTimeout(() => setExporting(null), 1500);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: '#1c1b1b' }}>Data Exports</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Download your financial data in various formats for external analysis or compliance.
        </p>
      </div>

      {/* Export Options */}
      <div className="space-y-3">
        {EXPORT_OPTIONS.map((opt) => (
          <Card key={opt.label}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{opt.icon}</span>
                  <div>
                    <p className="text-sm font-semibold">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {opt.formats.map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => handleExport(opt.apiType, fmt, opt.label)}
                      className={cn(
                        'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                        exporting === opt.label + fmt
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'border-border hover:border-primary/40 hover:bg-muted/50'
                      )}
                    >
                      {exporting === opt.label + fmt ? 'Downloaded' : fmt}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Scheduled Exports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scheduled Exports</CardTitle>
          <CardDescription>
            Automatically generate and email exports on a recurring schedule.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Export</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Frequency</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Next Run</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Format</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {SCHEDULED_EXPORTS.map((exp) => (
                  <tr key={exp.name} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">{exp.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{exp.frequency}</td>
                    <td className="px-4 py-3 text-muted-foreground">{exp.nextRun}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">{exp.format}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 text-xs">
                        Active
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="mt-4 text-sm font-medium text-primary hover:underline">
            + Schedule new export
          </button>
        </CardContent>
      </Card>

      {/* API Access */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">API Access</CardTitle>
          <CardDescription>
            Programmatic access for custom integrations and automated workflows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">API Key</p>
              <Badge variant="outline" className="text-xs">Read-Only</Badge>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 rounded-md border bg-background px-4 py-2.5 text-sm font-mono text-muted-foreground truncate">
                gov_sk_••••••••••••••••••••••••
              </div>
              <button className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors">
                Reveal
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Use this key to access the Grove API. See{' '}
              <button className="text-primary hover:underline">documentation</button> for endpoints.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
