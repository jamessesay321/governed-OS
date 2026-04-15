/**
 * Demo Data Generator
 * Generates comprehensive, realistic financial data for demo mode.
 * Uses the LLM for text content (descriptions, insights, commentary)
 * and deterministic logic for financial numbers (more reliable).
 */

import { createServiceClient } from '@/lib/supabase/server';

// ── Types ──────────────────────────────────────────────────────────────

interface DemoInput {
  orgId: string;
  companyName: string;
  industry: string;
  teamSize: string;
  revenueRange?: string;
  websiteUrl?: string;
  socialUrl?: string;
}

interface DemoProfile {
  description: string;
  goals: string;
  challenges: string;
}

interface AccountDef {
  code: string;
  name: string;
  type: string;
  class: string;
}

interface MonthlyFinancials {
  period: string; // YYYY-MM-01
  accounts: { code: string; amount: number; txCount: number }[];
}

// ── Revenue baselines by range ─────────────────────────────────────────

const ANNUAL_REVENUE: Record<string, number> = {
  'pre-revenue': 30000,
  '0-100k': 75000,
  '100k-500k': 300000,
  '500k-1m': 750000,
  '1m-5m': 2500000,
  '5m-10m': 7500000,
  '10m+': 15000000,
};

function getBaseRevenue(revenueRange?: string, teamSize?: string): number {
  if (revenueRange && ANNUAL_REVENUE[revenueRange]) {
    return ANNUAL_REVENUE[revenueRange];
  }
  // Estimate from team size
  const sizeMap: Record<string, number> = {
    '1-10': 350000,
    '11-50': 1500000,
    '51-200': 5000000,
    '200+': 12000000,
  };
  return sizeMap[teamSize || '11-50'] || 1500000;
}

// ── Industry cost profiles ─────────────────────────────────────────────

interface CostProfile {
  cogsPercent: number;      // Cost of goods sold as % of revenue
  staffPercent: number;     // Staff costs as % of revenue
  rentPercent: number;      // Rent/premises as % of revenue
  marketingPercent: number; // Marketing as % of revenue
  techPercent: number;      // Technology/software as % of revenue
  adminPercent: number;     // General admin as % of revenue
  otherPercent: number;     // Other overheads as % of revenue
}

const INDUSTRY_COSTS: Record<string, CostProfile> = {
  'technology': { cogsPercent: 0.20, staffPercent: 0.40, rentPercent: 0.05, marketingPercent: 0.12, techPercent: 0.08, adminPercent: 0.04, otherPercent: 0.03 },
  'retail': { cogsPercent: 0.55, staffPercent: 0.15, rentPercent: 0.08, marketingPercent: 0.06, techPercent: 0.02, adminPercent: 0.03, otherPercent: 0.03 },
  'professional-services': { cogsPercent: 0.10, staffPercent: 0.50, rentPercent: 0.06, marketingPercent: 0.05, techPercent: 0.04, adminPercent: 0.05, otherPercent: 0.03 },
  'hospitality': { cogsPercent: 0.35, staffPercent: 0.30, rentPercent: 0.10, marketingPercent: 0.04, techPercent: 0.02, adminPercent: 0.03, otherPercent: 0.04 },
  'healthcare': { cogsPercent: 0.25, staffPercent: 0.40, rentPercent: 0.08, marketingPercent: 0.04, techPercent: 0.05, adminPercent: 0.04, otherPercent: 0.03 },
  'creative-agency': { cogsPercent: 0.15, staffPercent: 0.45, rentPercent: 0.06, marketingPercent: 0.08, techPercent: 0.06, adminPercent: 0.04, otherPercent: 0.03 },
  'construction': { cogsPercent: 0.55, staffPercent: 0.20, rentPercent: 0.04, marketingPercent: 0.03, techPercent: 0.02, adminPercent: 0.04, otherPercent: 0.04 },
  'fashion': { cogsPercent: 0.40, staffPercent: 0.18, rentPercent: 0.08, marketingPercent: 0.10, techPercent: 0.04, adminPercent: 0.04, otherPercent: 0.03 },
  // Bespoke fashion (couture, atelier): low material cost, very high labour. Calibrated from Alonuko draft accounts FY25.
  'bespoke-fashion': { cogsPercent: 0.26, staffPercent: 0.54, rentPercent: 0.05, marketingPercent: 0.04, techPercent: 0.02, adminPercent: 0.08, otherPercent: 0.18 },
  'education': { cogsPercent: 0.15, staffPercent: 0.45, rentPercent: 0.08, marketingPercent: 0.06, techPercent: 0.06, adminPercent: 0.04, otherPercent: 0.03 },
  'other': { cogsPercent: 0.30, staffPercent: 0.30, rentPercent: 0.06, marketingPercent: 0.06, techPercent: 0.04, adminPercent: 0.04, otherPercent: 0.04 },
};

// ── Chart of accounts template ─────────────────────────────────────────

const DEMO_ACCOUNTS: AccountDef[] = [
  // Revenue
  { code: '200', name: 'Sales Revenue', type: 'REVENUE', class: 'REVENUE' },
  { code: '210', name: 'Service Revenue', type: 'REVENUE', class: 'REVENUE' },
  { code: '220', name: 'Other Income', type: 'OTHERINCOME', class: 'REVENUE' },
  // Cost of Sales
  { code: '300', name: 'Cost of Goods Sold', type: 'DIRECTCOSTS', class: 'DIRECTCOSTS' },
  { code: '310', name: 'Direct Materials', type: 'DIRECTCOSTS', class: 'DIRECTCOSTS' },
  { code: '320', name: 'Direct Labour', type: 'DIRECTCOSTS', class: 'DIRECTCOSTS' },
  // Operating Expenses
  { code: '400', name: 'Staff Costs', type: 'EXPENSE', class: 'EXPENSE' },
  { code: '410', name: 'Rent & Premises', type: 'EXPENSE', class: 'EXPENSE' },
  { code: '420', name: 'Marketing & Advertising', type: 'EXPENSE', class: 'EXPENSE' },
  { code: '430', name: 'Technology & Software', type: 'EXPENSE', class: 'EXPENSE' },
  // Overheads
  { code: '500', name: 'General & Admin', type: 'OVERHEADS', class: 'OVERHEADS' },
  { code: '510', name: 'Professional Fees', type: 'OVERHEADS', class: 'OVERHEADS' },
  { code: '520', name: 'Insurance', type: 'OVERHEADS', class: 'OVERHEADS' },
  { code: '530', name: 'Travel & Entertainment', type: 'OVERHEADS', class: 'OVERHEADS' },
  { code: '540', name: 'Depreciation', type: 'OVERHEADS', class: 'OVERHEADS' },
  { code: '550', name: 'Utilities', type: 'OVERHEADS', class: 'OVERHEADS' },
];

// ── Deterministic seeded random ────────────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function hashStr(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// ── Generate 12 months of financial data ───────────────────────────────

function generateMonthlyFinancials(
  input: DemoInput,
): MonthlyFinancials[] {
  const annualRevenue = getBaseRevenue(input.revenueRange, input.teamSize);
  const costs = INDUSTRY_COSTS[input.industry] || INDUSTRY_COSTS['other'];
  const rand = seededRandom(hashStr(input.orgId + input.companyName));
  const months: MonthlyFinancials[] = [];

  // Generate 12 months ending this month
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const period = d.toISOString().slice(0, 10); // YYYY-MM-01 (already 01 from constructor)

    // Seasonal factor: slight dip in summer, bump in Q4
    const month = d.getMonth();
    const seasonal = [0.90, 0.88, 0.95, 1.0, 1.02, 0.92, 0.85, 0.88, 1.0, 1.08, 1.15, 1.10][month];
    // Growth trend: 0.5-1.5% monthly growth
    const growthFactor = 1 + (11 - i) * 0.008;

    const monthlyRevBase = (annualRevenue / 12) * seasonal * growthFactor;

    // Add some randomness (+-10%)
    const vary = () => 0.9 + rand() * 0.2;

    const salesRev = monthlyRevBase * 0.75 * vary();
    const serviceRev = monthlyRevBase * 0.22 * vary();
    const otherIncome = monthlyRevBase * 0.03 * vary();
    const totalRev = salesRev + serviceRev + otherIncome;

    const accounts = [
      // Revenue (positive amounts)
      { code: '200', amount: round2(salesRev), txCount: 15 + Math.floor(rand() * 30) },
      { code: '210', amount: round2(serviceRev), txCount: 5 + Math.floor(rand() * 15) },
      { code: '220', amount: round2(otherIncome), txCount: 1 + Math.floor(rand() * 5) },
      // Cost of Sales (negative amounts, split across COGS accounts)
      { code: '300', amount: round2(-totalRev * costs.cogsPercent * 0.6 * vary()), txCount: 8 + Math.floor(rand() * 12) },
      { code: '310', amount: round2(-totalRev * costs.cogsPercent * 0.25 * vary()), txCount: 3 + Math.floor(rand() * 8) },
      { code: '320', amount: round2(-totalRev * costs.cogsPercent * 0.15 * vary()), txCount: 2 + Math.floor(rand() * 5) },
      // Operating Expenses
      { code: '400', amount: round2(-totalRev * costs.staffPercent * vary()), txCount: 1 + Math.floor(rand() * 3) },
      { code: '410', amount: round2(-totalRev * costs.rentPercent * vary()), txCount: 1 + Math.floor(rand() * 2) },
      { code: '420', amount: round2(-totalRev * costs.marketingPercent * vary()), txCount: 3 + Math.floor(rand() * 8) },
      { code: '430', amount: round2(-totalRev * costs.techPercent * vary()), txCount: 2 + Math.floor(rand() * 5) },
      // Overheads
      { code: '500', amount: round2(-totalRev * costs.adminPercent * vary()), txCount: 4 + Math.floor(rand() * 8) },
      { code: '510', amount: round2(-totalRev * 0.02 * vary()), txCount: 1 + Math.floor(rand() * 3) },
      { code: '520', amount: round2(-totalRev * 0.01 * vary()), txCount: 1 },
      { code: '530', amount: round2(-totalRev * 0.015 * vary()), txCount: 2 + Math.floor(rand() * 5) },
      { code: '540', amount: round2(-totalRev * 0.01 * vary()), txCount: 1 },
      { code: '550', amount: round2(-totalRev * 0.008 * vary()), txCount: 1 + Math.floor(rand() * 2) },
    ];

    months.push({ period, accounts });
  }

  return months;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ── KPI generation ─────────────────────────────────────────────────────

function generateKPIs(
  input: DemoInput,
  monthlyData: MonthlyFinancials[],
): Array<{
  period: string;
  metric_key: string;
  metric_label: string;
  value: number;
  unit: string;
  category: string;
  source: string;
  target_value: number | null;
  previous_value: number | null;
}> {
  const kpis: Array<{
    period: string;
    metric_key: string;
    metric_label: string;
    value: number;
    unit: string;
    category: string;
    source: string;
    target_value: number | null;
    previous_value: number | null;
  }> = [];

  const rand = seededRandom(hashStr(input.orgId + 'kpi'));

  for (let mi = 0; mi < monthlyData.length; mi++) {
    const m = monthlyData[mi];
    const rev = m.accounts.filter(a => a.code.startsWith('2')).reduce((s, a) => s + a.amount, 0);
    const cogs = Math.abs(m.accounts.filter(a => a.code.startsWith('3')).reduce((s, a) => s + a.amount, 0));
    const expenses = Math.abs(m.accounts.filter(a => a.code >= '400').reduce((s, a) => s + a.amount, 0));
    const netProfit = rev - cogs - expenses;
    const grossMargin = rev > 0 ? ((rev - cogs) / rev) * 100 : 0;
    const netMargin = rev > 0 ? (netProfit / rev) * 100 : 0;

    const prevRev = mi > 0
      ? monthlyData[mi - 1].accounts.filter(a => a.code.startsWith('2')).reduce((s, a) => s + a.amount, 0)
      : null;

    const kpiDefs: Array<{
      key: string;
      label: string;
      value: number;
      unit: string;
      category: string;
      target: number | null;
    }> = [
      { key: 'monthly_revenue', label: 'Monthly Revenue', value: round2(rev), unit: 'GBP', category: 'revenue', target: round2(rev * 1.1) },
      { key: 'gross_margin', label: 'Gross Margin', value: round2(grossMargin), unit: 'percent', category: 'profitability', target: round2(grossMargin + 3) },
      { key: 'net_margin', label: 'Net Margin', value: round2(netMargin), unit: 'percent', category: 'profitability', target: round2(netMargin + 5) },
      { key: 'net_profit', label: 'Net Profit', value: round2(netProfit), unit: 'GBP', category: 'profitability', target: round2(netProfit * 1.15) },
      { key: 'operating_expenses', label: 'Operating Expenses', value: round2(expenses), unit: 'GBP', category: 'costs', target: round2(expenses * 0.95) },
      { key: 'cash_runway', label: 'Cash Runway', value: round2(3 + rand() * 9), unit: 'months', category: 'cash', target: 12 },
      { key: 'burn_rate', label: 'Monthly Burn Rate', value: round2(Math.max(0, expenses - rev) || expenses * 0.1), unit: 'GBP', category: 'cash', target: null },
      { key: 'revenue_growth', label: 'Revenue Growth', value: prevRev ? round2(((rev - prevRev) / prevRev) * 100) : 0, unit: 'percent', category: 'growth', target: 5 },
    ];

    for (const kpi of kpiDefs) {
      kpis.push({
        period: m.period,
        metric_key: kpi.key,
        metric_label: kpi.label,
        value: kpi.value,
        unit: kpi.unit,
        category: kpi.category,
        source: 'demo',
        target_value: kpi.target,
        previous_value: prevRev !== null && kpi.key === 'monthly_revenue' ? round2(prevRev) : null,
      });
    }
  }

  return kpis;
}

// ── Budget generation ──────────────────────────────────────────────────

function generateBudgetLines(
  input: DemoInput,
  monthlyData: MonthlyFinancials[],
): Array<{
  period: string;
  account_code: string;
  account_name: string;
  category: string;
  budgeted_amount: number;
  currency: string;
  notes: string;
  version: number;
}> {
  const budgets: Array<{
    period: string;
    account_code: string;
    account_name: string;
    category: string;
    budgeted_amount: number;
    currency: string;
    notes: string;
    version: number;
  }> = [];
  const accountMap = new Map(DEMO_ACCOUNTS.map(a => [a.code, a]));

  for (const m of monthlyData) {
    for (const entry of m.accounts) {
      const acc = accountMap.get(entry.code);
      if (!acc) continue;

      // Budget is slightly higher than actual for revenue, slightly lower for costs
      const isRevenue = acc.class === 'REVENUE';
      const budgetMultiplier = isRevenue ? 1.05 : 0.95;

      budgets.push({
        period: m.period,
        account_code: entry.code,
        account_name: acc.name,
        category: acc.class.toLowerCase(),
        budgeted_amount: round2(entry.amount * budgetMultiplier),
        currency: 'GBP',
        notes: `FY budget for ${acc.name}`,
        version: 1,
      });
    }
  }

  return budgets;
}

// ── Business profile (LLM or fallback) ─────────────────────────────────

const INDUSTRY_TEMPLATES: Record<string, DemoProfile> = {
  'technology': {
    description: 'A growing technology company building software solutions for businesses. We focus on delivering reliable, user-friendly products that help our customers work more efficiently.',
    goals: 'Scale to 100 paying customers this quarter, improve product retention to 90%, and prepare for our first funding round.',
    challenges: 'Managing cash burn while growing, hiring senior engineers in a competitive market, and balancing feature development with technical debt.',
  },
  'retail': {
    description: 'An established retail business selling quality products both online and through our physical stores. We pride ourselves on great customer service and carefully curated inventory.',
    goals: 'Grow online sales by 30% this year, expand to two new locations, and improve inventory turnover by 15%.',
    challenges: 'Rising supplier costs, increasing competition from online-only retailers, and managing seasonal cash flow fluctuations.',
  },
  'professional-services': {
    description: 'A professional services firm delivering expert consulting and advisory work to mid-market businesses. Our team brings deep industry knowledge and a hands-on approach.',
    goals: 'Increase average project value by 20%, build recurring revenue streams, and expand into two new service areas.',
    challenges: 'Client concentration risk, recruiting and retaining top talent, and managing utilisation rates across the team.',
  },
  'hospitality': {
    description: 'A hospitality business focused on creating memorable experiences for our guests. We combine great food, atmosphere, and service to build a loyal customer base.',
    goals: 'Increase average spend per customer, launch a catering arm, and improve our online reviews to 4.8 stars average.',
    challenges: 'Staff retention in a competitive market, managing food costs with rising supplier prices, and seasonal demand variability.',
  },
  'healthcare': {
    description: 'A healthcare provider committed to delivering high-quality patient care. We combine clinical excellence with a compassionate, patient-first approach.',
    goals: 'Expand our service offering, reduce patient wait times by 25%, and achieve CQC outstanding rating.',
    challenges: 'Regulatory compliance costs, recruiting specialist clinicians, and managing the transition to digital patient records.',
  },
  'creative-agency': {
    description: 'A creative agency helping brands tell their stories through design, digital, and marketing. We work with ambitious businesses who want to stand out.',
    goals: 'Win 5 new retainer clients, launch our own product line, and grow the team to 15 people by year end.',
    challenges: 'Scope creep on projects, feast-or-famine revenue cycles, and keeping up with rapidly changing digital platforms.',
  },
  'construction': {
    description: 'A construction and building services company delivering quality projects on time and on budget. We specialise in commercial fit-outs and residential developments.',
    goals: 'Grow revenue to £2M, achieve a 15% net margin, and reduce project overruns to under 5% of jobs.',
    challenges: 'Material cost inflation, subcontractor availability, and managing cash flow across multiple concurrent projects.',
  },
  'fashion': {
    description: 'A fashion brand creating distinctive pieces that blend craftsmanship with contemporary design. We sell through our own channels and select retail partners.',
    goals: 'Launch our international e-commerce store, grow wholesale partnerships by 40%, and improve gross margins to 70%.',
    challenges: 'Seasonal inventory management, building brand awareness in a crowded market, and managing the complexity of multi-channel sales.',
  },
  'education': {
    description: 'An education and training provider helping individuals and organisations develop new skills. We offer both in-person and online learning experiences.',
    goals: 'Double our online course enrolments, achieve 95% learner satisfaction, and build corporate training partnerships.',
    challenges: 'Competition from free online platforms, keeping content current, and maintaining engagement in hybrid learning formats.',
  },
};

async function generateDemoProfile(
  input: DemoInput,
): Promise<DemoProfile> {
  try {
    const { callLLM } = await import('@/lib/ai/llm');

    const contextParts = [`${input.companyName} is a ${input.industry} company with ${input.teamSize} employees.`];
    if (input.revenueRange) contextParts.push(`Annual turnover: ${input.revenueRange}.`);
    if (input.websiteUrl) contextParts.push(`Website: ${input.websiteUrl}`);
    if (input.socialUrl) contextParts.push(`Social media: ${input.socialUrl}`);

    const result = await callLLM({
      systemPrompt: `You generate realistic business profile data for demo purposes. Return ONLY a JSON object with three fields: "description" (2-3 sentences about the company), "goals" (2-3 key business goals), "challenges" (2-3 current challenges). Use plain English, warm and professional tone. No em dashes. No jargon.`,
      userMessage: `Generate a realistic business profile for: ${contextParts.join(' ')} Return only the JSON object.`,
      temperature: 0.7,
    });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.description && parsed.goals && parsed.challenges) {
        return {
          description: String(parsed.description).slice(0, 500),
          goals: String(parsed.goals).slice(0, 500),
          challenges: String(parsed.challenges).slice(0, 500),
        };
      }
    }
  } catch (err) {
    console.error('[DEMO] LLM profile generation failed, using template:', err);
  }

  const template = INDUSTRY_TEMPLATES[input.industry] || INDUSTRY_TEMPLATES['technology'];
  return {
    description: template.description.replace(/^A /, `${input.companyName} is a `),
    goals: template.goals,
    challenges: template.challenges,
  };
}

// ── Playbook actions (governance) ──────────────────────────────────────

function generatePlaybookActions(input: DemoInput): Array<{
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  sort_order: number;
}> {
  return [
    { title: 'Set up monthly financial review cadence', description: 'Schedule a recurring monthly meeting to review P&L, cash flow, and KPIs. Invite key stakeholders and set an agenda template.', category: 'financial_discipline', priority: 'high', status: 'pending', sort_order: 1 },
    { title: 'Define KPI targets for this quarter', description: 'Review each KPI and set realistic but ambitious targets based on recent performance and business goals.', category: 'performance', priority: 'high', status: 'in_progress', sort_order: 2 },
    { title: 'Review and approve annual budget', description: 'Walk through the budget line by line, check assumptions against market conditions, and sign off on the final version.', category: 'budgeting', priority: 'critical', status: 'pending', sort_order: 3 },
    { title: 'Create a cash flow forecast', description: 'Build a 13-week rolling cash flow forecast to identify any upcoming shortfalls and plan ahead.', category: 'cash_management', priority: 'high', status: 'completed', sort_order: 4 },
    { title: 'Run a scenario analysis on key risks', description: 'Model your top 3 business risks (e.g. losing a key client, cost increase, delayed payment) and understand the financial impact.', category: 'risk_management', priority: 'medium', status: 'pending', sort_order: 5 },
    { title: 'Document your chart of accounts', description: 'Make sure every account is properly categorised and labelled so reporting is clean and consistent.', category: 'financial_discipline', priority: 'medium', status: 'completed', sort_order: 6 },
    { title: 'Set up expense approval workflows', description: 'Define who can approve expenses at each level and automate the routing to speed up the process.', category: 'controls', priority: 'medium', status: 'pending', sort_order: 7 },
    { title: 'Schedule a board pack review', description: 'Prepare your first board pack with financial statements, KPIs, and commentary. Get feedback from advisors before sending.', category: 'governance', priority: 'low', status: 'pending', sort_order: 8 },
  ];
}

// ── Main entry point ───────────────────────────────────────────────────

export async function generateAllDemoData(input: DemoInput): Promise<void> {
  // Use `any` cast on the service client to bypass strict Supabase types
  // for tables that may not be in the generated types yet (e.g. post-migration columns)
  const supabase = await createServiceClient() as any;
  const { orgId } = input;

  // 1. Generate business profile (uses LLM)
  const profile = await generateDemoProfile(input);

  // 2. Generate financial numbers (deterministic)
  const monthlyData = generateMonthlyFinancials(input);

  // 3. Generate KPIs
  const kpis = generateKPIs(input, monthlyData);

  // 4. Generate budgets
  const budgets = generateBudgetLines(input, monthlyData);

  // 5. Generate playbook actions
  const actions = generatePlaybookActions(input);

  // ── Insert chart of accounts ───────────────────────────────────────

  const accountIds = new Map<string, string>();

  for (const acc of DEMO_ACCOUNTS) {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .upsert({
        org_id: orgId,
        xero_account_id: `demo-${acc.code}`,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        class: acc.class,
        status: 'ACTIVE',
      }, {
        onConflict: 'org_id,xero_account_id',
      })
      .select('id')
      .single();

    if (data?.id) {
      accountIds.set(acc.code, data.id);
    } else if (error) {
      console.error(`[DEMO] Failed to upsert account ${acc.code}:`, error);
      // Try to fetch existing
      const { data: existing } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('org_id', orgId)
        .eq('code', acc.code)
        .single();
      if (existing?.id) accountIds.set(acc.code, existing.id);
    }
  }

  // ── Insert normalised financials ───────────────────────────────────

  const financialRows = monthlyData.flatMap(m =>
    m.accounts
      .filter(a => accountIds.has(a.code))
      .map(a => ({
        org_id: orgId,
        period: m.period,
        account_id: accountIds.get(a.code)!,
        amount: a.amount,
        transaction_count: a.txCount,
        source: 'demo',
      }))
  );

  if (financialRows.length > 0) {
    // Insert in batches to avoid payload limits
    const batchSize = 50;
    for (let i = 0; i < financialRows.length; i += batchSize) {
      const batch = financialRows.slice(i, i + batchSize);
      const { error } = await supabase
        .from('normalised_financials')
        .insert(batch);
      if (error) console.error('[DEMO] Failed to insert financials batch:', error);
    }
  }

  // ── Insert KPI snapshots ───────────────────────────────────────────

  if (kpis.length > 0) {
    const kpiRows = kpis.map(k => ({
      org_id: orgId,
      period: k.period,
      metric_key: k.metric_key,
      metric_label: k.metric_label,
      value: k.value,
      unit: k.unit,
      category: k.category,
      source: k.source,
      target_value: k.target_value,
      previous_value: k.previous_value,
      metadata: { demo: true },
    }));

    const batchSize = 50;
    for (let i = 0; i < kpiRows.length; i += batchSize) {
      const batch = kpiRows.slice(i, i + batchSize);
      const { error } = await supabase
        .from('kpi_snapshots')
        .insert(batch);
      if (error) console.error('[DEMO] Failed to insert KPIs batch:', error);
    }
  }

  // ── Insert budget lines ────────────────────────────────────────────

  if (budgets.length > 0) {
    const budgetRows = budgets.map(b => ({
      org_id: orgId,
      period: b.period,
      account_code: b.account_code,
      account_name: b.account_name,
      category: b.category,
      budgeted_amount: b.budgeted_amount,
      currency: b.currency,
      notes: b.notes,
      version: b.version,
    }));

    const batchSize = 50;
    for (let i = 0; i < budgetRows.length; i += batchSize) {
      const batch = budgetRows.slice(i, i + batchSize);
      const { error } = await supabase
        .from('budget_lines')
        .insert(batch);
      if (error) console.error('[DEMO] Failed to insert budgets batch:', error);
    }
  }

  // ── Insert business context profile ────────────────────────────────

  try {
    await supabase
      .from('business_context_profiles')
      .upsert({
        org_id: orgId,
        status: 'completed',
        business_model: input.industry,
        industry: input.industry,
        stage: guessStage(input.revenueRange, input.teamSize),
        employee_count: guessEmployeeCount(input.teamSize),
        revenue_range: input.revenueRange || null,
        key_challenges: profile.challenges.split(', ').map(c => c.trim()),
        growth_goals: profile.goals.split(', ').map(g => g.trim()),
        raw_interview_data: {
          company_profile: {
            companyName: input.companyName,
            industry: input.industry,
            companySize: input.teamSize,
            description: profile.description,
            goals: profile.goals,
            challenges: profile.challenges,
            websiteUrl: input.websiteUrl || null,
            socialUrl: input.socialUrl || null,
          },
          demo_mode: true,
          demo_generated_at: new Date().toISOString(),
        },
        completed_at: new Date().toISOString(),
      }, {
        onConflict: 'org_id',
      });
  } catch (err) {
    console.error('[DEMO] Failed to insert business profile:', err);
  }

  // ── Insert playbook actions ────────────────────────────────────────

  try {
    // First create a playbook assessment
    const { data: assessment } = await supabase
      .from('playbook_assessments')
      .insert({
        org_id: orgId,
        current_maturity_level: guessStage(input.revenueRange, input.teamSize),
        target_maturity_level: 'growth',
        overall_score: 42,
        category_scores: {
          financial_discipline: 55,
          performance: 40,
          budgeting: 35,
          cash_management: 60,
          risk_management: 30,
          controls: 25,
          governance: 20,
        },
        ai_recommendations: [
          'Focus on setting up a regular financial review cadence',
          'Define clear KPI targets before the next quarter',
          'Build a rolling cash flow forecast to stay ahead of shortfalls',
        ],
      })
      .select('id')
      .single();

    if (assessment?.id) {
      const actionRows = actions.map(a => ({
        org_id: orgId,
        assessment_id: assessment.id,
        title: a.title,
        description: a.description,
        category: a.category,
        priority: a.priority,
        status: a.status,
        sort_order: a.sort_order,
      }));

      const { error } = await supabase
        .from('playbook_actions')
        .insert(actionRows);
      if (error) console.error('[DEMO] Failed to insert playbook actions:', error);
    }
  } catch (err) {
    console.error('[DEMO] Failed to insert playbook data:', err);
  }

  // ── Insert a base scenario ─────────────────────────────────────────

  try {
    // Create assumption set
    const now = new Date();
    const startPeriod = monthlyData[0]?.period || now.toISOString().slice(0, 10);
    const endPeriod = monthlyData[monthlyData.length - 1]?.period || now.toISOString().slice(0, 10);

    const { data: assumptionSet } = await supabase
      .from('assumption_sets')
      .insert({
        org_id: orgId,
        name: 'Base Case Assumptions',
        description: 'Default assumptions generated from your company profile',
        version: 1,
        base_period_start: startPeriod,
        base_period_end: endPeriod,
        forecast_horizon_months: 12,
      })
      .select('id')
      .single();

    if (assumptionSet?.id) {
      // Create base scenario
      await supabase
        .from('scenarios')
        .insert({
          org_id: orgId,
          assumption_set_id: assumptionSet.id,
          name: 'Base Case',
          description: `Base financial scenario for ${input.companyName}`,
          status: 'active',
          is_base: true,
        });

      // Insert assumption values
      const costs = INDUSTRY_COSTS[input.industry] || INDUSTRY_COSTS['other'];
      const assumptions = [
        { category: 'revenue_drivers', key: 'monthly_growth_rate', label: 'Monthly Revenue Growth', type: 'percentage', value: 2.5 },
        { category: 'revenue_drivers', key: 'customer_churn', label: 'Monthly Customer Churn', type: 'percentage', value: 3.0 },
        { category: 'pricing', key: 'avg_deal_size', label: 'Average Deal Size', type: 'currency', value: round2(getBaseRevenue(input.revenueRange, input.teamSize) / 120) },
        { category: 'costs', key: 'cogs_percent', label: 'COGS as % of Revenue', type: 'percentage', value: round2(costs.cogsPercent * 100) },
        { category: 'costs', key: 'staff_cost_percent', label: 'Staff Costs as % of Revenue', type: 'percentage', value: round2(costs.staffPercent * 100) },
        { category: 'growth_rates', key: 'headcount_growth', label: 'Planned Headcount Growth', type: 'percentage', value: 15 },
        { category: 'marketing', key: 'marketing_spend_percent', label: 'Marketing as % of Revenue', type: 'percentage', value: round2(costs.marketingPercent * 100) },
      ];

      const assumptionRows = assumptions.map(a => ({
        org_id: orgId,
        assumption_set_id: assumptionSet.id,
        category: a.category,
        key: a.key,
        label: a.label,
        type: a.type,
        value: a.value,
        version: 1,
      }));

      const { error } = await supabase
        .from('assumption_values')
        .insert(assumptionRows);
      if (error) console.error('[DEMO] Failed to insert assumptions:', error);
    }
  } catch (err) {
    console.error('[DEMO] Failed to insert scenario data:', err);
  }

  // ── Insert a sync log entry (so dashboard shows data freshness) ────

  try {
    await supabase
      .from('sync_log')
      .insert({
        org_id: orgId,
        sync_type: 'demo_generation',
        status: 'completed',
        records_synced: financialRows.length,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
  } catch (err) {
    console.error('[DEMO] Failed to insert sync log:', err);
  }

  // ── Mark onboarding complete ───────────────────────────────────────

  await supabase
    .from('organisations')
    .update({
      has_completed_onboarding: true,
      onboarding_mode: 'demo',
      demo_company_name: input.companyName,
      demo_industry: input.industry,
      industry: input.industry,
      website_url: input.websiteUrl || null,
    })
    .eq('id', orgId);
}

// ── Helpers ────────────────────────────────────────────────────────────

function guessStage(revenueRange?: string, teamSize?: string): string {
  if (revenueRange === 'pre-revenue' || revenueRange === '0-100k') return 'startup';
  if (revenueRange === '100k-500k') return 'early';
  if (revenueRange === '500k-1m' || revenueRange === '1m-5m') return 'growth';
  if (revenueRange === '5m-10m' || revenueRange === '10m+') return 'scale';
  // Fallback to team size
  if (teamSize === '1-10') return 'startup';
  if (teamSize === '11-50') return 'early';
  if (teamSize === '51-200') return 'growth';
  return 'scale';
}

function guessEmployeeCount(teamSize?: string): number {
  const map: Record<string, number> = { '1-10': 6, '11-50': 25, '51-200': 100, '200+': 350 };
  return map[teamSize || '11-50'] || 25;
}

// Keep backward compat for any other callers
export { generateDemoProfile };
