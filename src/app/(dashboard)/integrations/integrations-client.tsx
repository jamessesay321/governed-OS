'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

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
  description: string;
  status: 'connected' | 'available' | 'coming_soon';
  connectHref?: string;
};

type Props = {
  orgId: string;
  xeroConnected: boolean;
  xeroTenantName: string | null;
  xeroConfigured: boolean;
  qboConnected: boolean;
  qboCompanyName: string | null;
  qboConfigured: boolean;
  lastSyncAt: string | null;
  lastSyncRecords: number | null;
  lastSyncStatus: string | null;
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
    { name: 'Xero', category: 'Accounting', initials: 'Xe', colour: '#13B5EA', description: 'Cloud accounting for small businesses. Popular in UK, AU, NZ.', status: xeroConnected ? 'connected' : 'available', connectHref: '/api/xero/connect' },
    { name: 'QuickBooks', category: 'Accounting', initials: 'QB', colour: '#2CA01C', description: 'The most widely used accounting software worldwide.', status: xeroConnected ? 'coming_soon' as const : 'available' as const, connectHref: '/api/quickbooks/connect' },
    { name: 'Sage', category: 'Accounting', initials: 'Sa', colour: '#00D639', description: 'Enterprise accounting and payroll. Strong in UK and Europe.', status: 'coming_soon' },
    { name: 'FreshBooks', category: 'Accounting', initials: 'FB', colour: '#0075DD', description: 'Simple invoicing and accounting for freelancers and small teams.', status: 'coming_soon' },

    // Sales & CRM
    { name: 'Salesforce', category: 'Sales & CRM', initials: 'SF', colour: '#00A1E0', description: 'Enterprise CRM platform.', status: 'coming_soon' },
    { name: 'HubSpot', category: 'Sales & CRM', initials: 'HS', colour: '#FF7A59', description: 'Inbound marketing, sales, and CRM.', status: 'coming_soon' },
    { name: 'Pipedrive', category: 'Sales & CRM', initials: 'PD', colour: '#017737', description: 'Sales pipeline management.', status: 'coming_soon' },
    { name: 'Zoho CRM', category: 'Sales & CRM', initials: 'ZC', colour: '#E42527', description: 'CRM for growing businesses.', status: 'coming_soon' },

    // Marketing
    { name: 'Google Analytics', category: 'Marketing', initials: 'GA', colour: '#E37400', description: 'Web analytics and reporting.', status: 'coming_soon' },
    { name: 'HootSuite', category: 'Marketing', initials: 'HT', colour: '#143059', description: 'Social media management.', status: 'coming_soon' },
    { name: 'Buffer', category: 'Marketing', initials: 'Bu', colour: '#168EEA', description: 'Social media scheduling.', status: 'coming_soon' },
    { name: 'Meta Ads', category: 'Marketing', initials: 'MA', colour: '#0081FB', description: 'Facebook and Instagram advertising.', status: 'coming_soon' },

    // Social Media
    { name: 'LinkedIn', category: 'Social Media', initials: 'Li', colour: '#0A66C2', description: 'Professional networking data.', status: 'coming_soon' },
    { name: 'Facebook', category: 'Social Media', initials: 'Fb', colour: '#1877F2', description: 'Page insights and engagement.', status: 'coming_soon' },
    { name: 'Instagram', category: 'Social Media', initials: 'Ig', colour: '#E4405F', description: 'Visual content analytics.', status: 'coming_soon' },
    { name: 'TikTok', category: 'Social Media', initials: 'TT', colour: '#000000', description: 'Short-form video analytics.', status: 'coming_soon' },
    { name: 'YouTube', category: 'Social Media', initials: 'YT', colour: '#FF0000', description: 'Video content analytics.', status: 'coming_soon' },
    { name: 'Pinterest', category: 'Social Media', initials: 'Pi', colour: '#E60023', description: 'Visual discovery analytics.', status: 'coming_soon' },

    // ERP
    { name: 'NetSuite', category: 'ERP', initials: 'NS', colour: '#1B3A55', description: 'Enterprise resource planning.', status: 'coming_soon' },
    { name: 'SAP Business One', category: 'ERP', initials: 'SP', colour: '#0FAAFF', description: 'Small business ERP.', status: 'coming_soon' },
    { name: 'Microsoft Dynamics', category: 'ERP', initials: 'MD', colour: '#002050', description: 'Business applications suite.', status: 'coming_soon' },

    // Payments
    { name: 'Stripe', category: 'Payments', initials: 'St', colour: '#635BFF', description: 'Online payment processing.', status: 'coming_soon' },
    { name: 'GoCardless', category: 'Payments', initials: 'GC', colour: '#1C1C1C', description: 'Direct debit payments.', status: 'coming_soon' },
    { name: 'Square', category: 'Payments', initials: 'Sq', colour: '#006AFF', description: 'Point of sale and payments.', status: 'coming_soon' },

    // HR & Payroll
    { name: 'BreatheHR', category: 'HR & Payroll', initials: 'BH', colour: '#00B2A9', description: 'UK HR management.', status: 'coming_soon' },
    { name: 'Gusto', category: 'HR & Payroll', initials: 'Gu', colour: '#F45D48', description: 'Payroll and benefits.', status: 'coming_soon' },
    { name: 'Rippling', category: 'HR & Payroll', initials: 'Ri', colour: '#FEC800', description: 'HR, IT, and finance platform.', status: 'coming_soon' },
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

// ---------------------------------------------------------------------------
// Accounting Software Hero Section
// ---------------------------------------------------------------------------

function AccountingSoftwareSection({
  xeroConnected,
  xeroTenantName,
  xeroConfigured,
  qboConnected,
  qboCompanyName,
  qboConfigured,
  lastSyncAt,
  lastSyncRecords,
  lastSyncStatus,
}: {
  xeroConnected: boolean;
  xeroTenantName: string | null;
  xeroConfigured: boolean;
  qboConnected: boolean;
  qboCompanyName: string | null;
  qboConfigured: boolean;
  lastSyncAt: string | null;
  lastSyncRecords: number | null;
  lastSyncStatus: string | null;
}) {
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notified, setNotified] = useState<Record<string, boolean>>({});

  const accountingOptions = [
    {
      name: 'Xero',
      initials: 'Xe',
      colour: '#13B5EA',
      description: 'Cloud accounting for small businesses. Popular in UK, AU, NZ.',
      status: xeroConnected ? ('connected' as const) : ('available' as const),
      connectHref: '/api/xero/connect',
      configured: xeroConfigured,
      tenantName: xeroTenantName,
    },
    {
      name: 'QuickBooks',
      initials: 'QB',
      colour: '#2CA01C',
      description: 'The most widely used accounting software worldwide.',
      status: qboConnected ? ('connected' as const) : ('available' as const),
      connectHref: '/api/quickbooks/connect',
      configured: qboConfigured,
      tenantName: qboCompanyName,
    },
    {
      name: 'Sage',
      initials: 'Sa',
      colour: '#00D639',
      description: 'Enterprise accounting and payroll. Strong in UK and Europe.',
      status: 'coming_soon' as const,
      connectHref: null,
      configured: false,
      tenantName: null,
    },
    {
      name: 'FreshBooks',
      initials: 'FB',
      colour: '#0075DD',
      description: 'Invoicing and accounting for freelancers and small teams.',
      status: 'coming_soon' as const,
      connectHref: null,
      configured: false,
      tenantName: null,
    },
  ];

  const handleNotify = (name: string) => {
    setNotified((prev) => ({ ...prev, [name]: true }));
    // In future: POST to /api/integrations/notify with email + integration name
  };

  return (
    <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M3 6h18M3 18h18M8 6v12M16 6v12" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold">Connect your accounting software</h3>
          <p className="text-sm text-muted-foreground">
            This is the most important connection. It powers your dashboard, KPIs, forecasts, and reports.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
        {accountingOptions.map((opt) => (
          <div
            key={opt.name}
            className={`relative rounded-lg border bg-background p-5 transition-shadow hover:shadow-sm ${
              opt.status === 'connected'
                ? 'border-green-300 ring-1 ring-green-200'
                : ''
            }`}
          >
            {/* Connected indicator */}
            {opt.status === 'connected' && (
              <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}

            <div className="flex items-start gap-4">
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: opt.colour }}
              >
                {opt.initials}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold">{opt.name}</h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {opt.description}
                </p>

                {opt.status === 'connected' && opt.tenantName && (
                  <p className="text-xs text-green-700 font-medium mt-1.5">
                    Connected to {opt.tenantName}
                  </p>
                )}
                {opt.status === 'connected' && lastSyncAt && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Last synced: {new Date(lastSyncAt).toLocaleString('en-GB', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                    {lastSyncRecords != null && ` \u00b7 ${lastSyncRecords} records`}
                    {lastSyncStatus === 'completed' && (
                      <span className="text-green-600 ml-1">\u2713</span>
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4">
              {opt.status === 'connected' && (
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Connected
                  </span>
                  <Link
                    href="/xero"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                  >
                    Manage
                  </Link>
                </div>
              )}

              {opt.status === 'available' && opt.connectHref && (
                <div>
                  {opt.configured ? (
                    <a
                      href={opt.connectHref}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Connect {opt.name}
                    </a>
                  ) : (
                    <div className="space-y-2">
                      <a
                        href={opt.connectHref}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Connect {opt.name}
                      </a>
                      <p className="text-[10px] text-amber-600 text-center">
                        Requires API credentials. Check Settings if this fails.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {opt.status === 'coming_soon' && (
                <div>
                  {notified[opt.name] ? (
                    <span className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      We will notify you when ready
                    </span>
                  ) : (
                    <button
                      onClick={() => handleNotify(opt.name)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      Notify me when {opt.name} is ready
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        All connections use read-only access. We never modify your accounting data.
        Your data is isolated to your organisation and encrypted at rest.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Integration Card (for non-accounting integrations)
// ---------------------------------------------------------------------------

function IntegrationCard({ integration }: { integration: Integration }) {
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
      {isActive && (
        <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
          <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      <div className="flex items-start gap-4">
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
          <p className="text-xs text-muted-foreground mt-0.5">{integration.description}</p>
        </div>
      </div>

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

export function IntegrationsClient({ orgId, xeroConnected, xeroTenantName, xeroConfigured, qboConnected, qboCompanyName, qboConfigured, lastSyncAt, lastSyncRecords, lastSyncStatus }: Props) {
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get('message');
  const [activeFilter, setActiveFilter] = useState<'All' | Category>('All');

  const catalogue = useMemo(() => buildCatalogue(xeroConnected), [xeroConnected]);

  // Non-accounting integrations for the grid below
  const nonAccountingIntegrations = useMemo(() => {
    const items = catalogue.filter((i) => i.category !== 'Accounting');
    if (activeFilter === 'All' || activeFilter === 'Accounting') return items;
    return items.filter((i) => i.category === activeFilter);
  }, [catalogue, activeFilter]);

  const nonAccountingCategories = CATEGORIES.filter((c) => c !== 'Accounting');
  const filters: ('All' | Category)[] = ['All', ...nonAccountingCategories];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Integrations</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your tools to power Grove with real data.
          </p>
        </div>
        <Link
          href="/home"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Back to dashboard
        </Link>
      </div>

      {/* Error banner from redirect */}
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-red-800">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* HERO: Accounting Software Section */}
      <AccountingSoftwareSection
        xeroConnected={xeroConnected}
        xeroTenantName={xeroTenantName}
        xeroConfigured={xeroConfigured}
        qboConnected={qboConnected}
        qboCompanyName={qboCompanyName}
        qboConfigured={qboConfigured}
        lastSyncAt={lastSyncAt}
        lastSyncRecords={lastSyncRecords}
        lastSyncStatus={lastSyncStatus}
      />

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

      {/* Other Integrations */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Other integrations</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Connect your CRM, marketing, payments, and HR tools for a complete picture.
        </p>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-4">
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
          {nonAccountingIntegrations.map((integration) => (
            <IntegrationCard
              key={integration.name}
              integration={integration}
            />
          ))}
        </div>

        {nonAccountingIntegrations.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No integrations found for this category.
          </div>
        )}
      </div>
    </div>
  );
}
