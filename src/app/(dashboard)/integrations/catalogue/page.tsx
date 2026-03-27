'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Plug,
  Bell,
  ArrowRight,
  Calculator,
  ShoppingBag,
  Cloud,
  KanbanSquare,
  Megaphone,
  Landmark,
  Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Category =
  | 'Accounting'
  | 'E-Commerce'
  | 'Cloud Storage'
  | 'Project Management'
  | 'Marketing'
  | 'Banking'
  | 'HR/Payroll';

type Integration = {
  name: string;
  category: Category;
  colour: string;
  description: string;
  status: 'connect' | 'coming_soon';
  connectHref?: string;
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const CATEGORY_META: Record<Category, { icon: React.ReactNode; badgeClass: string }> = {
  Accounting: {
    icon: <Calculator className="h-4 w-4" />,
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  'E-Commerce': {
    icon: <ShoppingBag className="h-4 w-4" />,
    badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  },
  'Cloud Storage': {
    icon: <Cloud className="h-4 w-4" />,
    badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  },
  'Project Management': {
    icon: <KanbanSquare className="h-4 w-4" />,
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  },
  Marketing: {
    icon: <Megaphone className="h-4 w-4" />,
    badgeClass: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  },
  Banking: {
    icon: <Landmark className="h-4 w-4" />,
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  'HR/Payroll': {
    icon: <Users className="h-4 w-4" />,
    badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  },
};

const CATEGORIES: Category[] = [
  'Accounting',
  'E-Commerce',
  'Cloud Storage',
  'Project Management',
  'Marketing',
  'Banking',
  'HR/Payroll',
];

const CATALOGUE: Integration[] = [
  // Accounting
  { name: 'Xero', category: 'Accounting', colour: '#13B5EA', description: 'Cloud accounting for small business. Sync invoices, bills, bank transactions and reports.', status: 'connect', connectHref: '/api/xero/connect' },
  { name: 'QuickBooks', category: 'Accounting', colour: '#2CA01C', description: 'Popular accounting software. Import P&L, balance sheet and cash flow data.', status: 'coming_soon' },
  { name: 'Sage', category: 'Accounting', colour: '#00D639', description: 'Enterprise accounting and financials. Sync ledger data and management reports.', status: 'coming_soon' },

  // E-Commerce
  { name: 'Shopify', category: 'E-Commerce', colour: '#96BF48', description: 'Pull orders, revenue, product performance and customer data from your store.', status: 'coming_soon' },
  { name: 'WooCommerce', category: 'E-Commerce', colour: '#96588A', description: 'WordPress e-commerce data including sales, products and order analytics.', status: 'coming_soon' },
  { name: 'Amazon', category: 'E-Commerce', colour: '#FF9900', description: 'Seller Central data including orders, inventory and advertising metrics.', status: 'coming_soon' },

  // Cloud Storage
  { name: 'Google Drive', category: 'Cloud Storage', colour: '#4285F4', description: 'Connect spreadsheets, documents and shared drives for automated data ingestion.', status: 'coming_soon' },
  { name: 'OneDrive', category: 'Cloud Storage', colour: '#0078D4', description: 'Sync files and Excel workbooks from Microsoft OneDrive and SharePoint.', status: 'coming_soon' },
  { name: 'Dropbox', category: 'Cloud Storage', colour: '#0061FF', description: 'Import files, spreadsheets and shared folder data from Dropbox Business.', status: 'coming_soon' },
  { name: 'Box', category: 'Cloud Storage', colour: '#0061D5', description: 'Enterprise content management. Sync documents and structured data files.', status: 'coming_soon' },
  { name: 'iCloud', category: 'Cloud Storage', colour: '#3693F3', description: 'Connect iCloud Drive files and Numbers spreadsheets for data import.', status: 'coming_soon' },

  // Project Management
  { name: 'Monday.com', category: 'Project Management', colour: '#FF3D57', description: 'Sync project boards, timelines and workload data for resource planning.', status: 'coming_soon' },
  { name: 'Asana', category: 'Project Management', colour: '#F06A6A', description: 'Import tasks, projects and team workload data for productivity tracking.', status: 'coming_soon' },
  { name: 'ClickUp', category: 'Project Management', colour: '#7B68EE', description: 'Pull tasks, time tracking and goal progress from your ClickUp workspace.', status: 'coming_soon' },
  { name: 'Notion', category: 'Project Management', colour: '#000000', description: 'Connect Notion databases, wikis and project trackers as data sources.', status: 'coming_soon' },
  { name: 'Smartsheet', category: 'Project Management', colour: '#0073EC', description: 'Enterprise work management data including sheets, reports and dashboards.', status: 'coming_soon' },
  { name: 'Trello', category: 'Project Management', colour: '#0052CC', description: 'Sync boards, cards and activity data for lightweight project tracking.', status: 'coming_soon' },

  // Marketing
  { name: 'Klaviyo', category: 'Marketing', colour: '#000000', description: 'Email and SMS marketing analytics. Sync campaigns, flows and revenue attribution.', status: 'coming_soon' },
  { name: 'Mailchimp', category: 'Marketing', colour: '#FFE01B', description: 'Email campaign performance, audience growth and engagement metrics.', status: 'coming_soon' },
  { name: 'HubSpot', category: 'Marketing', colour: '#FF7A59', description: 'CRM, marketing and sales data including contacts, deals and campaign analytics.', status: 'coming_soon' },

  // Banking
  { name: 'Open Banking', category: 'Banking', colour: '#1A1A2E', description: 'Connect bank accounts directly via Open Banking for real-time transaction feeds.', status: 'coming_soon' },
  { name: 'Plaid', category: 'Banking', colour: '#000000', description: 'Securely link bank accounts and pull transaction history and balances.', status: 'coming_soon' },
  { name: 'Stripe', category: 'Banking', colour: '#635BFF', description: 'Payment processing data including charges, payouts, subscriptions and disputes.', status: 'coming_soon' },

  // HR/Payroll
  { name: 'Gusto', category: 'HR/Payroll', colour: '#F45D48', description: 'Payroll, benefits and HR data. Sync employee costs and headcount metrics.', status: 'coming_soon' },
  { name: 'BambooHR', category: 'HR/Payroll', colour: '#73C41D', description: 'Employee records, time-off tracking and headcount reporting data.', status: 'coming_soon' },
  { name: 'Rippling', category: 'HR/Payroll', colour: '#FEC800', description: 'Unified HR, payroll and IT data for workforce analytics and cost tracking.', status: 'coming_soon' },
];

// ---------------------------------------------------------------------------
// Notify Me toast (simple inline state)
// ---------------------------------------------------------------------------

function useNotifyState() {
  const [notified, setNotified] = useState<Set<string>>(new Set());
  const toggle = (name: string) => {
    setNotified((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };
  return { notified, toggle };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function IntegrationLogo({ name, colour }: { name: string; colour: string }) {
  return (
    <div
      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
      style={{ backgroundColor: colour }}
    >
      {name.charAt(0)}
    </div>
  );
}

function CategoryBadge({ category }: { category: Category }) {
  const meta = CATEGORY_META[category];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.badgeClass}`}>
      {category}
    </span>
  );
}

function IntegrationCard({
  integration,
  isNotified,
  onNotify,
}: {
  integration: Integration;
  isNotified: boolean;
  onNotify: () => void;
}) {
  const isConnect = integration.status === 'connect';

  return (
    <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="flex flex-col gap-4 p-5">
        {/* Top row: logo + info */}
        <div className="flex items-start gap-3">
          <IntegrationLogo name={integration.name} colour={integration.colour} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold">{integration.name}</h3>
              <CategoryBadge category={integration.category} />
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
              {integration.description}
            </p>
          </div>
        </div>

        {/* Action */}
        <div className="flex items-center gap-2">
          {isConnect && integration.connectHref ? (
            <a href={integration.connectHref}>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                <Plug className="h-3.5 w-3.5" />
                Connect
                <ArrowRight className="h-3 w-3" />
              </Button>
            </a>
          ) : (
            <>
              <Badge variant="secondary" className="text-[10px] font-medium">
                Coming Soon
              </Badge>
              <Button
                variant={isNotified ? 'outline' : 'ghost'}
                size="xs"
                onClick={onNotify}
                className={isNotified ? 'border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}
              >
                <Bell className={`h-3 w-3 ${isNotified ? 'fill-emerald-500 text-emerald-500' : ''}`} />
                {isNotified ? 'Subscribed' : 'Notify Me'}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CataloguePage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | Category>('all');
  const { notified, toggle } = useNotifyState();

  const filtered = useMemo(() => {
    let items = CATALOGUE;

    // Category filter
    if (activeTab !== 'all') {
      items = items.filter((i) => i.category === activeTab);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
      );
    }

    return items;
  }, [activeTab, search]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: CATALOGUE.length };
    CATEGORIES.forEach((cat) => {
      map[cat] = CATALOGUE.filter((i) => i.category === cat).length;
    });
    return map;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Integration Catalogue</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Browse and connect your business tools to power Grove with live data.
          </p>
        </div>
        <Link href="/integrations">
          <Button variant="outline" size="sm" className="mt-2 sm:mt-0">
            <Plug className="h-3.5 w-3.5" />
            Connected
          </Button>
        </Link>
      </div>

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search integrations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5 border-b pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          All ({counts.all})
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === cat
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {CATEGORY_META[cat].icon}
            {cat} ({counts[cat]})
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((integration) => (
            <IntegrationCard
              key={integration.name}
              integration={integration}
              isNotified={notified.has(integration.name)}
              onNotify={() => toggle(integration.name)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <Search className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium">No integrations found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}

      {/* Summary footer */}
      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
        <Plug className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        <p className="text-xs text-emerald-800 dark:text-emerald-300">
          <span className="font-semibold">{CATALOGUE.length} integrations</span> across {CATEGORIES.length} categories.
          More connectors are added every month.
        </p>
      </div>
    </div>
  );
}
