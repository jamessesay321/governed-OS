'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MappingRow {
  accountId: string;
  code: string;
  name: string;
  xeroType: string;
  xeroClass: string;
  status: string;
  mappingId: string | null;
  category: string;
  subcategory: string | null;
  confidence: number;
  verified: boolean;
  locked: boolean;
  mappingSource: string;
  aiReasoning: string;
}

interface CategoryOption {
  key: string;
  label: string;
  section: string;
}

interface Props {
  rows: MappingRow[];
  categoryOptions: CategoryOption[];
  orgId: string;
  totalAccounts: number;
  verifiedCount: number;
  unmappedCount: number;
}

// ---------------------------------------------------------------------------
// Section labels
// ---------------------------------------------------------------------------

const SECTION_LABELS: Record<string, string> = {
  revenue: 'Revenue',
  cost_of_sales: 'Cost of Sales',
  operating_expenses: 'Operating Expenses',
  finance_costs: 'Finance Costs',
  other_income: 'Other Income',
  tax: 'Tax',
  balance_sheet: 'Balance Sheet',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MappingsClient({
  rows: initialRows,
  categoryOptions,
  orgId,
  totalAccounts,
  verifiedCount: initialVerified,
  unmappedCount,
}: Props) {
  const [rows, setRows] = useState(initialRows);
  const [filter, setFilter] = useState<'all' | 'unverified' | 'low_confidence' | 'unmapped'>('unverified');
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [successCount, setSuccessCount] = useState(0);

  const verifiedCount = useMemo(() => rows.filter((r) => r.verified).length, [rows]);

  // Group categories by section for the select dropdown
  const groupedCategories = useMemo(() => {
    const groups = new Map<string, CategoryOption[]>();
    for (const opt of categoryOptions) {
      const group = groups.get(opt.section) ?? [];
      group.push(opt);
      groups.set(opt.section, group);
    }
    return groups;
  }, [categoryOptions]);

  // Filter rows
  const filteredRows = useMemo(() => {
    let result = rows;

    // Status filter
    if (filter === 'unverified') result = result.filter((r) => !r.verified);
    else if (filter === 'low_confidence') result = result.filter((r) => r.confidence < 0.7 && r.category);
    else if (filter === 'unmapped') result = result.filter((r) => !r.category);

    // Section filter
    if (sectionFilter !== 'all') {
      const categoriesInSection = categoryOptions
        .filter((c) => c.section === sectionFilter)
        .map((c) => c.key);
      result = result.filter((r) => categoriesInSection.includes(r.category));
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.code.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q)
      );
    }

    return result;
  }, [rows, filter, search, sectionFilter, categoryOptions]);

  // Update a single mapping
  const updateCategory = useCallback(
    async (accountId: string, newCategory: string) => {
      setSaving((prev) => new Set(prev).add(accountId));
      try {
        const res = await fetch(`/api/accounts/map/${orgId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mappings: [{ account_id: accountId, standard_category: newCategory }],
          }),
        });

        if (res.ok) {
          setRows((prev) =>
            prev.map((r) =>
              r.accountId === accountId
                ? { ...r, category: newCategory, verified: true, confidence: 1.0 }
                : r
            )
          );
          setSuccessCount((c) => c + 1);
        }
      } finally {
        setSaving((prev) => {
          const next = new Set(prev);
          next.delete(accountId);
          return next;
        });
      }
    },
    [orgId]
  );

  // Verify without changing (confirm current mapping)
  const verifyMapping = useCallback(
    async (accountId: string, currentCategory: string) => {
      await updateCategory(accountId, currentCategory);
    },
    [updateCategory]
  );

  // Bulk confirm all visible unverified mappings
  const bulkConfirmVisible = useCallback(async () => {
    const unverified = filteredRows.filter((r) => !r.verified && r.category);
    if (unverified.length === 0) return;

    setBulkSaving(true);
    try {
      const res = await fetch(`/api/accounts/map/${orgId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mappings: unverified.map((r) => ({
            account_id: r.accountId,
            standard_category: r.category,
          })),
        }),
      });

      if (res.ok) {
        const confirmedIds = new Set(unverified.map((r) => r.accountId));
        setRows((prev) =>
          prev.map((r) =>
            confirmedIds.has(r.accountId)
              ? { ...r, verified: true, confidence: 1.0 }
              : r
          )
        );
        setSuccessCount((c) => c + unverified.length);
      }
    } finally {
      setBulkSaving(false);
    }
  }, [filteredRows, orgId]);

  const confidenceBadge = (confidence: number, verified: boolean) => {
    if (verified) return <Badge className="bg-green-100 text-green-800 text-xs">Verified</Badge>;
    if (confidence >= 0.8) return <Badge className="bg-blue-100 text-blue-800 text-xs">{Math.round(confidence * 100)}%</Badge>;
    if (confidence >= 0.5) return <Badge className="bg-yellow-100 text-yellow-800 text-xs">{Math.round(confidence * 100)}%</Badge>;
    return <Badge className="bg-red-100 text-red-800 text-xs">{confidence > 0 ? `${Math.round(confidence * 100)}%` : 'None'}</Badge>;
  };

  const unverifiedVisible = filteredRows.filter((r) => !r.verified && r.category).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Account Mappings</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review how Xero accounts map to management account categories
          </p>
        </div>
        {successCount > 0 && (
          <Badge className="bg-green-100 text-green-800">
            {successCount} saved this session
          </Badge>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Total Accounts</p>
            <p className="text-2xl font-bold">{totalAccounts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Verified</p>
            <p className="text-2xl font-bold text-green-600">{verifiedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Unverified</p>
            <p className="text-2xl font-bold text-amber-600">{totalAccounts - verifiedCount - unmappedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Unmapped</p>
            <p className="text-2xl font-bold text-red-600">{unmappedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1">
              {(['all', 'unverified', 'low_confidence', 'unmapped'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    filter === f
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'unverified' ? 'Unverified' : f === 'low_confidence' ? 'Low Confidence' : 'Unmapped'}
                </button>
              ))}
            </div>

            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="rounded-md border bg-background px-3 py-1.5 text-sm"
            >
              <option value="all">All sections</option>
              {Object.entries(SECTION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Search accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-md border bg-background px-3 py-1.5 text-sm w-56"
            />

            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {filteredRows.length} accounts
              </span>
              {unverifiedVisible > 0 && (
                <button
                  onClick={bulkConfirmVisible}
                  disabled={bulkSaving}
                  className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {bulkSaving ? 'Saving...' : `Confirm ${unverifiedVisible} visible`}
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Code</th>
                  <th className="px-4 py-3 text-left font-medium">Account Name</th>
                  <th className="px-4 py-3 text-left font-medium">Xero Type</th>
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-left font-medium">Confidence</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.accountId}
                    className={`border-b transition-colors hover:bg-muted/30 ${
                      row.verified ? 'bg-green-50/30' : row.confidence < 0.7 ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs">{row.code}</td>
                    <td className="px-4 py-2.5">
                      <div>
                        <span className={`${row.status === 'ARCHIVED' ? 'text-muted-foreground line-through' : ''}`}>
                          {row.name}
                        </span>
                        {row.status === 'ARCHIVED' && (
                          <Badge variant="outline" className="ml-2 text-xs">Archived</Badge>
                        )}
                      </div>
                      {row.aiReasoning && !row.verified && (
                        <p className="text-xs text-muted-foreground mt-0.5 max-w-md truncate" title={row.aiReasoning}>
                          AI: {row.aiReasoning}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-muted-foreground">
                        {row.xeroClass} / {row.xeroType}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={row.category}
                        onChange={(e) => updateCategory(row.accountId, e.target.value)}
                        disabled={row.locked || saving.has(row.accountId)}
                        className={`w-full rounded border bg-background px-2 py-1 text-xs ${
                          saving.has(row.accountId) ? 'opacity-50' : ''
                        } ${row.locked ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        <option value="">-- Select --</option>
                        {Array.from(groupedCategories.entries()).map(([section, cats]) => (
                          <optgroup key={section} label={SECTION_LABELS[section] ?? section}>
                            {cats.map((cat) => (
                              <option key={cat.key} value={cat.key}>
                                {cat.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      {confidenceBadge(row.confidence, row.verified)}
                    </td>
                    <td className="px-4 py-2.5">
                      {!row.verified && row.category && (
                        <button
                          onClick={() => verifyMapping(row.accountId, row.category)}
                          disabled={saving.has(row.accountId)}
                          className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200 disabled:opacity-50"
                        >
                          {saving.has(row.accountId) ? '...' : 'Confirm'}
                        </button>
                      )}
                      {row.locked && (
                        <Badge variant="outline" className="text-xs">Locked</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      {filter === 'unverified'
                        ? 'All mappings verified!'
                        : 'No accounts match your filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
