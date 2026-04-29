/**
 * KPI Definitions — Reconciliation Centre
 * ---------------------------------------
 * Static catalogue of which KPIs reconcile against which integrations.
 * Used to seed reconciliation_kpis on first run for an org.
 *
 * Adding a new KPI means: (a) adding a definition here, (b) adding a fetcher
 * branch in engine.ts (FETCHER_REGISTRY).
 */

import type { SourceValue } from './source-fetchers';
import {
  getXeroRevenue,
  getXeroInvoiceCount,
  getXeroOutstandingAR,
  getShopifyRevenue,
  getShopifyOrderCount,
  getHubSpotClosedWonValue,
  getHubSpotClosedWonCount,
  getHubSpotForwardRevenue90d,
  getAcuityForwardRevenue90d,
  getKlaviyoRetentionForecast90d,
} from './source-fetchers';

export type Fetcher = (orgId: string, period: string) => Promise<SourceValue>;

export interface KpiSourceSpec {
  integration: string;
  query_hint: string;
  fetcher: Fetcher;
}

export interface KpiDefinition {
  kpi_key: string;
  label: string;
  category: 'revenue' | 'pipeline' | 'receivables' | 'forecast' | 'production';
  period_grain: 'monthly' | 'quarterly' | 'annual';
  primary_source: string;
  /** When true, drift is informational — no green/amber/red status. */
  informational: boolean;
  drift_thresholds: { green_pct: number; amber_pct: number };
  sources: KpiSourceSpec[];
}

export const KPI_DEFINITIONS: KpiDefinition[] = [
  {
    kpi_key: 'monthly_revenue',
    label: 'Monthly Revenue',
    category: 'revenue',
    period_grain: 'monthly',
    primary_source: 'xero',
    informational: false,
    drift_thresholds: { green_pct: 1, amber_pct: 5 },
    sources: [
      {
        integration: 'xero',
        query_hint: 'sum of REVENUE class accounts in normalised_financials',
        fetcher: getXeroRevenue,
      },
      {
        integration: 'shopify',
        query_hint: 'sum of order totals shipped in period (excludes voided / refunded)',
        fetcher: getShopifyRevenue,
      },
      {
        integration: 'hubspot',
        query_hint: 'sum of closed-won deal value with closedate in period',
        fetcher: getHubSpotClosedWonValue,
      },
    ],
  },
  {
    kpi_key: 'monthly_invoiced_count',
    label: 'Monthly Invoiced Count',
    category: 'revenue',
    period_grain: 'monthly',
    primary_source: 'xero',
    informational: false,
    drift_thresholds: { green_pct: 1, amber_pct: 5 },
    sources: [
      {
        integration: 'xero',
        query_hint: 'count of invoices in raw_transactions where date in period',
        fetcher: getXeroInvoiceCount,
      },
      {
        integration: 'shopify',
        query_hint: 'count of orders shipped in period',
        fetcher: getShopifyOrderCount,
      },
      {
        integration: 'hubspot',
        query_hint: 'count of closed-won deals with closedate in period',
        fetcher: getHubSpotClosedWonCount,
      },
    ],
  },
  {
    kpi_key: 'outstanding_ar',
    label: 'Outstanding AR',
    category: 'receivables',
    period_grain: 'monthly',
    primary_source: 'xero',
    informational: false,
    drift_thresholds: { green_pct: 2, amber_pct: 10 },
    sources: [
      {
        integration: 'xero',
        query_hint: 'sum of AmountDue on AUTHORISED / SUBMITTED invoices as of period end',
        fetcher: getXeroOutstandingAR,
      },
    ],
  },
  {
    kpi_key: 'forward_revenue_90d',
    label: 'Forward Revenue (90d)',
    category: 'forecast',
    period_grain: 'monthly',
    primary_source: 'hubspot',
    informational: true,
    drift_thresholds: { green_pct: 0, amber_pct: 0 },
    sources: [
      {
        integration: 'hubspot',
        query_hint: 'open deals × stage probability for next 90d',
        fetcher: getHubSpotForwardRevenue90d,
      },
      {
        integration: 'acuity',
        query_hint: 'bookings × historical conversion × avg dress price for next 90d',
        fetcher: getAcuityForwardRevenue90d,
      },
      {
        integration: 'klaviyo',
        query_hint: 'retention forecast (returns null until model is fitted)',
        fetcher: getKlaviyoRetentionForecast90d,
      },
    ],
  },
];

/** Find a KPI definition by its kpi_key. */
export function getKpiDefinition(kpiKey: string): KpiDefinition | undefined {
  return KPI_DEFINITIONS.find((k) => k.kpi_key === kpiKey);
}
