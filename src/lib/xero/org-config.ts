/**
 * Pull and cache org accounting config from Xero Organisation API.
 *
 * Called on:
 *  1. First Xero connect (OAuth callback)
 *  2. Each full sync (refresh)
 *  3. On-demand from dashboard (cached read)
 */

import { createServiceClient } from '@/lib/supabase/server';
import { xeroGet } from './api';
import type { OrgAccountingConfig } from '@/types';

// ─── Xero Organisation API Response Shape ──────────────────────────

interface XeroOrganisation {
  OrganisationID: string;
  Name: string;
  LegalName?: string;
  OrganisationType?: string;
  OrganisationStatus?: string;
  FinancialYearEndDay: number;
  FinancialYearEndMonth: number;
  SalesTaxBasis?: string;
  SalesTaxPeriod?: string;
  BaseCurrency: string;
  TaxNumber?: string;
  RegistrationNumber?: string;
  PeriodLockDate?: string;
  EndOfYearLockDate?: string;
  [key: string]: unknown;
}

// ─── Pull from Xero and Upsert ────────────────────────────────────

/**
 * Fetch the Organisation record from Xero and upsert into
 * `org_accounting_config`. Returns the stored config row.
 *
 * Uses the shared `xeroGet` helper (rate-limited, 429-safe).
 */
export async function pullOrgAccountingConfig(
  orgId: string,
  accessToken: string,
  tenantId: string
): Promise<OrgAccountingConfig> {
  const data = await xeroGet('Organisation', accessToken, tenantId);
  const orgs: XeroOrganisation[] = data.Organisations ?? [];

  if (orgs.length === 0) {
    throw new Error('Xero Organisation API returned no organisations');
  }

  const org = orgs[0];

  // Parse optional lock dates (Xero returns "/Date(...)/" or ISO)
  const parseLockDate = (raw?: string): string | null => {
    if (!raw) return null;
    const msMatch = raw.match(/\/Date\((\d+)([+-]\d{4})?\)\//);
    if (msMatch) {
      return new Date(parseInt(msMatch[1], 10)).toISOString().split('T')[0];
    }
    if (raw.includes('T')) return raw.split('T')[0];
    return raw;
  };

  const row = {
    org_id: orgId,
    financial_year_end_month: org.FinancialYearEndMonth,
    financial_year_end_day: org.FinancialYearEndDay,
    vat_scheme: org.SalesTaxBasis ?? null,
    vat_period: org.SalesTaxPeriod ?? null,
    base_currency: org.BaseCurrency || 'GBP',
    corporation_tax_period: null,
    last_filed_accounts_date: null,
    xero_org_type: org.OrganisationType ?? null,
    xero_org_status: org.OrganisationStatus ?? null,
    tax_number: org.TaxNumber ?? null,
    registration_number: org.RegistrationNumber ?? null,
    period_lock_date: parseLockDate(org.PeriodLockDate),
    end_of_year_lock_date: parseLockDate(org.EndOfYearLockDate),
    raw_response: org as unknown as Record<string, unknown>,
    updated_at: new Date().toISOString(),
  };

  const supabase = await createServiceClient();

  const { data: upserted, error } = await supabase
    .from('org_accounting_config')
    .upsert(row, { onConflict: 'org_id' })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert org accounting config: ${error.message}`);
  }

  console.log(
    `[ORG CONFIG] Saved config for org ${orgId}: FY ends ${org.FinancialYearEndDay}/${org.FinancialYearEndMonth}, currency ${org.BaseCurrency}`
  );

  return upserted as OrgAccountingConfig;
}

// ─── Cached Read ───────────────────────────────────────────────────

/**
 * Read the cached org accounting config from the database.
 * Returns null if no config has been pulled yet.
 */
export async function getOrgAccountingConfig(
  orgId: string
): Promise<OrgAccountingConfig | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from('org_accounting_config')
    .select('*')
    .eq('org_id', orgId)
    .single();

  if (error || !data) return null;
  return data as OrgAccountingConfig;
}

/**
 * Get the financial year-end month for an org.
 * Falls back to December (calendar year) if no config exists.
 */
export async function getYearEndMonth(orgId: string): Promise<number> {
  const config = await getOrgAccountingConfig(orgId);
  return config?.financial_year_end_month ?? 12;
}
