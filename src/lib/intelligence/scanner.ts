import { createEvent } from './events';
import type { IntelligenceEvent, IntelligenceSeverity } from '@/types';

type SeedEvent = Omit<IntelligenceEvent, 'id' | 'created_at'>;

/**
 * Seed events for MVP. In production these would come from
 * real APIs (BoE, ONS, Companies House, sector news feeds).
 * This function is a manual trigger — Inngest will automate later.
 */
const SEED_EVENTS: SeedEvent[] = [
  {
    event_type: 'interest_rate',
    title: 'Bank of England raises base rate to 5.25%',
    summary:
      'The MPC voted 6-3 to increase the base rate by 0.25 percentage points to 5.25%, citing persistent inflationary pressures. This is the fourteenth consecutive rise and affects variable rate borrowing across all sectors.',
    source: 'Bank of England',
    severity: 'high',
    sectors_affected: ['all'],
    countries_affected: ['GB'],
    published_at: new Date().toISOString(),
  },
  {
    event_type: 'regulation',
    title: 'New HMRC Making Tax Digital requirements for small businesses',
    summary:
      'HMRC has confirmed that all VAT-registered businesses must now use MTD-compatible software for quarterly submissions. Non-compliance may result in penalties from the next tax quarter.',
    source: 'HMRC',
    severity: 'medium',
    sectors_affected: ['all'],
    countries_affected: ['GB'],
    published_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    event_type: 'sector_news',
    title: 'Technology sector hiring slowdown continues in Q1',
    summary:
      'UK tech hiring fell 15% year-on-year in Q1 according to the Tech Nation report. Startups are particularly affected with average time-to-hire increasing to 45 days. Cost-per-hire has risen 20% as competition for senior roles intensifies.',
    source: 'Tech Nation',
    severity: 'medium',
    sectors_affected: ['technology', 'saas', 'fintech'],
    countries_affected: ['GB'],
    published_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    event_type: 'economic_indicator',
    title: 'UK inflation falls to 3.4%, lowest in 18 months',
    summary:
      'CPI inflation dropped to 3.4% in the latest ONS release, down from 4.0% the previous month. Food prices remain elevated at 6.1% annual growth, while energy costs have stabilised. This may signal a pause in rate rises.',
    source: 'ONS',
    severity: 'medium',
    sectors_affected: ['all'],
    countries_affected: ['GB'],
    published_at: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    event_type: 'supply_chain',
    title: 'Red Sea shipping disruptions increase freight costs by 30%',
    summary:
      'Continued Houthi attacks on commercial shipping have forced major carriers to reroute via the Cape of Good Hope, adding 10-14 days to Asia-Europe journeys. Freight costs for 40ft containers have risen from $2,500 to $3,250. Retailers and manufacturers with Asian supply chains are most affected.',
    source: 'Drewry Shipping',
    severity: 'high',
    sectors_affected: ['retail', 'ecommerce', 'manufacturing'],
    countries_affected: ['GB', 'EU'],
    published_at: new Date(Date.now() - 345600000).toISOString(),
  },
  {
    event_type: 'funding',
    title: 'British Business Bank launches £500m Growth Guarantee Scheme',
    summary:
      'The BBB has opened applications for its new Growth Guarantee Scheme, offering government-backed loans of up to £2m for businesses with turnover under £45m. Interest rates are capped at 12% and terms range from 3 months to 6 years.',
    source: 'British Business Bank',
    severity: 'low',
    sectors_affected: ['all'],
    countries_affected: ['GB'],
    published_at: new Date(Date.now() - 432000000).toISOString(),
  },

  // ── UK Compliance Events ────────────────────────────────────────
  {
    event_type: 'regulation',
    title: 'UK VAT registration threshold remains at £90,000',
    summary:
      'The VAT registration threshold is £90,000 (from 1 April 2024). Businesses whose taxable turnover exceeds this in any rolling 12-month period must register for VAT. The deregistration threshold is £88,000. Monitor your rolling 12-month turnover closely as you approach the threshold.',
    source: 'HMRC',
    severity: 'medium',
    sectors_affected: ['all'],
    countries_affected: ['GB'],
    published_at: new Date(Date.now() - 518400000).toISOString(),
  },
  {
    event_type: 'regulation',
    title: 'Corporation Tax: marginal relief applies between £50k–£250k profits',
    summary:
      'The main rate of Corporation Tax is 25% for profits above £250,000. The small profits rate of 19% applies to profits up to £50,000. Between these limits, marginal relief applies (fraction 3/200). Limits are divided by the number of associated companies. Ensure your tax provision uses the correct rate for your profit level.',
    source: 'HMRC',
    severity: 'medium',
    sectors_affected: ['all'],
    countries_affected: ['GB'],
    published_at: new Date(Date.now() - 604800000).toISOString(),
  },
  {
    event_type: 'regulation',
    title: 'Confirmation Statement due annually at Companies House',
    summary:
      'Every UK company must file a Confirmation Statement at least once every 12 months. The deadline is 14 days after the review period ends. Failure to file is a criminal offence and Companies House may begin strike-off proceedings. The fee is £13 online or £40 by post.',
    source: 'Companies House',
    severity: 'medium',
    sectors_affected: ['all'],
    countries_affected: ['GB'],
    published_at: new Date(Date.now() - 691200000).toISOString(),
  },
  {
    event_type: 'regulation',
    title: 'Making Tax Digital for Income Tax delayed to April 2026',
    summary:
      'HMRC has confirmed that MTD for Income Tax Self Assessment will be mandatory from April 2026 for self-employed individuals and landlords with income over £50,000. Those with income over £30,000 will follow from April 2027. All VAT-registered businesses must already use MTD-compatible software for quarterly VAT returns.',
    source: 'HMRC',
    severity: 'low',
    sectors_affected: ['all'],
    countries_affected: ['GB'],
    published_at: new Date(Date.now() - 777600000).toISOString(),
  },
];

/**
 * Scan for new events. For MVP, seeds the database with example events.
 * Returns the created events.
 */
export async function scanForEvents(): Promise<IntelligenceEvent[]> {
  const created: IntelligenceEvent[] = [];

  for (const seed of SEED_EVENTS) {
    try {
      const event = await createEvent(seed);
      created.push(event);
    } catch (err) {
      // Event may already exist — skip duplicates
      console.warn(`[SCANNER] Skipping event: ${(err as Error).message}`);
    }
  }

  return created;
}

/**
 * Get the list of available seed events (for UI preview).
 */
export function getSeedEvents(): SeedEvent[] {
  return SEED_EVENTS;
}
