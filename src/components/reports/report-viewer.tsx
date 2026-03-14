'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReportSectionCard } from './report-section';
import type { Report, ReportSection } from '@/types/reports';

interface ReportViewerProps {
  report: Report;
  orgId: string;
}

export function ReportViewer({ report, orgId }: ReportViewerProps) {
  const router = useRouter();
  const [currentReport, setCurrentReport] = useState(report);
  const [publishing, setPublishing] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sortedSections = [...currentReport.sections].sort((a, b) => a.order - b.order);

  async function handlePublish() {
    setPublishing(true);
    try {
      const response = await fetch(`/api/reports/${orgId}/${currentReport.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      });
      if (response.ok) {
        const { report: updated } = await response.json();
        setCurrentReport(updated);
      }
    } catch (error) {
      console.error('Failed to publish report:', error);
    } finally {
      setPublishing(false);
    }
  }

  async function handleCommentaryUpdate(sectionId: string, commentary: string) {
    const updatedSections = currentReport.sections.map((s) =>
      s.id === sectionId ? { ...s, commentary } : s
    );

    try {
      const response = await fetch(`/api/reports/${orgId}/${currentReport.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: updatedSections }),
      });
      if (response.ok) {
        const { report: updated } = await response.json();
        setCurrentReport(updated);
      }
    } catch (error) {
      console.error('Failed to update commentary:', error);
    }
  }

  function handleExport() {
    window.open(`/api/reports/${orgId}/${currentReport.id}/pdf`, '_blank');
  }

  return (
    <div className="flex gap-6">
      {/* Section navigation sidebar */}
      <div className="hidden w-56 flex-shrink-0 lg:block">
        <div className="sticky top-6 space-y-1">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sections</p>
          {sortedSections.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                setActiveSection(section.id);
                document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                activeSection === section.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className="mr-2 text-xs opacity-60">{section.order + 1}.</span>
              {section.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 space-y-6">
        {/* Report header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl">{currentReport.title}</CardTitle>
                  <Badge variant={currentReport.status === 'published' ? 'default' : 'secondary'}>
                    {currentReport.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {currentReport.period_start} to {currentReport.period_end}
                  {' '}&middot;{' '}
                  {new Date(currentReport.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export
                </Button>
                {currentReport.status === 'draft' && (
                  <Button size="sm" onClick={handlePublish} disabled={publishing}>
                    {publishing ? 'Publishing...' : 'Approve & Publish'}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          {currentReport.ai_commentary && (
            <CardContent>
              <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4 dark:bg-blue-950/30">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">Executive Summary</p>
                <p className="text-sm text-blue-900 dark:text-blue-100">{currentReport.ai_commentary}</p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Report sections */}
        {sortedSections.map((section) => (
          <ReportSectionCard
            key={section.id}
            section={section}
            editable={currentReport.status === 'draft'}
            onCommentaryUpdate={handleCommentaryUpdate}
          />
        ))}
      </div>
    </div>
  );
}
