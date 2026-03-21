'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Search, Filter, Archive, Clock, Shield, ChevronRight,
  FileBarChart, Brain, AlertTriangle, MessageSquare, ClipboardList,
  TrendingUp, BookOpen,
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
};

const STATUS_COLOURS: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-800',
  final: 'bg-green-100 text-green-800',
  superseded: 'bg-gray-100 text-gray-600',
  archived: 'bg-red-100 text-red-700',
};

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
      }
    } catch {
      console.error('Failed to fetch versions');
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
            Every document, report, and AI output — stored with full provenance chain.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Shield className="h-4 w-4" />
          <span>{total} items</span>
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
                          <span>{item.period_start} — {item.period_end}</span>
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

                {/* Actions */}
                <div className="border-t pt-3 flex gap-2">
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
