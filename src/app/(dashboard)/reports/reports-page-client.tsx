'use client';

import Link from 'next/link';
import { IntelligencePageWrapper } from '@/components/intelligence/intelligence-page-wrapper';
import { ReportList } from '@/components/reports/report-list';

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

interface ReportsPageClientProps {
  reports: ReportListItem[];
  orgId: string;
}

export function ReportsPageClient({ reports, orgId }: ReportsPageClientProps) {
  return (
    <IntelligencePageWrapper
      title="Reports"
      subtitle="Generate and manage board packs, monthly reviews, and investor updates"
      section="reports"
    >
      <div className="flex justify-end">
        <Link
          href="/reports/new"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Generate New Report
        </Link>
      </div>

      <ReportList reports={reports} orgId={orgId} />
    </IntelligencePageWrapper>
  );
}
