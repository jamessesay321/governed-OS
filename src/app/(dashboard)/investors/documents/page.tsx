'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FolderOpen, Upload, FileText, Eye, Download,
  Link2, Clock, Shield, Search, Filter,
  File, Users, Calendar,
} from 'lucide-react';

/* ── Types ── */
type DocCategory = 'Financials' | 'Legal' | 'Pitch Deck' | 'Due Diligence' | 'Board Minutes';

interface Document {
  id: string;
  name: string;
  category: DocCategory;
  uploadedBy: string;
  uploadDate: string;
  version: string;
  size: string;
  shared: boolean;
  expiryDate: string | null;
}

/* ── Mock data ── */
const documents: Document[] = [
  {
    id: '1',
    name: 'Series A Pitch Deck v3.2',
    category: 'Pitch Deck',
    uploadedBy: 'James Wilson',
    uploadDate: '2026-03-10',
    version: '3.2',
    size: '4.8 MB',
    shared: true,
    expiryDate: '2026-06-10',
  },
  {
    id: '2',
    name: 'FY2025 Audited Accounts',
    category: 'Financials',
    uploadedBy: 'Sarah Chen',
    uploadDate: '2026-03-15',
    version: '1.0',
    size: '2.1 MB',
    shared: true,
    expiryDate: null,
  },
  {
    id: '3',
    name: 'Q1 2026 Management Accounts',
    category: 'Financials',
    uploadedBy: 'Sarah Chen',
    uploadDate: '2026-03-12',
    version: '1.1',
    size: '1.4 MB',
    shared: false,
    expiryDate: null,
  },
  {
    id: '4',
    name: 'Shareholders Agreement',
    category: 'Legal',
    uploadedBy: 'Legal Team',
    uploadDate: '2026-01-20',
    version: '2.0',
    size: '890 KB',
    shared: true,
    expiryDate: '2026-07-20',
  },
  {
    id: '5',
    name: 'Articles of Association',
    category: 'Legal',
    uploadedBy: 'Legal Team',
    uploadDate: '2025-11-05',
    version: '1.3',
    size: '560 KB',
    shared: true,
    expiryDate: null,
  },
  {
    id: '6',
    name: 'Technical Due Diligence Report',
    category: 'Due Diligence',
    uploadedBy: 'CTO',
    uploadDate: '2026-02-28',
    version: '1.0',
    size: '3.2 MB',
    shared: false,
    expiryDate: null,
  },
  {
    id: '7',
    name: 'IP Audit Summary',
    category: 'Due Diligence',
    uploadedBy: 'Legal Team',
    uploadDate: '2026-03-05',
    version: '1.0',
    size: '1.8 MB',
    shared: true,
    expiryDate: '2026-09-05',
  },
  {
    id: '8',
    name: 'Board Minutes - March 2026',
    category: 'Board Minutes',
    uploadedBy: 'Company Secretary',
    uploadDate: '2026-03-20',
    version: '1.0',
    size: '420 KB',
    shared: false,
    expiryDate: null,
  },
  {
    id: '9',
    name: 'Board Minutes - February 2026',
    category: 'Board Minutes',
    uploadedBy: 'Company Secretary',
    uploadDate: '2026-02-22',
    version: '1.0',
    size: '380 KB',
    shared: false,
    expiryDate: null,
  },
  {
    id: '10',
    name: 'Financial Model - 3 Year Forecast',
    category: 'Financials',
    uploadedBy: 'James Wilson',
    uploadDate: '2026-03-08',
    version: '2.4',
    size: '5.6 MB',
    shared: true,
    expiryDate: '2026-04-08',
  },
];

/* ── Access log ── */
const accessLog = [
  { date: '2026-03-20', user: 'Tom Reed (Venture Capital Ltd)', document: 'Series A Pitch Deck v3.2', action: 'Viewed' },
  { date: '2026-03-19', user: 'Lisa Park (Angel Syndicate)', document: 'FY2025 Audited Accounts', action: 'Downloaded' },
  { date: '2026-03-18', user: 'Mark Hughes (Growth Fund)', document: 'Financial Model - 3 Year Forecast', action: 'Viewed' },
  { date: '2026-03-17', user: 'Tom Reed (Venture Capital Ltd)', document: 'Technical Due Diligence Report', action: 'Viewed' },
  { date: '2026-03-16', user: 'Sarah Li (Board Member)', document: 'Board Minutes - March 2026', action: 'Downloaded' },
  { date: '2026-03-15', user: 'Lisa Park (Angel Syndicate)', document: 'IP Audit Summary', action: 'Viewed' },
];

const categoryColours: Record<DocCategory, string> = {
  'Financials': 'bg-emerald-50 text-emerald-700',
  'Legal': 'bg-blue-50 text-blue-700',
  'Pitch Deck': 'bg-violet-50 text-violet-700',
  'Due Diligence': 'bg-amber-50 text-amber-700',
  'Board Minutes': 'bg-cyan-50 text-cyan-700',
};

const categories: DocCategory[] = ['Financials', 'Legal', 'Pitch Deck', 'Due Diligence', 'Board Minutes'];

export default function DocumentVaultPage() {
  const [filterCategory, setFilterCategory] = useState<DocCategory | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = documents.filter((d) => {
    if (filterCategory !== 'all' && d.category !== filterCategory) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Document Vault</h1>
          <p className="text-muted-foreground mt-1">
            Securely store, version, and share investor documents with controlled access.
          </p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Category summary */}
      <div className="grid gap-3 sm:grid-cols-5">
        {categories.map((cat) => {
          const count = documents.filter((d) => d.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setFilterCategory(filterCategory === cat ? 'all' : cat)}
              className={`rounded-lg border p-3 text-left transition-all ${
                filterCategory === cat ? 'border-emerald-300 bg-emerald-50/50 shadow-sm' : 'hover:border-emerald-200'
              }`}
            >
              <FolderOpen className="h-4 w-4 text-muted-foreground mb-1" />
              <p className="text-sm font-medium">{cat}</p>
              <p className="text-xs text-muted-foreground">{count} documents</p>
            </button>
          );
        })}
      </div>

      {/* Upload area */}
      <Card className="border-dashed border-2 border-muted-foreground/20">
        <CardContent className="p-8 flex flex-col items-center justify-center text-center">
          <Upload className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Drag and drop files here, or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">
            Supports PDF, DOCX, XLSX, PPTX up to 50MB
          </p>
        </CardContent>
      </Card>

      {/* Search and filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        {filterCategory !== 'all' && (
          <Button variant="outline" size="sm" onClick={() => setFilterCategory('all')}>
            Clear filter: {filterCategory}
          </Button>
        )}
      </div>

      {/* Documents table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Document</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Category</th>
                  <th className="text-left p-3 font-medium hidden lg:table-cell">Uploaded By</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Version</th>
                  <th className="text-left p-3 font-medium hidden lg:table-cell">Size</th>
                  <th className="text-left p-3 font-medium">Shared</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => (
                  <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(doc.uploadDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <Badge variant="secondary" className={categoryColours[doc.category]}>
                        {doc.category}
                      </Badge>
                    </td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground">{doc.uploadedBy}</td>
                    <td className="p-3 hidden md:table-cell">
                      <span className="text-xs bg-muted rounded px-1.5 py-0.5">v{doc.version}</span>
                    </td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground">{doc.size}</td>
                    <td className="p-3">
                      {doc.shared ? (
                        <div className="flex items-center gap-1">
                          <Link2 className="h-3 w-3 text-emerald-600" />
                          <span className="text-xs text-emerald-600">Shared</span>
                          {doc.expiryDate && (
                            <span className="text-xs text-muted-foreground ml-1">
                              (expires {new Date(doc.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Private</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" title="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Download">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Share">
                          <Link2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No documents found. Try adjusting your search or filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Access log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-600" />
            Access Log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {accessLog.map((entry, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4">
                <div className="text-xs text-muted-foreground whitespace-nowrap pt-0.5 w-20 shrink-0">
                  {new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{entry.user}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{entry.document}</p>
                </div>
                <Badge
                  variant="secondary"
                  className={entry.action === 'Downloaded' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}
                >
                  {entry.action}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
