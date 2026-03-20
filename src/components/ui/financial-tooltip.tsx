'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * Static plain English definitions for common financial terms.
 * These will be upgraded to Claude API-powered personalised explanations in Sprint 7.
 */
const FINANCIAL_DEFINITIONS: Record<string, { short: string; detail: string }> = {
  revenue: {
    short: 'Total income from sales',
    detail: 'The total money your business earns from selling products or services, before any costs are deducted.',
  },
  gross_profit: {
    short: 'Revenue minus direct costs',
    detail: 'What\'s left after you subtract the direct costs of delivering your product or service (materials, direct labour, subcontractors). It shows how profitable your core offering is.',
  },
  gross_margin: {
    short: 'Gross profit as a % of revenue',
    detail: 'For every £1 of revenue, how much you keep after direct costs. A 55% gross margin means you keep 55p from every £1 earned. Higher is better.',
  },
  net_profit: {
    short: 'Revenue minus all costs',
    detail: 'What\'s left after ALL costs — direct costs, operating expenses, overheads, and tax. This is the true bottom line of your business.',
  },
  net_margin: {
    short: 'Net profit as a % of revenue',
    detail: 'For every £1 of revenue, how much ends up as actual profit. A 10% net margin means 10p of every £1 earned becomes profit.',
  },
  ebitda: {
    short: 'Earnings before interest, tax, depreciation & amortisation',
    detail: 'A measure of operating profitability that strips out financing decisions (interest), tax structure, and non-cash charges. Often used to compare businesses of different sizes.',
  },
  operating_margin: {
    short: 'Operating profit as a % of revenue',
    detail: 'How much profit your business generates from its core operations, as a percentage of revenue. Excludes interest and tax.',
  },
  burn_rate: {
    short: 'Monthly cash spending',
    detail: 'How much cash your business spends per month when it\'s losing money. Lower burn rate = more time before running out of cash.',
  },
  cash_runway: {
    short: 'Months of cash remaining',
    detail: 'How many months your business can continue operating at the current burn rate before running out of cash. Calculated as: cash balance ÷ monthly burn rate.',
  },
  ar_days: {
    short: 'Average days to collect payment',
    detail: 'How long it typically takes customers to pay you after you invoice them. Also called DSO (Days Sales Outstanding). Lower is better — it means you\'re collecting cash faster.',
  },
  ap_days: {
    short: 'Average days to pay suppliers',
    detail: 'How long you typically take to pay your suppliers. Also called DPO (Days Payable Outstanding). Managing this well helps cash flow.',
  },
  working_capital: {
    short: 'Short-term financial health',
    detail: 'Current assets minus current liabilities. Positive working capital means you can cover short-term obligations. Negative working capital is a warning sign.',
  },
  current_ratio: {
    short: 'Ability to pay short-term debts',
    detail: 'Current assets divided by current liabilities. Above 1.0 means you can cover short-term debts. Below 1.0 is a liquidity risk.',
  },
  revenue_growth: {
    short: 'Revenue change vs last period',
    detail: 'The percentage increase or decrease in revenue compared to the previous period. Shows whether your business is growing or shrinking.',
  },
  opex_ratio: {
    short: 'Operating costs as a % of revenue',
    detail: 'How much of your revenue goes to operating expenses (rent, salaries, marketing, etc.). Lower is more efficient.',
  },
  revenue_per_employee: {
    short: 'Revenue divided by headcount',
    detail: 'How much revenue each employee generates on average. A measure of team productivity and operational efficiency.',
  },
  expenses: {
    short: 'All operating costs',
    detail: 'The total cost of running your business — salaries, rent, marketing, insurance, software, travel, and all other overhead costs.',
  },
  cost_of_sales: {
    short: 'Direct costs of delivering your product/service',
    detail: 'Costs directly tied to producing what you sell — materials, direct labour, subcontractor costs. Also called COGS (Cost of Goods Sold).',
  },
  variance: {
    short: 'Difference between actual and expected',
    detail: 'The gap between what actually happened and what was budgeted, forecast, or expected. Favourable variances (green) are good; unfavourable (red) need attention.',
  },
};

interface FinancialTooltipProps {
  term: string;
  children?: React.ReactNode;
  className?: string;
}

export function FinancialTooltip({ term, children, className = '' }: FinancialTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const key = term.toLowerCase().replace(/\s+/g, '_');
  const definition = FINANCIAL_DEFINITIONS[key];

  if (!definition) {
    return <>{children || term}</>;
  }

  return (
    <span className={`relative inline-flex items-center gap-1 ${className}`}>
      {children || term}
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="inline-flex text-muted-foreground hover:text-foreground transition-colors"
        aria-label={`Explain ${term}`}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      {showTooltip && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-lg border bg-popover p-3 shadow-lg">
          <p className="text-sm font-medium">{term}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{definition.short}</p>
          <p className="mt-1.5 text-xs leading-relaxed">{definition.detail}</p>
        </div>
      )}
    </span>
  );
}

/**
 * Get the plain English definition for a financial term.
 * Returns null if the term is not in the dictionary.
 */
export function getFinancialDefinition(term: string): { short: string; detail: string } | null {
  const key = term.toLowerCase().replace(/\s+/g, '_');
  return FINANCIAL_DEFINITIONS[key] ?? null;
}
