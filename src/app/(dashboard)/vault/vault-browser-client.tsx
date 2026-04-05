'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Search, Filter, Archive, Clock, Shield, ChevronRight,
  FileBarChart, Brain, AlertTriangle, MessageSquare, ClipboardList,
  TrendingUp, BookOpen, Upload, Download, Paperclip, X, ChevronDown,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ai-reasoning';

// ============================================================
// Types
// ============================================================

interface VaultItem {
  id: string;
  item_type: string;
  title: string;
  description: string;
  tags: string[];
  status: string;
  current_version: number;
  source_entity_type: string | null;
  period_start: string | null;
  period_end: string | null;
  model_id: string | null;
  data_freshness_at: string | null;
  visibility: string;
  created_at: string;
}

interface VaultVersion {
  id: string;
  version_number: number;
  content: Record<string, unknown>;
  change_summary: string;
  provenance: Record<string, unknown>;
  created_by: string;
  created_at: string;
}

// ============================================================
// Constants
// ============================================================

const TYPE_LABELS: Record<string, string> = {
  board_pack: 'Board Pack',
  scenario_output: 'Scenario',
  kpi_snapshot: 'KPI Snapshot',
  variance_analysis: 'Variance Analysis',
  narrative: 'Narrative',
  anomaly_report: 'Anomaly Report',
  interview_transcript: 'Interview',
  playbook_assessment: 'Playbook Assessment',
  custom_report: 'Custom Report',
  ai_analysis: 'AI Analysis',
  file_upload: 'File Upload',
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  board_pack: FileBarChart,
  scenario_output: TrendingUp,
  kpi_snapshot: ClipboardList,
  variance_analysis: TrendingUp,
  narrative: Brain,
  anomaly_report: AlertTriangle,
  interview_transcript: MessageSquare,
  playbook_assessment: ClipboardList,
  custom_report: FileText,
  ai_analysis: Brain,
  file_upload: Paperclip,
};

const STATUS_COLOURS: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-800',
  final: 'bg-green-100 text-green-800',
  superseded: 'bg-gray-100 text-gray-600',
  archived: 'bg-red-100 text-red-700',
};

// ============================================================
// JsonTree — recursive key-value renderer with collapsible nodes
// ============================================================

function JsonTree({ data, depth = 0 }: { data: unknown; depth?: number }) {
  if (data === null || data === undefined) {
    return <span className="text-gray-400 italic">null</span>;
  }

  if (typeof data === 'boolean') {
    return <span className="text-purple-600">{data ? 'true' : 'false'}</span>;
  }

  if (typeof data === 'number') {
    return <span className="text-blue-600">{data.toLocaleString()}</span>;
  }

  if (typeof data === 'string') {
    if (data.length > 200) {
      return <span className="text-gray-800 whitespace-pre-wrap">{data}</span>;
    }
    return <span className="text-gray-800">{data}</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-gray-400 italic">empty list</span>;
    }
    return (
      <div className={depth > 0 ? 'ml-3 border-l border-gray-200 pl-3' : ''}>
        {data.map((item, i) => (
          <div key={i} className="py-0.5">
            <JsonTreeNode label={String(i + 1)} value={item} depth={depth} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) {
      return <span className="text-gray-400 italic">empty</span>;
    }
    return (
      <div className={depth > 0 ? 'ml-3 border-l border-gray-200 pl-3' : ''}>
        {entries.map(([key, value]) => (
          <div key={key} className="py-0.5">
            <JsonTreeNode label={key} value={value} depth={depth} />
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-gray-600">{String(data)}</span>;
}

function JsonTreeNode({ label, value, depth }: { label: string; value: unknown; depth: number }) {
  const [collapsed, setCollapsed] = useState(depth >= 2);
  const isExpandable =
    value !== null &&
    value !== undefined &&
    typeof value === 'object' &&
    Object.keys(value as Record<string, unknown>).length > 0;

  const prettyLabel = label
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());

  if (!isExpandable) {
    return (
      <div className="flex items-start gap-2 text-xs">
        <span className="text-gray-500 font-medium flex-shrink-0">{prettyLabel}:</span>
        <JsonTree data={value} depth={depth + 1} />
      </div>
    );
  }

  return (
    <div className="text-xs">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1 text-gray-700 font-medium hover:text-gray-900"
      >
        <ChevronDown
          className={`h-3 w-3 transition-transform ${collapsed ? '-rotate-90' : ''}`}
        />
        {prettyLabel}
        <span className="text-gray-400 font-normal">
          {Array.isArray(value) ? `(${(value as unknown[]).length})` : `(${Object.keys(value as Record<string, unknown>).length})`}
        </span>
      </button>
      {!collapsed && <JsonTree data={value} depth={depth + 1} />}
    </div>
  );
}

// ============================================================
// VaultContentRenderer — type-aware content display
// ============================================================

function VaultContentRenderer({
  itemType,
  content,
}: {
  itemType: string;
  content: Record<string, unknown> | null;
}) {
  if (itemType === 'file_upload') {
    return (
      <p className="text-xs text-gray-500 italic">
        Content stored as file. Use the Download button below.
      </p>
    );
  }

  if (!content || Object.keys(content).length === 0) {
    return (
      <p className="text-xs text-gray-400 italic">No content available.</p>
    );
  }

  switch (itemType) {
    case 'narrative':
    case 'ai_analysis':
      return <NarrativeRenderer content={content} />;
    case 'kpi_snapshot':
      return <KpiSnapshotRenderer content={content} />;
    case 'variance_analysis':
      return <VarianceRenderer content={content} />;
    case 'board_pack':
      return <BoardPackRenderer content={content} />;
    case 'interview_transcript':
      return <InterviewRenderer content={content} />;
    case 'playbook_assessment':
      return <PlaybookRenderer content={content} />;
    case 'scenario_output':
      return <ScenarioRenderer content={content} />;
    default:
      return <JsonTree data={content} />;
  }
}

// --- Narrative / AI Analysis ---
function NarrativeRenderer({ content }: { content: Record<string, unknown> }) {
  const textKeys = ['text', 'narrative', 'summary', 'content', 'analysis', 'body'];
  const textValue = textKeys.reduce<string | null>((found, key) => {
    if (found) return found;
    if (typeof content[key] === 'string') return content[key] as string;
    return null;
  }, null);

  const remaining = Object.fromEntries(
    Object.entries(content).filter(([k]) => !textKeys.includes(k))
  );

  return (
    <div className="space-y-2">
      {textValue && (
        <div className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
          {textValue}
        </div>
      )}
      {Object.keys(remaining).length > 0 && <JsonTree data={remaining} />}
    </div>
  );
}

// --- KPI Snapshot ---
function KpiSnapshotRenderer({ content }: { content: Record<string, unknown> }) {
  const kpis = (content.kpis ?? content.metrics ?? content.data) as
    | Array<Record<string, unknown>>
    | undefined;

  if (!Array.isArray(kpis)) {
    return <JsonTree data={content} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="text-left py-1 pr-2 font-medium">Metric</th>
            <th className="text-right py-1 px-2 font-medium">Value</th>
            <th className="text-center py-1 pl-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {kpis.map((kpi, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-1 pr-2 text-gray-800">
                {String(kpi.label ?? kpi.name ?? kpi.metric ?? `KPI ${i + 1}`)}
              </td>
              <td className="py-1 px-2 text-right text-gray-900 font-medium tabular-nums">
                {String(kpi.value ?? 'N/A')}
              </td>
              <td className="py-1 pl-2 text-center">
                <KpiStatusBadge status={kpi.status as string | undefined} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KpiStatusBadge({ status }: { status: string | undefined }) {
  if (!status) return <span className="text-gray-400">N/A</span>;
  const s = status.toLowerCase();
  const colours =
    s === 'green' || s === 'good' || s === 'favourable'
      ? 'bg-green-100 text-green-700'
      : s === 'amber' || s === 'warning' || s === 'watch'
        ? 'bg-amber-100 text-amber-700'
        : s === 'red' || s === 'bad' || s === 'unfavourable'
          ? 'bg-red-100 text-red-700'
          : 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colours}`}>
      {status}
    </span>
  );
}

// --- Variance Analysis ---
function VarianceRenderer({ content }: { content: Record<string, unknown> }) {
  const rows = (content.variances ?? content.data ?? content.items) as
    | Array<Record<string, unknown>>
    | undefined;

  if (!Array.isArray(rows)) {
    return <JsonTree data={content} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="text-left py-1 pr-2 font-medium">Metric</th>
            <th className="text-right py-1 px-2 font-medium">Actual</th>
            <th className="text-right py-1 px-2 font-medium">Budget</th>
            <th className="text-right py-1 pl-2 font-medium">Variance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const variance = row.variance ?? row.diff ?? row.delta;
            const varianceNum = typeof variance === 'number' ? variance : null;
            return (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-1 pr-2 text-gray-800">
                  {String(row.label ?? row.metric ?? row.name ?? `Item ${i + 1}`)}
                </td>
                <td className="py-1 px-2 text-right tabular-nums">
                  {String(row.actual ?? 'N/A')}
                </td>
                <td className="py-1 px-2 text-right tabular-nums">
                  {String(row.budget ?? row.prior ?? 'N/A')}
                </td>
                <td
                  className={`py-1 pl-2 text-right font-medium tabular-nums ${
                    varianceNum !== null
                      ? varianceNum >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                      : ''
                  }`}
                >
                  {variance !== undefined && variance !== null ? String(variance) : 'N/A'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// --- Board Pack ---
function BoardPackRenderer({ content }: { content: Record<string, unknown> }) {
  const sections = (content.sections ?? content.pages) as
    | Array<Record<string, unknown>>
    | undefined;

  if (!Array.isArray(sections)) {
    return <JsonTree data={content} />;
  }

  return (
    <div className="space-y-3">
      {sections.map((section, i) => (
        <div key={i}>
          <h5 className="text-xs font-semibold text-gray-700">
            {String(section.title ?? section.heading ?? `Section ${i + 1}`)}
          </h5>
          {typeof section.content === 'string' ? (
            <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap">
              {section.content}
            </p>
          ) : typeof section.body === 'string' ? (
            <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap">
              {section.body}
            </p>
          ) : section.content ? (
            <div className="mt-0.5">
              <JsonTree data={section.content} />
            </div>
          ) : (
            <div className="mt-0.5">
              <JsonTree
                data={Object.fromEntries(
                  Object.entries(section).filter(([k]) => k !== 'title' && k !== 'heading')
                )}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// --- Interview Transcript ---
function InterviewRenderer({ content }: { content: Record<string, unknown> }) {
  const pairs = (content.questions ?? content.transcript ?? content.qa ?? content.pairs) as
    | Array<Record<string, unknown>>
    | undefined;

  if (!Array.isArray(pairs)) {
    return <JsonTree data={content} />;
  }

  return (
    <div className="space-y-2">
      {pairs.map((pair, i) => (
        <div key={i} className="text-xs space-y-0.5">
          <p className="text-gray-500 font-medium">
            Q: {String(pair.question ?? pair.q ?? `Question ${i + 1}`)}
          </p>
          <p className="text-gray-800 pl-3">
            {String(pair.answer ?? pair.a ?? pair.response ?? 'N/A')}
          </p>
        </div>
      ))}
    </div>
  );
}

// --- Playbook Assessment ---
function PlaybookRenderer({ content }: { content: Record<string, unknown> }) {
  const modules = (content.modules ?? content.scores ?? content.assessments) as
    | Array<Record<string, unknown>>
    | undefined;

  if (!Array.isArray(modules)) {
    return <JsonTree data={content} />;
  }

  return (
    <div className="space-y-1.5">
      {modules.map((mod, i) => {
        const score = typeof mod.score === 'number' ? mod.score : null;
        const maxScore = typeof mod.max_score === 'number' ? mod.max_score : 5;
        return (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="text-gray-700 font-medium flex-shrink-0 w-28 truncate">
              {String(mod.module ?? mod.name ?? mod.label ?? `Module ${i + 1}`)}
            </span>
            {score !== null && (
              <>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${Math.min((score / maxScore) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-gray-600 tabular-nums w-10 text-right">
                  {score}/{maxScore}
                </span>
              </>
            )}
            {score === null && (
              <span className="text-gray-500">{String(mod.score ?? mod.rating ?? 'N/A')}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- Scenario Output ---
function ScenarioRenderer({ content }: { content: Record<string, unknown> }) {
  const assumptions = content.assumptions as Array<Record<string, unknown>> | undefined;
  const outcomes = content.outcomes ?? content.projections ?? content.results;

  return (
    <div className="space-y-3">
      {Array.isArray(assumptions) && assumptions.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Assumptions
          </h5>
          <ul className="space-y-0.5 text-xs text-gray-700">
            {assumptions.map((a, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-gray-400 mt-px">&bull;</span>
                <span>
                  {typeof a === 'string'
                    ? a
                    : String(a.label ?? a.name ?? '')}
                  {typeof a === 'object' && a.value !== undefined && (
                    <span className="text-gray-500"> = {String(a.value)}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {outcomes !== undefined && (
        <div>
          <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Outcomes
          </h5>
          <JsonTree data={outcomes} />
        </div>
      )}
      {/* Render any remaining keys not already shown */}
      {(() => {
        const shown = new Set(['assumptions', 'outcomes', 'projections', 'results']);
        const remaining = Object.fromEntries(
          Object.entries(content).filter(([k]) => !shown.has(k))
        );
        return Object.keys(remaining).length > 0 ? <JsonTree data={remaining} /> : null;
      })()}
    </div>
  );
}

// ============================================================
// Component
// ============================================================

export function VaultBrowserClient({
  orgId,
  role,
}: {
  orgId: string;
  role: string;
}) {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [versions, setVersions] = useState<VaultVersion[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [latestContent, setLatestContent] = useState<Record<string, unknown> | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      if (search) params.set('search', search);
      params.set('limit', '50');

      const res = await fetch(`/api/vault/${orgId}?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setTotal(data.total);
      }
    } catch {
      console.error('Failed to fetch vault items');
    } finally {
      setLoading(false);
    }
  }, [orgId, typeFilter, search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const fetchVersions = async (itemId: string) => {
    try {
      const res = await fetch(`/api/vault/${orgId}/${itemId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions);
        setShowVersions(true);
        const latestVersion = (data.versions as VaultVersion[])[0];
        if (latestVersion?.content) {
          setLatestContent(latestVersion.content);
        }
      }
    } catch {
      console.error('Failed to fetch versions');
    }
  };

  const fetchContent = async (itemId: string) => {
    try {
      const res = await fetch(`/api/vault/${orgId}/${itemId}/versions`);
      if (res.ok) {
        const data = await res.json();
        const latestVersion = (data.versions as VaultVersion[])[0];
        setLatestContent(latestVersion?.content ?? null);
      }
    } catch {
      console.error('Failed to fetch content');
    }
  };

  const handleArchive = async (itemId: string) => {
    try {
      const res = await fetch(`/api/vault/${orgId}/${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchItems();
        setSelectedItem(null);
      }
    } catch {
      console.error('Failed to archive item');
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploadError('');
    setUploading(true);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);

      const res = await fetch(`/api/vault/${orgId}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setUploadError(data.error || 'Upload failed');
        return;
      }

      setShowUpload(false);
      form.reset();
      fetchItems();
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (itemId: string) => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/vault/${orgId}/${itemId}/download`);
      if (!res.ok) return;
      const data = await res.json();
      window.open(data.url, '_blank');
    } catch {
      console.error('Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Vault</h1>
          <p className="mt-1 text-sm text-gray-500">
            Every document, report, and AI output, stored with full provenance chain.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(role === 'advisor' || role === 'admin' || role === 'owner') && (
            <button
              onClick={() => { setShowUpload(true); setUploadError(''); }}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Upload File
            </button>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Shield className="h-4 w-4" />
            <span>{total} items</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search vault..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-gray-300 pl-10 pr-8 py-2 text-sm appearance-none bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All types</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Item List */}
        <div className="lg:col-span-2 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-blue-600 rounded-full" />
              <span className="ml-3">Loading vault...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No items in the vault yet.</p>
              <p className="text-sm text-gray-400 mt-1">
                Reports, scenarios, and AI outputs will appear here automatically.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const Icon = TYPE_ICONS[item.item_type] || FileText;
              const isSelected = selectedItem?.id === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedItem(item);
                    setShowVersions(false);
                    setLatestContent(null);
                    if (item.item_type !== 'file_upload') {
                      fetchContent(item.id);
                    }
                  }}
                  className={`w-full text-left rounded-lg border p-4 transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">{item.title}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOURS[item.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{TYPE_LABELS[item.item_type] ?? item.item_type}</span>
                        <span>v{item.current_version}</span>
                        <span>{formatDate(item.created_at)}</span>
                        {item.period_start && item.period_end && (
                          <span>{item.period_start} to {item.period_end}</span>
                        )}
                      </div>
                      {item.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {item.tags.slice(0, 4).map((tag) => (
                            <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Detail Panel */}
        <div className="space-y-4">
          {selectedItem ? (
            <>
              {/* Item Details Card */}
              <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
                <h3 className="font-semibold text-gray-900">{selectedItem.title}</h3>
                {selectedItem.description && (
                  <p className="text-sm text-gray-600">{selectedItem.description}</p>
                )}

                {/* Provenance Info */}
                <div className="border-t pt-3 space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Provenance
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Type</span>
                      <p className="text-gray-900">{TYPE_LABELS[selectedItem.item_type]}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Version</span>
                      <p className="text-gray-900">v{selectedItem.current_version}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Created</span>
                      <p className="text-gray-900">{formatDate(selectedItem.created_at)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Visibility</span>
                      <p className="text-gray-900 capitalize">{selectedItem.visibility.replace('_', ' ')}</p>
                    </div>
                    {selectedItem.model_id && (
                      <div className="col-span-2">
                        <span className="text-gray-500">AI Model</span>
                        <p className="text-gray-900 font-mono text-xs">{selectedItem.model_id}</p>
                      </div>
                    )}
                    {selectedItem.data_freshness_at && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Data Freshness</span>
                        <p className="text-gray-900">{formatDate(selectedItem.data_freshness_at)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="border-t pt-3 space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Content
                  </h4>
                  <div className="max-h-80 overflow-y-auto">
                    <VaultContentRenderer
                      itemType={selectedItem.item_type}
                      content={latestContent}
                    />
                  </div>
                </div>

                {/* File info for uploads */}
                {selectedItem.item_type === 'file_upload' && (
                  <div className="border-t pt-3 space-y-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      File Details
                    </h4>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>Click "Download" below to access the original file.</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="border-t pt-3 flex flex-wrap gap-2">
                  {selectedItem.item_type === 'file_upload' && (
                    <button
                      onClick={() => handleDownload(selectedItem.id)}
                      disabled={downloading}
                      className="flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {downloading ? 'Generating link...' : 'Download'}
                    </button>
                  )}
                  <button
                    onClick={() => fetchVersions(selectedItem.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Version History
                  </button>
                  {(role === 'advisor' || role === 'admin' || role === 'owner') && (
                    <button
                      onClick={() => setArchiveConfirm(selectedItem.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Archive className="h-3.5 w-3.5" />
                      Archive
                    </button>
                  )}
                </div>
              </div>

              {/* Version History */}
              {showVersions && versions.length > 0 && (
                <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Version History ({versions.length})
                  </h4>
                  <div className="space-y-2">
                    {versions.map((v) => (
                      <div key={v.id} className="flex items-start gap-2 text-xs">
                        <div className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 font-medium flex-shrink-0">
                          v{v.version_number}
                        </div>
                        <div>
                          <p className="text-gray-900">{v.change_summary}</p>
                          <p className="text-gray-500 mt-0.5">{formatDate(v.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <Shield className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Select an item to view details and provenance.</p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Upload File</h3>
              <button
                onClick={() => setShowUpload(false)}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                <input
                  type="file"
                  name="file"
                  required
                  accept=".pdf,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.csv,.txt,.png,.jpg,.jpeg,.webp"
                  className="w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  PDF, Excel, Word, PowerPoint, CSV, text, or images. Max 50 MB.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                <input
                  type="text"
                  name="title"
                  maxLength={200}
                  placeholder="Defaults to filename"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  name="description"
                  maxLength={1000}
                  rows={2}
                  placeholder="Brief description of this file"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (optional)</label>
                <input
                  type="text"
                  name="tags"
                  placeholder="Comma-separated, e.g. board, Q1, financials"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                <select
                  name="visibility"
                  defaultValue="org"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="org">Visible to all members</option>
                  <option value="owner_only">Only me</option>
                  <option value="advisor_only">Advisors only</option>
                </select>
              </div>

              {uploadError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {uploadError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive confirmation dialog */}
      <ConfirmDialog
        open={archiveConfirm !== null}
        title="Archive this item?"
        description="This item will be marked as archived. It won't appear in the default view but can still be accessed via filters. This action preserves all version history."
        confirmLabel="Archive"
        variant="danger"
        onConfirm={() => {
          if (archiveConfirm) {
            handleArchive(archiveConfirm);
            setArchiveConfirm(null);
          }
        }}
        onCancel={() => setArchiveConfirm(null)}
      />
    </div>
  );
}
