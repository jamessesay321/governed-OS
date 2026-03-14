'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ReportListItem {
  id: string;
  report_type: string;
  title: string;
  status: string;
  period_start: string;
  period_end: string;
  created_at: string;
  generated_by: string;
}

interface ReportListProps {
  reports: ReportListItem[];
  orgId: string;
}

const TYPE_LABELS: Record<string, string> = {
  board_pack: 'Board Pack',
  monthly_review: 'Monthly Review',
  investor_update: 'Investor Update',
  custom: 'Custom',
};

export function ReportList({ reports, orgId }: ReportListProps) {
  const router = useRouter();

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <svg className="mb-4 h-12 w-12 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-lg font-medium">No reports yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Generate your first report to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <Card
          key={report.id}
          className="cursor-pointer transition-all hover:shadow-md"
          onClick={() => router.push(`/reports/${report.id}`)}
        >
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium">{report.title}</p>
                <Badge variant={report.status === 'published' ? 'default' : 'secondary'} className="flex-shrink-0 text-xs">
                  {report.status}
                </Badge>
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{TYPE_LABELS[report.report_type] || report.report_type}</span>
                <span>&middot;</span>
                <span>{report.period_start} to {report.period_end}</span>
                <span>&middot;</span>
                <span>{new Date(report.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="flex-shrink-0">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
