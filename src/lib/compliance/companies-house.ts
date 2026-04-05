/**
 * Companies House Integration
 *
 * Fetches company data from the Companies House REST API.
 * Free API - no authentication required for basic company data.
 * Rate limit: 600 requests per 5 minutes.
 *
 * API docs: https://developer.company-information.service.gov.uk/
 */

import { z } from 'zod';

const COMPANIES_HOUSE_API = 'https://api.company-information.service.gov.uk';

// ---- Response Schemas ----

const CompanyProfileSchema = z.object({
  company_name: z.string(),
  company_number: z.string(),
  company_status: z.string(),
  type: z.string(),
  date_of_creation: z.string().optional(),
  registered_office_address: z.object({
    address_line_1: z.string().optional(),
    address_line_2: z.string().optional(),
    locality: z.string().optional(),
    region: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  sic_codes: z.array(z.string()).optional(),
  accounts: z.object({
    accounting_reference_date: z.object({
      month: z.string().optional(),
      day: z.string().optional(),
    }).optional(),
    last_accounts: z.object({
      made_up_to: z.string().optional(),
      type: z.string().optional(),
      period_end_on: z.string().optional(),
    }).optional(),
    next_accounts: z.object({
      due_on: z.string().optional(),
      period_end_on: z.string().optional(),
    }).optional(),
    next_made_up_to: z.string().optional(),
    overdue: z.boolean().optional(),
  }).optional(),
  confirmation_statement: z.object({
    last_made_up_to: z.string().optional(),
    next_due: z.string().optional(),
    next_made_up_to: z.string().optional(),
    overdue: z.boolean().optional(),
  }).optional(),
  has_charges: z.boolean().optional(),
  has_insolvency_history: z.boolean().optional(),
  can_file: z.boolean().optional(),
}).passthrough();

export type CompanyProfile = z.infer<typeof CompanyProfileSchema>;

const FilingHistorySchema = z.object({
  items: z.array(z.object({
    date: z.string(),
    type: z.string(),
    category: z.string().optional(),
    description: z.string().optional(),
    description_values: z.record(z.string(), z.string()).optional(),
  })).optional(),
  total_count: z.number().optional(),
}).passthrough();

const ChargesSchema = z.object({
  items: z.array(z.object({
    status: z.string().optional(),
    created_on: z.string().optional(),
    delivered_on: z.string().optional(),
    persons_entitled: z.array(z.object({
      name: z.string().optional(),
    })).optional(),
    particulars: z.object({
      description: z.string().optional(),
      type: z.string().optional(),
    }).optional(),
  })).optional(),
  total_count: z.number().optional(),
}).passthrough();

export type ChargesResponse = z.infer<typeof ChargesSchema>;

// ---- API Functions ----

/**
 * Fetch a company profile from Companies House.
 * Note: The Companies House API requires an API key passed as the username
 * in HTTP Basic Auth (password left blank). Without a key, only search works.
 */
export async function fetchCompanyProfile(
  companyNumber: string,
  apiKey?: string
): Promise<CompanyProfile | null> {
  const paddedNumber = companyNumber.padStart(8, '0');
  const url = `${COMPANIES_HOUSE_API}/company/${paddedNumber}`;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
  }

  try {
    const res = await fetch(url, { headers, next: { revalidate: 86400 } }); // Cache for 24h
    if (!res.ok) {
      console.error(`[companies-house] Failed to fetch ${paddedNumber}: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const parsed = CompanyProfileSchema.safeParse(data);
    if (!parsed.success) {
      console.warn('[companies-house] Profile parse warning:', parsed.error.issues.length, 'issues');
      // Return raw data as passthrough allows extra fields
      return data as CompanyProfile;
    }
    return parsed.data;
  } catch (err) {
    console.error('[companies-house] Fetch error:', err);
    return null;
  }
}

/**
 * Fetch filing history for a company.
 */
export async function fetchFilingHistory(
  companyNumber: string,
  apiKey?: string,
  itemsPerPage: number = 10
): Promise<z.infer<typeof FilingHistorySchema> | null> {
  const paddedNumber = companyNumber.padStart(8, '0');
  const url = `${COMPANIES_HOUSE_API}/company/${paddedNumber}/filing-history?items_per_page=${itemsPerPage}`;

  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
  }

  try {
    const res = await fetch(url, { headers, next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = await res.json();
    return FilingHistorySchema.parse(data);
  } catch (err) {
    console.error('[companies-house] Filing history error:', err);
    return null;
  }
}

/**
 * Fetch charges (mortgages/security) for a company.
 */
export async function fetchCharges(
  companyNumber: string,
  apiKey?: string
): Promise<ChargesResponse | null> {
  const paddedNumber = companyNumber.padStart(8, '0');
  const url = `${COMPANIES_HOUSE_API}/company/${paddedNumber}/charges`;

  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
  }

  try {
    const res = await fetch(url, { headers, next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = await res.json();
    return ChargesSchema.parse(data);
  } catch (err) {
    console.error('[companies-house] Charges error:', err);
    return null;
  }
}

// ---- Compliance Summary Builder ----

export interface ComplianceSummary {
  companyName: string;
  companyNumber: string;
  status: string;
  incorporationDate: string | null;
  yearEnd: { month: number; day: number } | null;
  accountsStatus: {
    lastFiled: string | null;
    lastAccountsType: string | null;
    nextDue: string | null;
    overdue: boolean;
  };
  confirmationStatement: {
    lastFiled: string | null;
    nextDue: string | null;
    overdue: boolean;
  };
  charges: {
    hasOutstandingCharges: boolean;
    count: number;
    details: string[];
  };
  hasInsolvencyHistory: boolean;
  sicCodes: string[];
  alerts: ComplianceAlert[];
}

export interface ComplianceAlert {
  level: 'info' | 'warning' | 'critical';
  message: string;
  action: string;
}

export function buildComplianceSummary(
  profile: CompanyProfile,
  charges?: ChargesResponse | null
): ComplianceSummary {
  const alerts: ComplianceAlert[] = [];

  // Check for overdue accounts
  if (profile.accounts?.overdue) {
    alerts.push({
      level: 'critical',
      message: 'Annual accounts are OVERDUE at Companies House.',
      action: 'File accounts immediately. Late filing incurs automatic penalties (starting at GBP 150 for private companies, doubling if 3+ months late).',
    });
  }

  // Check for overdue confirmation statement
  if (profile.confirmation_statement?.overdue) {
    alerts.push({
      level: 'critical',
      message: 'Confirmation statement is OVERDUE.',
      action: 'File confirmation statement immediately. Failure to file is a criminal offence and the company may be struck off.',
    });
  }

  // Check for insolvency history
  if (profile.has_insolvency_history) {
    alerts.push({
      level: 'warning',
      message: 'Company has insolvency history on record.',
      action: 'Review insolvency history for any ongoing proceedings.',
    });
  }

  // Check charges
  const outstandingCharges = (charges?.items ?? []).filter(
    (c) => c.status === 'outstanding'
  );
  if (outstandingCharges.length > 0) {
    alerts.push({
      level: 'info',
      message: `${outstandingCharges.length} outstanding charge(s) registered against the company.`,
      action: 'Review charge details - secured lending affects credit capacity and going concern assessment.',
    });
  }

  // Determine year-end
  const yearEnd = profile.accounts?.accounting_reference_date
    ? {
        month: parseInt(profile.accounts.accounting_reference_date.month ?? '12', 10),
        day: parseInt(profile.accounts.accounting_reference_date.day ?? '31', 10),
      }
    : null;

  return {
    companyName: profile.company_name,
    companyNumber: profile.company_number,
    status: profile.company_status,
    incorporationDate: profile.date_of_creation ?? null,
    yearEnd,
    accountsStatus: {
      lastFiled: profile.accounts?.last_accounts?.made_up_to ?? null,
      lastAccountsType: profile.accounts?.last_accounts?.type ?? null,
      nextDue: profile.accounts?.next_accounts?.due_on ?? null,
      overdue: profile.accounts?.overdue ?? false,
    },
    confirmationStatement: {
      lastFiled: profile.confirmation_statement?.last_made_up_to ?? null,
      nextDue: profile.confirmation_statement?.next_due ?? null,
      overdue: profile.confirmation_statement?.overdue ?? false,
    },
    charges: {
      hasOutstandingCharges: outstandingCharges.length > 0,
      count: outstandingCharges.length,
      details: outstandingCharges.map((c) => {
        const lender = c.persons_entitled?.[0]?.name ?? 'Unknown';
        const created = c.created_on ?? 'Unknown date';
        return `${lender} (created ${created})`;
      }),
    },
    hasInsolvencyHistory: profile.has_insolvency_history ?? false,
    sicCodes: profile.sic_codes ?? [],
    alerts,
  };
}

/**
 * Search for a company by name.
 */
export async function searchCompany(
  query: string,
  apiKey?: string
): Promise<Array<{ companyName: string; companyNumber: string; status: string }>> {
  const url = `${COMPANIES_HOUSE_API}/search/companies?q=${encodeURIComponent(query)}&items_per_page=5`;

  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
  }

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items ?? []).map((item: Record<string, unknown>) => ({
      companyName: item.title as string,
      companyNumber: item.company_number as string,
      status: item.company_status as string,
    }));
  } catch {
    return [];
  }
}
