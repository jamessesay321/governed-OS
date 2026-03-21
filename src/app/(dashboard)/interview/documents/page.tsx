'use client';

import Link from 'next/link';

export default function InterviewDocumentsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      <Link href="/interview" className="text-sm text-muted-foreground hover:text-foreground">&larr; Business Profile</Link>
      <h2 className="text-2xl font-bold">Documents</h2>
      <p className="text-sm text-muted-foreground">Upload business documents to enhance AI insights</p>
      <div className="rounded-lg border-2 border-dashed border-border p-12 text-center hover:border-primary/50 transition-colors cursor-pointer">
        <svg className="mx-auto h-10 w-10 text-muted-foreground mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
        <p className="text-xs text-muted-foreground mt-1">PDF, XLSX, CSV, DOCX up to 10MB</p>
      </div>
    </div>
  );
}
