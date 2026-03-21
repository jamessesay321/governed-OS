'use client';

import { useState, useMemo } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Category =
  | 'Accounting'
  | 'Sales & CRM'
  | 'Marketing'
  | 'Social Media'
  | 'ERP'
  | 'Payments'
  | 'HR & Payroll';

type Integration = {
  name: string;
  category: Category;
  initials: string;
  colour: string;
  status: 'connected' | 'available' | 'coming_soon';
  connectHref?: string;
};

type Props = {
  orgId: string;
  xeroConnected: boolean;
  xeroTenantName: string | null;
};

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

const CATEGORIES: Category[] = [
  'Accounting',
  'Sales & CRM',
  'Marketing',
  'Social Media',
  'ERP',
  'Payments',
  'HR & Payroll',
];

function buildCatalogue(xeroConnected: boolean): Integration[] {
  return [
    // Accounting
    { name: 'Xero', category: 'Accounting', initials: 'Xe', colour: '#13B5EA', status: xeroConnected ? 'connected' : 'available', connectHref: '/api/xero/connect' },
    { name: 'QuickBooks', category: 'Accounting', initials: 'QB', colour: '#2CA01C', status: 'coming_soon' },
    { name: 'Sage', category: 'Accounting', initials: 'Sa', colour: '#00D639', status: 'coming_soon' },
    { name: 'FreshBooks', category: 'Accounting', initials: 'FB', colour: '#0075DD', status: 'coming_soon' },

    // Sales & CRM
    { name: 'Salesforce', category: 'Sales & CRM', initials: 'SF', colour: '#00A1E0', status: 'coming_soon' },
    { name: 'HubSpot', category: 'Sales & CRM', initials: 'HS', colour: '#FF7A59', status: 'coming_soon' },
    { name: 'Pipedrive', category: 'Sales & CRM', initials: 'PD', colour: '#017737', status: 'coming_soon' },
    { name: 'Zoho CRM', category: 'Sales & CRM', initials: 'ZC', colour: '#E42527', status: 'coming_soon' },

    // Marketing
    { name: 'Google Analytics', category: 'Marketing', initials: 'GA', colour: '#E37400', status: 'coming_soon' },
    { name: 'HootSuite', category: 'Marketing', initials: 'HT', colour: '#143059', status: 'coming_soon' },
    { name: 'Buffer', category: 'Marketing', initials: 'Bu', colour: '#168EEA', status: 'coming_soon' },
    { name: 'Meta Ads', category: 'Marketing', initials: 'MA', colour: '#0081FB', status: 'coming_soon' },

    // Social Media
    { name: 'LinkedIn', category: 'Social Media', initials: 'Li', colour: '#0A66C2', status: 'coming_soon' },
    { name: 'Facebook', category: 'Social Media', initials: 'Fb', colour: '#1877F2', status: 'coming_soon' },
    { name: 'Instagram', category: 'Social Media', initials: 'Ig', colour: '#E4405F', status: 'coming_soon' },
    { name: 'TikTok', category: 'Social Media', initials: 'TT', colour: '#000000', status: 'coming_soon' },
    { name: 'YouTube', category: 'Social Media', initials: 'YT', colour: '#FF0000', status: 'coming_soon' },
    { name: 'Pinterest', category: 'Social Media', initials: 'Pi', colour: '#E60023', status: 'coming_soon' },

    // ERP
    { name: 'NetSuite', category: 'ERP', initials: 'NS', colour: '#1B3A55', status: 'coming_soon' },
    { name: 'SAP Business One', category: 'ERP', initials: 'SP', colour: '#0FAAFF', status: 'coming_soon' },
    { name: 'Microsoft Dynamics', category: 'ERP', initials: 'MD', colour: '#002050', status: 'coming_soon' },

    // Payments
    { name: 'Stripe', category: 'Payments', initials: 'St', colour: '#635BFF', status: 'coming_soon' },
    { name: 'GoCardless', category: 'Payments', initials: 'GC', colour: '#1C1C1C', status: 'coming_soon' },
    { name: 'Square', category: 'Payments', initials: 'Sq', colour: '#006AFF', status: 'coming_soon' },

    // HR & Payroll
    { name: 'BreatheHR', category: 'HR & Payroll', initials: 'BH', colour: '#00B2A9', status: 'coming_soon' },
    { name: 'Gusto', category: 'HR & Payroll', initials: 'Gu', colour: '#F45D48', status: 'coming_soon' },
    { name: 'Rippling', category: 'HR & Payroll', initials: 'Ri', colour: '#FEC800', status: 'coming_soon' },
  ];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function categoryProgress(catalogue: Integration[], category: Category): number {
  const items = catalogue.filter((i) => i.category === category);
  if (items.length === 0) return 0;
  const connected = items.filter((i) => i.status === 'connected').length;
  return connected > 0 ? 100 : 0;
}

function overallProgress(catalogue: Integration[]): number {
  const totals = CATEGORIES.map((c) => categoryProgress(catalogue, c));
  return Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className={`h-2 rounded-full transition-all ${value === 100 ? 'bg-green-500' : value > 0 ? 'bg-blue-500' : 'bg-muted'}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function CategoryBadge({ category }: { category: Category }) {
  const colours: Record<Category, string> = {
    Accounting: 'bg-blue-100 text-blue-800',
    'Sales & CRM': 'bg-orange-100 text-orange-800',
    Marketing: 'bg-purple-100 text-purple-800',
    'Social Media': 'bg-pink-100 text-pink-800',
    ERP: 'bg-indigo-100 text-indigo-800',
    Payments: 'bg-emerald-100 text-emerald-800',
    'HR & Payroll': 'bg-teal-100 text-teal-800',
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${colours[category]}`}>
      {category}
    </span>
  );
}

function IntegrationCard({ integration, xeroTenantName }: { integration: Integration; xeroTenantName: string | null }) {
  const isActive = integration.status === 'connected';
  const isAvailable = integration.status === 'available';

  return (
    <div
      className={`relative rounded-lg border p-5 transition-shadow ${
        isActive
          ? 'border-green-300 bg-green-50/50 shadow-sm ring-1 ring-green-200'
          : 'hover:shadow-sm'
      }`}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
          <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Logo placeholder */}
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
          style={{ backgroundColor: integration.colour }}
        >
          {integration.initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold truncate">{integration.name}</h3>
            <CategoryBadge category={integration.category} />
          </div>

          {isActive && xeroTenantName && (
            <p className="text-xs text-green-700 mt-0.5">
              Connected to {xeroTenantName}
            </p>
          )}

          {isActive && !xeroTenantName && (
            <p className="text-xs text-green-700 mt-0.5">Connected</p>
          )}

          {integration.status === 'coming_soon' && (
            <p className="text-xs text-muted-foreground mt-0.5">Coming soon</p>
          )}
        </div>
      </div>

      {/* Action area */}
      <div className="mt-4">
        {isActive && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-800">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Connected
          </span>
        )}

        {isAvailable && integration.connectHref && (
          <a
            href={integration.connectHref}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Connect
          </a>
        )}

        {integration.status === 'coming_soon' && (
          <span className="inline-flex items-center rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Coming Soon
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function IntegrationsClient({ orgId, xeroConnected, xeroTenantName }: Props) {
  const [activeFilter, setActiveFilter] = useState<'All' | Category>('All');

  const catalogue = useMemo(() => buildCatalogue(xeroConnected), [xeroConnected]);

  const filteredIntegrations = useMemo(() => {
    if (activeFilter === 'All') return catalogue;
    return catalogue.filter((i) => i.category === activeFilter);
  }, [catalogue, activeFilter]);

  const filters: ('All' | Category)[] = ['All', ...CATEGORIES];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Integrations</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your tools to power Advisory OS
        </p>
      </div>

      {/* Data Completeness */}
      <div className="rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Data Completeness</h3>
          <span className="text-sm font-bold text-primary">{overallProgress(catalogue)}% overall</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => (
            <ProgressBar key={cat} label={cat} value={categoryProgress(catalogue, cat)} />
          ))}
          <ProgressBar label="Overall" value={overallProgress(catalogue)} />
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === filter
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Integration cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredIntegrations.map((integration) => (
          <IntegrationCard
            key={integration.name}
            integration={integration}
            xeroTenantName={xeroTenantName}
          />
        ))}
      </div>

      {filteredIntegrations.length === 0 && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No integrations found for this category.
        </div>
      )}
    </div>
  );
}
