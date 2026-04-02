'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Brain, Search, FileText, TrendingUp, AlertTriangle,
  ClipboardList, ChevronRight, Clock, Shield,
} from 'lucide-react';
import { useUser } from '@/components/providers/user-context';

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

// AI-generated vault item types
const AI_TYPES = [
  'ai_analysis',
  'narrative',
  'anomaly_report',
  'scenario_output',
  'variance_analysis',
] as const;

const TYPE_LABELS: Record<string, string> = {
  ai_analysis: 'AI Analysis',
  narrative: 'Narrative',
  anomaly_report: 'Anomaly Report',
  scenario_output: 'Scenario Output',
  variance_analysis: 'Variance Analysis',
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  ai_analysis: Brain,
  narrative: Brain,
  anomaly_report: AlertTriangle,
  scenario_output: TrendingUp,
  variance_analysis: ClipboardList,
};

const STATUS_COLOURS: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-800',
  final: 'bg-green-100 text-green-800',
  superseded: 'bg-gray-100 text-gray-600',
  archived: 'bg-red-100 text-red-700',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================
// Component
// ============================================================

export default function AIOutputsPage() {
  const { orgId } = useUser();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch each AI type separately and merge, or use a single type filter
      const filterType = typeFilter || undefined;
      const params = new URLSearchParams();
      if (filterType) {
        params.set('type', filterType);
      }
      if (search) params.set('search', search);
      params.set('limit', '100');

      const res = await fetch(`/api/vault/${orgId}?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // Client-side filter to AI types only (when no specific type filter is set)
        const filtered = filterType
          ? data.items
          : data.items.filter((item: VaultItem) =>
              AI_TYPES.includes(item.item_type as (typeof AI_TYPES)[number])
            );
        setItems(filtered);
        setTotal(filterType ? data.total : filtered.length);
      }
    } catch {
      console.error('Failed to fetch AI outputs');
    } finally {
      setLoading(false);
    }
  }, [orgId, typeFilter, search]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <div className="max-w-5xl space-y-6">
      <Link href="/vault" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Knowledge Vault
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#1c1b1b' }}>AI Outputs</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Every AI-generated report, analysis, and insight, stored with full provenance.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Brain className="h-4 w-4" />
          <span>{total} outputs</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search AI outputs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
        >
          <option value="">All AI types</option>
          {AI_TYPES.map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-primary rounded-full" />
          <span className="ml-3">Loading AI outputs...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No AI Outputs Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            When you generate reports, run scenarios, or get AI insights, they'll be automatically stored here
            with full provenance tracking including the AI model used, data version, and prompt.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Item List */}
          <div className="lg:col-span-2 space-y-2">
            {items.map((item) => {
              const Icon = TYPE_ICONS[item.item_type] || FileText;
              const isSelected = selectedItem?.id === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`w-full text-left rounded-lg border p-4 transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 ${isSelected ? 'bg-primary/10' : 'bg-gray-100'}`}>
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-gray-500'}`} />
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
            })}
          </div>

          {/* Detail Panel */}
          <div className="space-y-4">
            {selectedItem ? (
              <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
                <h3 className="font-semibold text-gray-900">{selectedItem.title}</h3>
                {selectedItem.description && (
                  <p className="text-sm text-gray-600">{selectedItem.description}</p>
                )}

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
                    {selectedItem.period_start && selectedItem.period_end && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Period</span>
                        <p className="text-gray-900">{selectedItem.period_start} to {selectedItem.period_end}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-3">
                  <Link
                    href={`/vault`}
                    className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    View in Knowledge Vault
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <Shield className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Select an output to view provenance details.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
