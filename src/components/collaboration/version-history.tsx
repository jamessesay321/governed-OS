'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Version {
  id: string;
  number: number;
  label?: string;
  author: string;
  authorInitials: string;
  summary: string;
  timestamp: string;
  isMaster: boolean;
}

interface VersionHistoryProps {
  entityType: string;
  entityName: string;
  open: boolean;
  onClose: () => void;
  onRestore?: (versionId: string) => void;
  onCompare?: (versionA: string, versionB: string) => void;
}

const DEMO_VERSIONS: Version[] = [
  {
    id: 'v5',
    number: 5,
    label: 'Post-Board Meeting Update',
    author: 'James Sesay',
    authorInitials: 'JS',
    summary: 'Updated revenue assumptions based on Q2 pipeline review. Adjusted COGS down 2%.',
    timestamp: '2 hours ago',
    isMaster: true,
  },
  {
    id: 'v4',
    number: 4,
    label: undefined,
    author: 'Sarah Mitchell',
    authorInitials: 'SM',
    summary: 'Added conservative hiring scenario. Reduced headcount growth from 15% to 8%.',
    timestamp: '1 day ago',
    isMaster: false,
  },
  {
    id: 'v3',
    number: 3,
    label: 'Pre-Board Review',
    author: 'James Sesay',
    authorInitials: 'JS',
    summary: 'Complete scenario with all 3 cases. Added commentary for each assumption.',
    timestamp: '3 days ago',
    isMaster: false,
  },
  {
    id: 'v2',
    number: 2,
    label: undefined,
    author: 'AI Assistant',
    authorInitials: 'AI',
    summary: 'Auto-generated base case from onboarding data and industry benchmarks.',
    timestamp: '1 week ago',
    isMaster: false,
  },
  {
    id: 'v1',
    number: 1,
    label: 'Initial Setup',
    author: 'System',
    authorInitials: 'SY',
    summary: 'Initial scenario created during onboarding.',
    timestamp: '2 weeks ago',
    isMaster: false,
  },
];

export function VersionHistory({ entityType, entityName, open, onClose, onRestore, onCompare }: VersionHistoryProps) {
  const [versions] = useState<Version[]>(DEMO_VERSIONS);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);

  if (!open) return null;

  function toggleVersion(id: string) {
    setSelectedVersions(prev => {
      if (prev.includes(id)) return prev.filter(v => v !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  return (
    <div className="fixed right-0 top-0 bottom-0 w-96 bg-white border-l shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold text-sm">Version History</h3>
          <p className="text-xs text-muted-foreground">{entityType}: {entityName}</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-2 border-b">
        <Button
          variant={compareMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setCompareMode(!compareMode); setSelectedVersions([]); }}
        >
          {compareMode ? 'Cancel Compare' : 'Compare Versions'}
        </Button>
        {compareMode && selectedVersions.length === 2 && (
          <Button size="sm" onClick={() => onCompare?.(selectedVersions[0], selectedVersions[1])}>
            Compare
          </Button>
        )}
        <Button variant="outline" size="sm" className="ml-auto">
          Save as Version
        </Button>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-200" />

          <div className="space-y-4">
            {versions.map((version) => (
              <div
                key={version.id}
                className={`relative pl-10 ${compareMode ? 'cursor-pointer' : ''} ${
                  selectedVersions.includes(version.id) ? 'bg-primary/5 -mx-4 px-14 py-2 rounded-lg' : ''
                }`}
                onClick={() => compareMode && toggleVersion(version.id)}
              >
                {/* Timeline dot */}
                <div className={`absolute left-1.5 top-1 h-4 w-4 rounded-full border-2 ${
                  version.isMaster
                    ? 'bg-green-500 border-green-300'
                    : selectedVersions.includes(version.id)
                    ? 'bg-primary border-primary/50'
                    : 'bg-white border-slate-300'
                }`} />

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">v{version.number}</span>
                    {version.label && (
                      <span className="text-xs text-muted-foreground">{version.label}</span>
                    )}
                    {version.isMaster && (
                      <Badge className="bg-green-50 text-green-600 text-[10px]">Master</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{version.summary}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-medium text-primary">
                      {version.authorInitials}
                    </div>
                    <span>{version.author}</span>
                    <span>{version.timestamp}</span>
                  </div>
                  {!compareMode && !version.isMaster && (
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => onRestore?.(version.id)}
                        className="text-[10px] text-primary hover:underline"
                      >
                        Restore
                      </button>
                      <button className="text-[10px] text-muted-foreground hover:text-foreground">
                        Promote to Master
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
