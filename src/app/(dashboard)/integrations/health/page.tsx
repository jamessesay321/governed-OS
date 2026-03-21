'use client';

const HEALTH_INDICATORS = [
  { label: 'Data freshness', description: 'How recently data was synced', status: 'none' },
  { label: 'Record completeness', description: 'Percentage of fields populated', status: 'none' },
  { label: 'Sync reliability', description: 'Success rate of recent syncs', status: 'none' },
  { label: 'Duplicate detection', description: 'Potential duplicate records found', status: 'none' },
  { label: 'Schema mapping', description: 'Fields correctly mapped to Grove', status: 'none' },
];

export default function IntegrationHealthPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Data Health</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor the quality and reliability of your connected data sources.
        </p>
      </div>

      {/* Empty state banner */}
      <div className="rounded-lg border border-dashed p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <svg
            className="h-7 w-7 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
            />
          </svg>
        </div>
        <h3 className="text-base font-semibold mb-1">No integrations connected</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
          Connect at least one integration to view data health metrics.
        </p>
        <a
          href="/integrations"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Connect an integration
        </a>
      </div>

      {/* Health indicators (greyed out) */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Health Indicators</h3>
        <div className="space-y-3">
          {HEALTH_INDICATORS.map((indicator) => (
            <div
              key={indicator.label}
              className="flex items-center justify-between rounded-lg border p-4 opacity-50"
            >
              <div>
                <p className="text-sm font-medium">{indicator.label}</p>
                <p className="text-xs text-muted-foreground">{indicator.description}</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                No data
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
