/**
 * Revenue Model Auto-Detection
 * --------------------------------------------------
 * Determines HOW a business generates revenue by analysing:
 * 1. Invoice patterns from Xero (frequency, amounts, contacts)
 * 2. Interview data (revenue_model, revenue_streams)
 * 3. Account name patterns
 *
 * This changes how client count, AOV, KPIs, and forecasts work.
 *
 * Skill references:
 *  - revenue-model-awareness.md
 *  - client-context-derivation.md
 */

import { createUntypedServiceClient } from '@/lib/supabase/server';

// ─── Types ──────────────────────────────────────────────────

export type RevenueModelType =
  | 'subscription'   // SaaS, memberships — recurring monthly
  | 'project'        // Bridal, construction, consulting — large infrequent
  | 'retail'         // E-commerce, shops — many small transactions
  | 'retainer'       // Accounting, legal, agency — monthly fixed
  | 'marketplace'    // Commission-based — GMV × take rate
  | 'mixed'          // Multiple revenue streams
  | 'unknown';       // Not enough data

export interface RevenueModelProfile {
  /** Detected revenue model type */
  modelType: RevenueModelType;
  /** Confidence level 0-1 */
  confidence: number;
  /** How client count should be calculated */
  clientCountMethod: 'active_subscribers' | 'unique_project_clients' | 'unique_purchasers' | 'active_retainer_clients' | 'invoice_contacts';
  /** What to divide revenue by for AOV */
  aovDivisor: 'invoices' | 'unique_contacts' | 'transactions' | 'not_applicable';
  /** Primary KPIs for this model */
  primaryKPIs: string[];
  /** Human-readable description */
  description: string;
  /** Detection signals that led to this classification */
  signals: string[];
  /** Estimated unique client count for current period */
  estimatedClientCount?: number;
  /** Average invoices per unique contact */
  avgInvoicesPerContact?: number;
  /** Invoice amount coefficient of variation (spread) */
  invoiceAmountCV?: number;
}

// ─── Detection from Interview Data ──────────────────────────

/**
 * Try to detect revenue model from interview data (most reliable source).
 */
export function detectFromInterview(
  interviewData: Record<string, unknown> | null
): { modelType: RevenueModelType; confidence: number; signals: string[] } | null {
  if (!interviewData) return null;

  const signals: string[] = [];
  const companyProfile = (interviewData.company_profile as Record<string, unknown>) ?? {};
  const revenueModel = (companyProfile.revenue_model as string) ?? '';
  const industry = (companyProfile.industry as string) ?? '';
  const revenueStreams = (companyProfile.revenue_streams as string[]) ?? [];

  // Direct revenue_model field from interview
  if (revenueModel) {
    const lower = revenueModel.toLowerCase();
    signals.push(`Interview revenue_model: "${revenueModel}"`);

    if (/subscription|saas|recurring/i.test(lower)) {
      return { modelType: 'subscription', confidence: 0.9, signals };
    }
    if (/project|bespoke|custom|made.to.order/i.test(lower)) {
      return { modelType: 'project', confidence: 0.9, signals };
    }
    if (/retail|ecommerce|e-commerce|shop/i.test(lower)) {
      return { modelType: 'retail', confidence: 0.9, signals };
    }
    if (/retainer|monthly.*fee|fixed.*fee/i.test(lower)) {
      return { modelType: 'retainer', confidence: 0.9, signals };
    }
    if (/marketplace|platform|commission/i.test(lower)) {
      return { modelType: 'marketplace', confidence: 0.9, signals };
    }
  }

  // Infer from industry
  if (industry) {
    signals.push(`Industry: "${industry}"`);
    const lower = industry.toLowerCase();

    if (/bridal|fashion|luxury|bespoke|consulting|construction/i.test(lower)) {
      return { modelType: 'project', confidence: 0.7, signals };
    }
    if (/saas|software|tech/i.test(lower)) {
      return { modelType: 'subscription', confidence: 0.7, signals };
    }
    if (/retail|ecommerce|shop/i.test(lower)) {
      return { modelType: 'retail', confidence: 0.7, signals };
    }
    if (/accounting|legal|agency|marketing/i.test(lower)) {
      return { modelType: 'retainer', confidence: 0.7, signals };
    }
  }

  // Infer from revenue streams
  if (revenueStreams.length > 0) {
    signals.push(`Revenue streams: ${revenueStreams.join(', ')}`);
    if (revenueStreams.length >= 3) {
      return { modelType: 'mixed', confidence: 0.6, signals };
    }
  }

  return null;
}

// ─── Detection from Xero Invoice Patterns ───────────────────

interface InvoiceStats {
  avgInvoicesPerContact: number;
  invoiceAmountCV: number;
  uniqueContacts: number;
  totalInvoices: number;
  medianAmount: number;
  amountSpread: number; // max/min ratio
  hasRecurringPattern: boolean;
}

function analyseInvoicePatterns(invoices: Array<{
  contact_id: string;
  amount: number;
  period: string;
}>): InvoiceStats {
  if (invoices.length === 0) {
    return {
      avgInvoicesPerContact: 0,
      invoiceAmountCV: 0,
      uniqueContacts: 0,
      totalInvoices: 0,
      medianAmount: 0,
      amountSpread: 0,
      hasRecurringPattern: false,
    };
  }

  // Group by contact
  const contactInvoices = new Map<string, number[]>();
  for (const inv of invoices) {
    if (!contactInvoices.has(inv.contact_id)) {
      contactInvoices.set(inv.contact_id, []);
    }
    contactInvoices.get(inv.contact_id)!.push(Math.abs(inv.amount));
  }

  const uniqueContacts = contactInvoices.size;
  const totalInvoices = invoices.length;
  const avgInvoicesPerContact = uniqueContacts > 0 ? totalInvoices / uniqueContacts : 0;

  // Amount statistics
  const amounts = invoices.map(i => Math.abs(i.amount)).filter(a => a > 0);
  amounts.sort((a, b) => a - b);

  const medianAmount = amounts.length > 0
    ? amounts[Math.floor(amounts.length / 2)]
    : 0;

  const mean = amounts.length > 0
    ? amounts.reduce((a, b) => a + b, 0) / amounts.length
    : 0;
  const variance = amounts.length > 0
    ? amounts.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / amounts.length
    : 0;
  const stdDev = Math.sqrt(variance);
  const invoiceAmountCV = mean > 0 ? stdDev / mean : 0;

  const amountSpread = amounts.length >= 2
    ? amounts[amounts.length - 1] / amounts[0]
    : 1;

  // Check for recurring pattern (consistent amounts per contact)
  let recurringCount = 0;
  for (const [, contactAmounts] of contactInvoices.entries()) {
    if (contactAmounts.length >= 2) {
      const contactMean = contactAmounts.reduce((a, b) => a + b, 0) / contactAmounts.length;
      const contactCV = contactMean > 0
        ? Math.sqrt(contactAmounts.reduce((s, v) => s + Math.pow(v - contactMean, 2), 0) / contactAmounts.length) / contactMean
        : 0;
      if (contactCV < 0.1) recurringCount++; // Very consistent amounts
    }
  }
  const hasRecurringPattern = uniqueContacts > 0 && recurringCount / uniqueContacts > 0.5;

  return {
    avgInvoicesPerContact,
    invoiceAmountCV,
    uniqueContacts,
    totalInvoices,
    medianAmount,
    amountSpread,
    hasRecurringPattern,
  };
}

function classifyFromStats(stats: InvoiceStats): {
  modelType: RevenueModelType;
  confidence: number;
  signals: string[];
} {
  const signals: string[] = [];

  signals.push(`${stats.uniqueContacts} unique contacts, ${stats.totalInvoices} invoices`);
  signals.push(`Avg ${stats.avgInvoicesPerContact.toFixed(1)} invoices per contact`);
  signals.push(`Invoice amount CV: ${stats.invoiceAmountCV.toFixed(2)}`);

  // Subscription: recurring pattern, consistent amounts, monthly frequency
  if (stats.hasRecurringPattern && stats.invoiceAmountCV < 0.3) {
    signals.push('Recurring pattern detected with consistent amounts');
    return { modelType: 'subscription', confidence: 0.8, signals };
  }

  // Project-based: few contacts, many invoices per contact, high amount variation
  if (stats.avgInvoicesPerContact > 3 && stats.invoiceAmountCV > 0.5) {
    signals.push('High invoices-per-contact with varied amounts → project-based');
    return { modelType: 'project', confidence: 0.75, signals };
  }

  // Retail: many contacts with 1-2 invoices each, tight amount clustering
  if (stats.avgInvoicesPerContact < 2 && stats.uniqueContacts > 20 && stats.invoiceAmountCV < 0.5) {
    signals.push('Many contacts, few invoices each, tight amounts → retail');
    return { modelType: 'retail', confidence: 0.7, signals };
  }

  // Retainer: moderate contacts, monthly invoices, consistent amounts
  if (stats.avgInvoicesPerContact >= 2 && stats.avgInvoicesPerContact <= 6 && stats.invoiceAmountCV < 0.3) {
    signals.push('Regular monthly invoices with consistent amounts → retainer');
    return { modelType: 'retainer', confidence: 0.7, signals };
  }

  // Mixed or unknown
  signals.push('No clear pattern detected');
  return { modelType: 'unknown', confidence: 0.3, signals };
}

// ─── Main Detection Function ────────────────────────────────

/**
 * Detect the revenue model for an organisation.
 * Combines interview data (high confidence) with Xero invoice analysis (medium confidence).
 */
export async function detectRevenueModel(
  orgId: string,
  interviewData?: Record<string, unknown> | null
): Promise<RevenueModelProfile> {
  // Try interview data first (highest confidence)
  const interviewResult = detectFromInterview(interviewData ?? null);

  // Also analyse Xero data for additional signals
  const svc = await createUntypedServiceClient();

  // Fetch recent invoices (last 12 months)
  const { data: invoiceData } = await svc
    .from('normalised_financials')
    .select('contact_id, amount, period')
    .eq('org_id', orgId)
    .not('contact_id', 'is', null);

  const invoices = ((invoiceData ?? []) as Array<{
    contact_id: string | null;
    amount: number;
    period: string;
  }>).filter(i => i.contact_id != null) as Array<{
    contact_id: string;
    amount: number;
    period: string;
  }>;

  const stats = analyseInvoicePatterns(invoices);
  const xeroResult = invoices.length > 10 ? classifyFromStats(stats) : null;

  // Determine final model type (interview takes priority)
  let finalType: RevenueModelType;
  let confidence: number;
  let allSignals: string[] = [];

  if (interviewResult && interviewResult.confidence >= 0.7) {
    finalType = interviewResult.modelType;
    confidence = interviewResult.confidence;
    allSignals = [...interviewResult.signals];

    // Boost confidence if Xero data agrees
    if (xeroResult && xeroResult.modelType === finalType) {
      confidence = Math.min(0.95, confidence + 0.1);
      allSignals.push('Xero invoice patterns confirm interview data');
    }
  } else if (xeroResult && xeroResult.confidence >= 0.5) {
    finalType = xeroResult.modelType;
    confidence = xeroResult.confidence;
    allSignals = [...xeroResult.signals];
  } else {
    finalType = interviewResult?.modelType ?? 'unknown';
    confidence = interviewResult?.confidence ?? 0.2;
    allSignals = interviewResult?.signals ?? ['Insufficient data for classification'];
  }

  // Build profile based on detected type
  return buildProfile(finalType, confidence, allSignals, stats);
}

function buildProfile(
  modelType: RevenueModelType,
  confidence: number,
  signals: string[],
  stats?: InvoiceStats
): RevenueModelProfile {
  const base = {
    modelType,
    confidence,
    signals,
    estimatedClientCount: stats?.uniqueContacts,
    avgInvoicesPerContact: stats?.avgInvoicesPerContact,
    invoiceAmountCV: stats?.invoiceAmountCV,
  };

  switch (modelType) {
    case 'subscription':
      return {
        ...base,
        clientCountMethod: 'active_subscribers',
        aovDivisor: 'not_applicable',
        primaryKPIs: ['MRR', 'ARR', 'Churn Rate', 'LTV', 'CAC', 'NRR'],
        description: 'Subscription/recurring revenue model. Key metrics: MRR, churn, and LTV.',
      };
    case 'project':
      return {
        ...base,
        clientCountMethod: 'unique_project_clients',
        aovDivisor: 'unique_contacts',
        primaryKPIs: ['Pipeline Value', 'Backlog', 'Average Project Value', 'Win Rate', 'Utilisation'],
        description: 'Project-based revenue model. Client count = unique clients (not invoice count). AOV = revenue / unique clients.',
      };
    case 'retail':
      return {
        ...base,
        clientCountMethod: 'unique_purchasers',
        aovDivisor: 'transactions',
        primaryKPIs: ['Transaction Count', 'AOV', 'Repeat Purchase Rate', 'Basket Size', 'Conversion Rate'],
        description: 'Transactional/retail revenue model. Track transaction volume and average order value.',
      };
    case 'retainer':
      return {
        ...base,
        clientCountMethod: 'active_retainer_clients',
        aovDivisor: 'unique_contacts',
        primaryKPIs: ['Retention Rate', 'ARPC', 'Scope Growth', 'Client Lifetime', 'Utilisation'],
        description: 'Service retainer model. Track monthly retainer value and client retention.',
      };
    case 'marketplace':
      return {
        ...base,
        clientCountMethod: 'invoice_contacts',
        aovDivisor: 'transactions',
        primaryKPIs: ['GMV', 'Take Rate', 'Seller Count', 'Buyer Count', 'Transaction Volume'],
        description: 'Marketplace/platform model. Track GMV and take rate.',
      };
    case 'mixed':
      return {
        ...base,
        clientCountMethod: 'invoice_contacts',
        aovDivisor: 'invoices',
        primaryKPIs: ['Revenue by Stream', 'Margin by Stream', 'Client Count', 'AOV'],
        description: 'Mixed revenue model with multiple income streams. Break down metrics by stream.',
      };
    default:
      return {
        ...base,
        clientCountMethod: 'invoice_contacts',
        aovDivisor: 'invoices',
        primaryKPIs: ['Revenue', 'Gross Margin', 'Net Margin', 'Client Count'],
        description: 'Revenue model not yet classified. Complete an onboarding interview for accurate detection.',
      };
  }
}
