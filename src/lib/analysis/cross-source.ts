/**
 * Cross-Source Intelligence
 *
 * Connects data from multiple sources into a unified view.
 * Currently works primarily with Xero data; the structure
 * supports adding Shopify, bank feeds, and other sources.
 */

import { createUntypedServiceClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CrossSourceView {
  orgId: string;
  sources: SourceInfo[];
  reconciliation: ReconciliationItem[];
  enrichedMetrics: EnrichedMetric[];
}

export interface SourceInfo {
  name: string;
  connected: boolean;
  lastSync?: string;
  recordCount: number;
}

export interface ReconciliationItem {
  source1: string;
  source2: string;
  metric: string;
  source1Value: number;
  source2Value: number;
  difference: number;
  differencePercent: number;
  status: 'matched' | 'minor_gap' | 'significant_gap';
  explanation?: string;
}

export interface EnrichedMetric {
  metric: string;
  value: number;
  derivedFrom: string[];
  confidence: number;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Build a unified cross-source view for the organisation.
 * Checks all connected integrations, reconciles overlapping data,
 * and produces enriched metrics that combine multiple sources.
 */
export async function buildCrossSourceView(orgId: string): Promise<CrossSourceView> {
  const supabase = await createUntypedServiceClient();
  const sources: SourceInfo[] = [];
  const reconciliation: ReconciliationItem[] = [];
  const enrichedMetrics: EnrichedMetric[] = [];

  // -----------------------------------------------------------------------
  // 1. Check Xero connection
  // -----------------------------------------------------------------------
  const { data: xeroConn } = await supabase
    .from('xero_connections')
    .select('id, tenant_id, updated_at')
    .eq('org_id', orgId)
    .maybeSingle();

  const xeroConnected = !!xeroConn;
  let xeroRecordCount = 0;
  let xeroLastSync: string | undefined;

  if (xeroConnected) {
    // Count normalised financial records from Xero
    const { count } = await supabase
      .from('normalised_financials')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('source', 'xero');

    xeroRecordCount = count ?? 0;

    // Get last sync time
    const { data: lastSync } = await supabase
      .from('sync_log')
      .select('completed_at')
      .eq('org_id', orgId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    xeroLastSync = (lastSync?.completed_at as string) || undefined;
  }

  sources.push({
    name: 'Xero',
    connected: xeroConnected,
    lastSync: xeroLastSync,
    recordCount: xeroRecordCount,
  });

  // -----------------------------------------------------------------------
  // 2. Check for manual/CSV imported data
  // -----------------------------------------------------------------------
  const { count: manualCount } = await supabase
    .from('normalised_financials')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .in('source', ['manual', 'csv_import']);

  sources.push({
    name: 'Manual / CSV Import',
    connected: (manualCount ?? 0) > 0,
    recordCount: manualCount ?? 0,
  });

  // -----------------------------------------------------------------------
  // 3. Future: Shopify, bank feeds, etc.
  //    Placeholder structure for when these integrations are added.
  // -----------------------------------------------------------------------
  // sources.push({
  //   name: 'Shopify',
  //   connected: false,
  //   recordCount: 0,
  // });

  // -----------------------------------------------------------------------
  // 4. Reconcile overlapping data (Xero vs Manual if both present)
  // -----------------------------------------------------------------------
  if (xeroRecordCount > 0 && (manualCount ?? 0) > 0) {
    // Get total revenue from each source for the latest period
    const { data: latestPeriodData } = await supabase
      .from('normalised_financials')
      .select('period')
      .eq('org_id', orgId)
      .order('period', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestPeriodData) {
      const period = latestPeriodData.period as string;

      // Sum by source for the period
      const { data: xeroTotals } = await supabase
        .from('normalised_financials')
        .select('amount')
        .eq('org_id', orgId)
        .eq('period', period)
        .eq('source', 'xero');

      const { data: manualTotals } = await supabase
        .from('normalised_financials')
        .select('amount')
        .eq('org_id', orgId)
        .eq('period', period)
        .in('source', ['manual', 'csv_import']);

      const xeroTotal = (xeroTotals ?? []).reduce((s, r) => s + Number(r.amount), 0);
      const manualTotal = (manualTotals ?? []).reduce((s, r) => s + Number(r.amount), 0);

      if (xeroTotal !== 0 || manualTotal !== 0) {
        const diff = Math.abs(xeroTotal - manualTotal);
        const diffPct = Math.abs(xeroTotal) > 0
          ? (diff / Math.abs(xeroTotal)) * 100
          : 0;

        reconciliation.push({
          source1: 'Xero',
          source2: 'Manual / CSV',
          metric: `Net total (${period})`,
          source1Value: xeroTotal,
          source2Value: manualTotal,
          difference: diff,
          differencePercent: Math.round(diffPct * 100) / 100,
          status: diffPct < 1 ? 'matched' : diffPct < 5 ? 'minor_gap' : 'significant_gap',
          explanation: diffPct < 1
            ? 'Values match within rounding tolerance.'
            : diffPct < 5
            ? 'Minor discrepancy — likely timing or classification differences.'
            : 'Significant gap — may indicate missing transactions or different accounting treatments.',
        });
      }
    }
  }

  // -----------------------------------------------------------------------
  // 5. Build enriched metrics from all connected sources
  // -----------------------------------------------------------------------

  // Total financial records across all sources
  const totalRecords = sources.reduce((s, src) => s + src.recordCount, 0);
  enrichedMetrics.push({
    metric: 'Total Financial Records',
    value: totalRecords,
    derivedFrom: sources.filter((s) => s.connected).map((s) => s.name),
    confidence: 1.0,
  });

  // Data coverage — how many months of data do we have?
  const { data: periodData } = await supabase
    .from('normalised_financials')
    .select('period')
    .eq('org_id', orgId);

  if (periodData && periodData.length > 0) {
    const uniquePeriods = new Set(periodData.map((r) => r.period as string));
    enrichedMetrics.push({
      metric: 'Data Coverage (months)',
      value: uniquePeriods.size,
      derivedFrom: sources.filter((s) => s.connected).map((s) => s.name),
      confidence: 1.0,
    });
  }

  // Connected sources count
  const connectedCount = sources.filter((s) => s.connected).length;
  enrichedMetrics.push({
    metric: 'Connected Sources',
    value: connectedCount,
    derivedFrom: ['System'],
    confidence: 1.0,
  });

  // Data freshness (days since last sync)
  const latestSync = sources
    .filter((s) => s.lastSync)
    .map((s) => new Date(s.lastSync!).getTime())
    .sort((a, b) => b - a)[0];

  if (latestSync) {
    const daysSinceSync = Math.floor((Date.now() - latestSync) / (1000 * 60 * 60 * 24));
    enrichedMetrics.push({
      metric: 'Data Freshness (days since sync)',
      value: daysSinceSync,
      derivedFrom: sources.filter((s) => s.lastSync).map((s) => s.name),
      confidence: 1.0,
    });
  }

  return {
    orgId,
    sources,
    reconciliation,
    enrichedMetrics,
  };
}
