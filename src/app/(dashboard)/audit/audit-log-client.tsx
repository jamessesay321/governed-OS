'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Download,
  Users,
  Activity,
  BarChart3,
  X,
  Filter,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AuditLog = {
  id: string;
  org_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type NameMap = Record<string, string>;

type DateRangeKey = '24h' | '7d' | '30d' | 'all';

interface AuditLogClientProps {
  logs: AuditLog[];
  nameMap: NameMap;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25;

const DATE_RANGES: { key: DateRangeKey; label: string; ms: number | null }[] = [
  { key: '24h', label: 'Last 24h', ms: 24 * 60 * 60 * 1000 },
  { key: '7d', label: 'Last 7 days', ms: 7 * 24 * 60 * 60 * 1000 },
  { key: '30d', label: 'Last 30 days', ms: 30 * 24 * 60 * 60 * 1000 },
  { key: 'all', label: 'All time', ms: null },
];

const ACTION_COLOURS: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  created: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  deleted: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  remove: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  removed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  sync: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  synced: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  login: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  logout: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  invite: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
  invited: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
  export: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  generate: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  generated: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getActionColour(action: string): string {
  const lower = action.toLowerCase();
  // Check each keyword against the full action string (e.g. "vault.item_created")
  for (const [keyword, colour] of Object.entries(ACTION_COLOURS)) {
    if (lower.includes(keyword)) return colour;
  }
  return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Recursive JSON Renderer
// ---------------------------------------------------------------------------

function JsonValue({ value, depth }: { value: unknown; depth: number }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">null</span>;
  }

  if (typeof value === 'boolean') {
    return (
      <span className={value ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
        {String(value)}
      </span>
    );
  }

  if (typeof value === 'number') {
    return <span className="text-blue-600 dark:text-blue-400">{value}</span>;
  }

  if (typeof value === 'string') {
    return <span className="text-amber-700 dark:text-amber-400">&quot;{value}&quot;</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground">[]</span>;
    }
    return (
      <div className="ml-4">
        {value.map((item, idx) => (
          <div key={idx} className="flex items-start gap-1">
            <span className="text-muted-foreground select-none shrink-0">{idx}:</span>
            <JsonValue value={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return <span className="text-muted-foreground">{'{}'}</span>;
    }
    return (
      <div className="ml-4">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-start gap-1">
            <span className="font-medium text-foreground shrink-0">{key}:</span>
            <JsonValue value={val} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  return <span>{String(value)}</span>;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AuditLogClient({ logs, nameMap }: AuditLogClientProps) {
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedEntityType, setSelectedEntityType] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeKey>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Derived: unique actions and entity types from all logs
  const uniqueActions = useMemo(() => {
    const set = new Set<string>();
    for (const log of logs) set.add(log.action);
    return Array.from(set).sort();
  }, [logs]);

  const uniqueEntityTypes = useMemo(() => {
    const set = new Set<string>();
    for (const log of logs) if (log.entity_type) set.add(log.entity_type);
    return Array.from(set).sort();
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const rangeConfig = DATE_RANGES.find((r) => r.key === dateRange);
    const cutoff = rangeConfig?.ms ? now - rangeConfig.ms : null;
    const lowerSearch = search.toLowerCase();

    return logs.filter((log) => {
      // Date range filter
      if (cutoff && new Date(log.created_at).getTime() < cutoff) return false;

      // Action pill filter
      if (selectedAction && log.action !== selectedAction) return false;

      // Entity type filter
      if (selectedEntityType && log.entity_type !== selectedEntityType) return false;

      // Text search
      if (lowerSearch) {
        const haystack = [
          log.action,
          log.entity_type,
          log.entity_id ?? '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(lowerSearch)) return false;
      }

      return true;
    });
  }, [logs, search, selectedAction, selectedEntityType, dateRange]);

  // Reset to page 1 when filters change
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedLogs = filteredLogs.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  // Summary stats
  const stats = useMemo(() => {
    const userIds = new Set<string>();
    const actionCounts = new Map<string, number>();

    for (const log of filteredLogs) {
      userIds.add(log.user_id);
      actionCounts.set(log.action, (actionCounts.get(log.action) ?? 0) + 1);
    }

    let mostCommonAction = 'N/A';
    let maxCount = 0;
    for (const [action, count] of actionCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonAction = action;
      }
    }

    return {
      total: filteredLogs.length,
      uniqueUsers: userIds.size,
      mostCommonAction,
    };
  }, [filteredLogs]);

  const toggleRow = useCallback((id: string) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  }, []);

  const clearFilters = useCallback(() => {
    setSearch('');
    setSelectedAction(null);
    setSelectedEntityType(null);
    setDateRange('all');
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    setExpandedRow(null);
  }, []);

  // CSV export
  const exportCsv = useCallback(() => {
    const headers = [
      'Timestamp',
      'User',
      'Action',
      'Entity Type',
      'Entity ID',
      'Changes',
      'Metadata',
    ];
    const rows = filteredLogs.map((log) => [
      new Date(log.created_at).toISOString(),
      nameMap[log.user_id] ?? 'Unknown',
      log.action,
      log.entity_type,
      log.entity_id ?? '',
      log.changes ? JSON.stringify(log.changes) : '',
      log.metadata ? JSON.stringify(log.metadata) : '',
    ]);

    const csv = [
      headers.map(escapeCsvField).join(','),
      ...rows.map((row) => row.map(escapeCsvField).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredLogs, nameMap]);

  const hasActiveFilters =
    search !== '' ||
    selectedAction !== null ||
    selectedEntityType !== null ||
    dateRange !== 'all';

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/40">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Entries</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/40">
              <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Unique Users</p>
              <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/40">
              <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Most Common</p>
              <p className="text-sm font-semibold truncate max-w-[200px]">
                {stats.mostCommonAction}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="space-y-4 p-4">
          {/* Search + Date Range + Export */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by action, entity type, or entity ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DATE_RANGES.map((range) => (
                <Button
                  key={range.key}
                  variant={dateRange === range.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setDateRange(range.key);
                    setCurrentPage(1);
                  }}
                >
                  {range.label}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="mr-1.5 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Action filter pills */}
          {uniqueActions.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Filter className="h-3 w-3" />
                Actions
              </div>
              <div className="flex flex-wrap gap-1.5">
                {uniqueActions.map((action) => (
                  <button
                    key={action}
                    onClick={() => {
                      setSelectedAction(
                        selectedAction === action ? null : action,
                      );
                      setCurrentPage(1);
                    }}
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      selectedAction === action
                        ? getActionColour(action) + ' border-transparent'
                        : 'border-border text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Entity type filter pills */}
          {uniqueEntityTypes.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Filter className="h-3 w-3" />
                Entity Types
              </div>
              <div className="flex flex-wrap gap-1.5">
                {uniqueEntityTypes.map((entityType) => (
                  <button
                    key={entityType}
                    onClick={() => {
                      setSelectedEntityType(
                        selectedEntityType === entityType ? null : entityType,
                      );
                      setCurrentPage(1);
                    }}
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      selectedEntityType === entityType
                        ? 'bg-foreground text-background border-transparent'
                        : 'border-border text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {entityType}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground"
            >
              <X className="mr-1.5 h-3 w-3" />
              Clear all filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Activity History
            {filteredLogs.length !== logs.length && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                Showing {filteredLogs.length} of {logs.length} entries
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paginatedLogs.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {hasActiveFilters
                ? 'No entries match the current filters.'
                : 'No audit entries yet.'}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map((log) => {
                    const isExpanded = expandedRow === log.id;
                    const hasDetails = log.changes !== null || log.metadata !== null;

                    return (
                      <ExpandableRow
                        key={log.id}
                        log={log}
                        userName={nameMap[log.user_id] ?? 'Unknown'}
                        isExpanded={isExpanded}
                        hasDetails={hasDetails}
                        onToggle={() => toggleRow(log.id)}
                      />
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {safePage} of {totalPages}
                  </p>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage <= 1}
                      onClick={() => handlePageChange(safePage - 1)}
                    >
                      Previous
                    </Button>
                    {generatePageNumbers(safePage, totalPages).map((p, idx) =>
                      p === '...' ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="flex items-center px-2 text-muted-foreground"
                        >
                          ...
                        </span>
                      ) : (
                        <Button
                          key={p}
                          variant={p === safePage ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(p as number)}
                        >
                          {p}
                        </Button>
                      ),
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage >= totalPages}
                      onClick={() => handlePageChange(safePage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expandable Row Sub-component
// ---------------------------------------------------------------------------

function ExpandableRow({
  log,
  userName,
  isExpanded,
  hasDetails,
  onToggle,
}: {
  log: AuditLog;
  userName: string;
  isExpanded: boolean;
  hasDetails: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow
        className={hasDetails ? 'cursor-pointer hover:bg-muted/50' : ''}
        onClick={hasDetails ? onToggle : undefined}
      >
        <TableCell className="w-8 pr-0">
          {hasDetails &&
            (isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ))}
        </TableCell>
        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
          <span title={new Date(log.created_at).toLocaleString()}>
            {formatRelativeTime(log.created_at)}
          </span>
        </TableCell>
        <TableCell className="text-sm">{userName}</TableCell>
        <TableCell>
          <Badge
            className={`${getActionColour(log.action)} border-transparent`}
          >
            {log.action}
          </Badge>
        </TableCell>
        <TableCell className="text-sm">
          {log.entity_type}
          {log.entity_id && (
            <span className="ml-1 font-mono text-xs text-muted-foreground">
              ({log.entity_id.slice(0, 8)})
            </span>
          )}
        </TableCell>
      </TableRow>

      {/* Expanded details row */}
      {isExpanded && hasDetails && (
        <TableRow className="bg-muted/30">
          <TableCell />
          <TableCell colSpan={4} className="py-4">
            <div className="grid gap-4 md:grid-cols-2">
              {log.changes && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Changes
                  </p>
                  <div className="rounded-md border bg-background p-3 text-sm">
                    <JsonValue value={log.changes} depth={0} />
                  </div>
                </div>
              )}
              {log.metadata && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Metadata
                  </p>
                  <div className="rounded-md border bg-background p-3 text-sm">
                    <JsonValue value={log.metadata} depth={0} />
                  </div>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Pagination Helpers
// ---------------------------------------------------------------------------

function generatePageNumbers(
  current: number,
  total: number,
): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [1];

  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) pages.push('...');

  pages.push(total);

  return pages;
}
