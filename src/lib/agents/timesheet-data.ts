/* ------------------------------------------------------------------ */
/*  Agent Timesheet Data — mock daily activity for each AI agent       */
/* ------------------------------------------------------------------ */

export type TaskCategory = 'monitoring' | 'execution' | 'reporting' | 'analysis' | 'communication';

export interface TimesheetTask {
  id: string;
  timestamp: string;
  endTime: string;
  durationMinutes: number;
  title: string;
  description: string;
  category: TaskCategory;
  revenueImpact: number | null;
  keyAction: boolean;
}

export interface TimesheetDay {
  date: string;
  agentSlug: string;
  totalHours: number;
  tasksCompleted: number;
  revenueGenerated: number;
  keyActions: number;
  tasks: TimesheetTask[];
  dailySummary: string;
}

export const TASK_CATEGORY_CONFIG: Record<TaskCategory, { label: string; color: string; bg: string }> = {
  monitoring:    { label: 'Monitoring',    color: 'text-blue-700',    bg: 'bg-blue-50' },
  execution:     { label: 'Execution',     color: 'text-emerald-700', bg: 'bg-emerald-50' },
  reporting:     { label: 'Reporting',     color: 'text-purple-700',  bg: 'bg-purple-50' },
  analysis:      { label: 'Analysis',      color: 'text-amber-700',   bg: 'bg-amber-50' },
  communication: { label: 'Communication', color: 'text-rose-700',    bg: 'bg-rose-50' },
};

/* ------------------------------------------------------------------ */
/*  Per-agent mock data                                                */
/* ------------------------------------------------------------------ */

const SETUP_TASKS: TimesheetTask[] = [
  { id: 'su1', timestamp: '06:00', endTime: '06:15', durationMinutes: 15, title: 'Xero data import scan', description: 'Scanned Xero API for new transactions — 23 new entries since last sync', category: 'monitoring', revenueImpact: null, keyAction: false },
  { id: 'su2', timestamp: '06:20', endTime: '06:45', durationMinutes: 25, title: 'Transaction categorisation', description: 'Auto-categorised 23 transactions using machine learning — 2 flagged for review', category: 'execution', revenueImpact: null, keyAction: true },
  { id: 'su3', timestamp: '06:50', endTime: '07:10', durationMinutes: 20, title: 'Chart of accounts mapping', description: 'Verified 47 Xero account mappings — all aligned with platform categories', category: 'execution', revenueImpact: null, keyAction: false },
  { id: 'su4', timestamp: '07:15', endTime: '07:45', durationMinutes: 30, title: 'Budget baseline generation', description: 'Regenerated Q2 budget baselines from 12 months of historical data', category: 'analysis', revenueImpact: null, keyAction: true },
  { id: 'su5', timestamp: '07:50', endTime: '08:05', durationMinutes: 15, title: 'Assumption review', description: 'Validated 8 scenario assumptions against latest actuals — all within tolerance', category: 'analysis', revenueImpact: null, keyAction: false },
  { id: 'su6', timestamp: '08:10', endTime: '08:30', durationMinutes: 20, title: 'Data quality score calculation', description: 'Recalculated data quality score: 82/100 (+3 from last week)', category: 'reporting', revenueImpact: null, keyAction: true },
  { id: 'su7', timestamp: '08:35', endTime: '08:50', durationMinutes: 15, title: 'Duplicate detection', description: 'Scanned 2,400 records for duplicates — 0 new duplicates found', category: 'monitoring', revenueImpact: null, keyAction: false },
  { id: 'su8', timestamp: '09:00', endTime: '09:15', durationMinutes: 15, title: 'Missing data identification', description: 'Identified 3 missing vendor categorisations — auto-suggested categories', category: 'monitoring', revenueImpact: null, keyAction: false },
  { id: 'su9', timestamp: '09:20', endTime: '09:40', durationMinutes: 20, title: 'Reconciliation check', description: 'Cross-referenced bank feed with Xero ledger — zero discrepancies', category: 'execution', revenueImpact: null, keyAction: true },
  { id: 'su10', timestamp: '09:45', endTime: '10:00', durationMinutes: 15, title: 'Configuration summary', description: 'Generated daily configuration health report — all systems nominal', category: 'reporting', revenueImpact: null, keyAction: false },
];

const FINANCE_TASKS: TimesheetTask[] = [
  { id: 'f1', timestamp: '07:15', endTime: '07:42', durationMinutes: 27, title: 'Morning transaction scan', description: 'Scanned 84 overnight Barclays transactions — 14 flagged for review', category: 'monitoring', revenueImpact: null, keyAction: false },
  { id: 'f2', timestamp: '08:00', endTime: '08:35', durationMinutes: 35, title: 'Bank reconciliation', description: 'Reconciled 23 transactions with zero discrepancies', category: 'execution', revenueImpact: null, keyAction: true },
  { id: 'f3', timestamp: '08:40', endTime: '09:15', durationMinutes: 35, title: 'Cash flow forecast update', description: '13-week rolling forecast refreshed — runway updated to 28 weeks', category: 'analysis', revenueImpact: null, keyAction: false },
  { id: 'f4', timestamp: '09:20', endTime: '09:45', durationMinutes: 25, title: 'Daily cash position report', description: 'Generated and distributed to finance@alonuko.co.uk', category: 'reporting', revenueImpact: null, keyAction: false },
  { id: 'f5', timestamp: '10:00', endTime: '10:30', durationMinutes: 30, title: 'Duplicate invoice detection', description: 'Flagged INV-2847 as duplicate of INV-2831 — prevented double payment', category: 'monitoring', revenueImpact: 1200, keyAction: true },
  { id: 'f6', timestamp: '10:45', endTime: '11:20', durationMinutes: 35, title: 'Vendor payment processing', description: 'Processed 5 approved payments totalling £8,450', category: 'execution', revenueImpact: null, keyAction: false },
  { id: 'f7', timestamp: '11:30', endTime: '12:00', durationMinutes: 30, title: 'Spring collection margin analysis', description: 'Analysed cost structure for Spring 2026 bridal line — gross margin: 72.3%', category: 'analysis', revenueImpact: null, keyAction: false },
  { id: 'f8', timestamp: '13:00', endTime: '14:15', durationMinutes: 75, title: 'Q1 VAT return preparation', description: 'Compiled VAT summary — estimated liability: £18,200', category: 'reporting', revenueImpact: null, keyAction: true },
  { id: 'f9', timestamp: '14:30', endTime: '15:00', durationMinutes: 30, title: 'AR ageing review', description: 'Flagged 2 overdue invoices — £4,500 outstanding > 60 days', category: 'monitoring', revenueImpact: 2220, keyAction: true },
  { id: 'f10', timestamp: '15:15', endTime: '16:00', durationMinutes: 45, title: 'Chart of accounts update', description: 'Updated Xero category mappings — 3 new expense codes added', category: 'execution', revenueImpact: null, keyAction: false },
  { id: 'f11', timestamp: '16:30', endTime: '17:00', durationMinutes: 30, title: 'End-of-day financial summary', description: 'Generated board-level summary and sent to distribution list', category: 'reporting', revenueImpact: null, keyAction: false },
];

const MARKETING_TASKS: TimesheetTask[] = [
  { id: 'm1', timestamp: '07:00', endTime: '07:30', durationMinutes: 30, title: 'SEO keyword rankings refresh', description: 'Updated rankings for 45 tracked keywords — 12 improved positions', category: 'monitoring', revenueImpact: null, keyAction: false },
  { id: 'm2', timestamp: '07:45', endTime: '08:30', durationMinutes: 45, title: 'Instagram content scheduling', description: 'Scheduled 3 posts for today: trunk show BTS, client testimonial, new collection teaser', category: 'execution', revenueImpact: null, keyAction: false },
  { id: 'm3', timestamp: '08:45', endTime: '09:15', durationMinutes: 30, title: 'Lead scoring batch', description: 'Scored 18 new enquiries — 4 marked as hot leads (wedding dates within 6 months)', category: 'analysis', revenueImpact: 4800, keyAction: true },
  { id: 'm4', timestamp: '09:30', endTime: '10:00', durationMinutes: 30, title: 'Competitor price monitoring', description: 'Detected price increase from Pronovias UK — updated competitive analysis', category: 'monitoring', revenueImpact: null, keyAction: false },
  { id: 'm5', timestamp: '10:15', endTime: '11:00', durationMinutes: 45, title: 'Email campaign — Spring lookbook', description: 'Dispatched to 2,400 subscribers — personalised by wedding date', category: 'execution', revenueImpact: null, keyAction: true },
  { id: 'm6', timestamp: '11:15', endTime: '11:45', durationMinutes: 30, title: 'Pinterest boards optimisation', description: 'Updated 8 boards with trending bridal search terms for Spring 2026', category: 'execution', revenueImpact: null, keyAction: false },
  { id: 'm7', timestamp: '13:00', endTime: '13:30', durationMinutes: 30, title: 'Google Ads performance review', description: 'CPC down 12% this week — adjusted bids on "bespoke bridal London"', category: 'analysis', revenueImpact: 350, keyAction: false },
  { id: 'm8', timestamp: '13:45', endTime: '14:15', durationMinutes: 30, title: 'LinkedIn article publishing', description: 'Published thought piece: "The business of bespoke bridal" — CEO byline', category: 'communication', revenueImpact: null, keyAction: false },
  { id: 'm9', timestamp: '14:30', endTime: '15:00', durationMinutes: 30, title: 'Trunk show lead follow-up', description: 'Automated personalised follow-ups to 6 NYC trunk show contacts', category: 'communication', revenueImpact: 1200, keyAction: true },
  { id: 'm10', timestamp: '15:15', endTime: '15:45', durationMinutes: 30, title: 'Social engagement analytics', description: 'Weekly engagement report: +18% Instagram reach, 24 saved posts', category: 'reporting', revenueImpact: null, keyAction: false },
  { id: 'm11', timestamp: '16:00', endTime: '16:30', durationMinutes: 30, title: 'Content calendar update', description: 'Planned next 2 weeks of content aligned with wedding season peaks', category: 'reporting', revenueImpact: null, keyAction: false },
];

const PM_TASKS: TimesheetTask[] = [
  { id: 'p1', timestamp: '07:30', endTime: '08:00', durationMinutes: 30, title: 'Scorecard data pull', description: 'Collected weekly metrics from Xero, CRM, and project tools', category: 'monitoring', revenueImpact: null, keyAction: false },
  { id: 'p2', timestamp: '08:15', endTime: '08:45', durationMinutes: 30, title: 'Q1 rock progress update', description: 'Updated 5 quarterly rocks — 4 on track, 1 at risk (US expansion)', category: 'analysis', revenueImpact: null, keyAction: true },
  { id: 'p3', timestamp: '09:00', endTime: '09:45', durationMinutes: 45, title: 'L10 meeting agenda prep', description: 'Prepared Thursday L10 agenda — 3 IDS items queued', category: 'execution', revenueImpact: null, keyAction: true },
  { id: 'p4', timestamp: '10:00', endTime: '10:30', durationMinutes: 30, title: 'Issue tracker review', description: 'Reviewed 12 open issues — 3 escalated to leadership team', category: 'monitoring', revenueImpact: null, keyAction: false },
  { id: 'p5', timestamp: '10:45', endTime: '11:15', durationMinutes: 30, title: 'Accountability reminders', description: 'Sent deadline reminders to 3 team members for this week\'s To-Dos', category: 'communication', revenueImpact: null, keyAction: false },
  { id: 'p6', timestamp: '11:30', endTime: '12:00', durationMinutes: 30, title: 'Process documentation', description: 'Updated trunk show logistics SOP with lessons from NYC event', category: 'execution', revenueImpact: null, keyAction: false },
  { id: 'p7', timestamp: '13:00', endTime: '13:45', durationMinutes: 45, title: 'Resource allocation review', description: 'Analysed team capacity for April — flagged seamstress bottleneck', category: 'analysis', revenueImpact: null, keyAction: true },
  { id: 'p8', timestamp: '14:00', endTime: '14:30', durationMinutes: 30, title: 'Client project timeline update', description: 'Updated 8 active bridal commissions with latest milestone dates', category: 'execution', revenueImpact: null, keyAction: false },
  { id: 'p9', timestamp: '14:45', endTime: '15:15', durationMinutes: 30, title: 'Weekly team scorecard', description: 'Generated scorecard: 87% completion rate this week (target: 80%)', category: 'reporting', revenueImpact: null, keyAction: false },
  { id: 'p10', timestamp: '15:30', endTime: '16:00', durationMinutes: 30, title: 'Risk register update', description: 'Added supply chain risk — Italian silk delivery delayed 2 weeks', category: 'monitoring', revenueImpact: null, keyAction: false },
];

const STRATEGY_TASKS: TimesheetTask[] = [
  { id: 's1', timestamp: '08:00', endTime: '08:45', durationMinutes: 45, title: 'Market intelligence scan', description: 'Scanned 12 luxury bridal publications — identified 3 emerging trends', category: 'monitoring', revenueImpact: null, keyAction: false },
  { id: 's2', timestamp: '09:00', endTime: '10:00', durationMinutes: 60, title: 'Competitor analysis update', description: 'Tracked 5 competitors: new pricing from Vera Wang London, Suzanne Neville expansion', category: 'analysis', revenueImpact: null, keyAction: true },
  { id: 's3', timestamp: '10:15', endTime: '11:00', durationMinutes: 45, title: 'OKR Q1 progress review', description: 'Updated 4 company-level OKRs — revenue +18% vs target +15%', category: 'reporting', revenueImpact: null, keyAction: true },
  { id: 's4', timestamp: '11:15', endTime: '12:00', durationMinutes: 45, title: 'Board pack executive summary', description: 'Drafted 2-page summary for Q1 board meeting — revenue, margins, growth', category: 'execution', revenueImpact: null, keyAction: true },
  { id: 's5', timestamp: '13:00', endTime: '13:45', durationMinutes: 45, title: 'Investment readiness scoring', description: 'Updated score: 72/100 (+4 from last month) — data quality improving', category: 'analysis', revenueImpact: null, keyAction: false },
  { id: 's6', timestamp: '14:00', endTime: '14:30', durationMinutes: 30, title: 'US market opportunity sizing', description: 'Estimated addressable market for NY/LA trunk shows: £280K annual potential', category: 'analysis', revenueImpact: null, keyAction: false },
  { id: 's7', timestamp: '14:45', endTime: '15:15', durationMinutes: 30, title: 'Partnership pipeline review', description: 'Reviewed 3 potential hotel/venue partnerships for referral programme', category: 'monitoring', revenueImpact: null, keyAction: false },
  { id: 's8', timestamp: '15:30', endTime: '16:15', durationMinutes: 45, title: 'Pricing strategy modelling', description: 'Ran sensitivity analysis on 5% price increase — projected +£65K revenue', category: 'analysis', revenueImpact: 65000, keyAction: true },
  { id: 's9', timestamp: '16:30', endTime: '17:00', durationMinutes: 30, title: 'Weekly strategy digest', description: 'Compiled key insights and actions for leadership WhatsApp brief', category: 'communication', revenueImpact: null, keyAction: false },
];

const SECRETARIAL_TASKS: TimesheetTask[] = [
  { id: 'sec1', timestamp: '07:00', endTime: '07:30', durationMinutes: 30, title: 'Companies House deadline check', description: 'Checked all upcoming filing deadlines — confirmation statement due 15 April', category: 'monitoring', revenueImpact: null, keyAction: false },
  { id: 'sec2', timestamp: '07:45', endTime: '08:15', durationMinutes: 30, title: 'Business license audit', description: 'Verified all 4 active licences current — textile import licence renewal in 6 weeks', category: 'monitoring', revenueImpact: null, keyAction: true },
  { id: 'sec3', timestamp: '08:30', endTime: '09:00', durationMinutes: 30, title: 'Insurance policy review', description: 'Reviewed contents & liability policies — flagged US trunk show cover gap', category: 'analysis', revenueImpact: null, keyAction: true },
  { id: 'sec4', timestamp: '09:15', endTime: '09:45', durationMinutes: 30, title: 'Contract expiry alerts', description: 'Sent reminders: Mayfair lease renewal (90 days), silk supplier contract (45 days)', category: 'communication', revenueImpact: null, keyAction: false },
  { id: 'sec5', timestamp: '10:00', endTime: '10:45', durationMinutes: 45, title: 'Compliance calendar update', description: 'Updated April compliance calendar with HMRC, Companies House, and HSE deadlines', category: 'execution', revenueImpact: null, keyAction: false },
  { id: 'sec6', timestamp: '11:00', endTime: '11:30', durationMinutes: 30, title: 'GDPR data audit', description: 'Reviewed client data retention — flagged 23 records past 3-year retention', category: 'monitoring', revenueImpact: null, keyAction: true },
  { id: 'sec7', timestamp: '13:00', endTime: '13:30', durationMinutes: 30, title: 'Director correspondence', description: 'Prepared PSC register update following director address change', category: 'execution', revenueImpact: null, keyAction: false },
  { id: 'sec8', timestamp: '13:45', endTime: '14:15', durationMinutes: 30, title: 'Trademark monitoring', description: 'Scanned UK IPO for similar marks — no conflicts detected for "ALONUKO" mark', category: 'monitoring', revenueImpact: null, keyAction: false },
  { id: 'sec9', timestamp: '14:30', endTime: '15:00', durationMinutes: 30, title: 'Employment compliance check', description: 'Verified right-to-work documentation for 2 new team members', category: 'execution', revenueImpact: null, keyAction: false },
  { id: 'sec10', timestamp: '15:15', endTime: '15:45', durationMinutes: 30, title: 'Weekly compliance summary', description: 'Generated compliance status report — all green, 1 amber (textile licence)', category: 'reporting', revenueImpact: null, keyAction: false },
];

const HR_TASKS: TimesheetTask[] = [
  { id: 'hr1', timestamp: '07:00', endTime: '07:30', durationMinutes: 30, title: 'Leave request processing', description: 'Reviewed 3 pending leave requests — 2 approved (annual leave), 1 flagged for manager review (overlapping dates)', category: 'execution', revenueImpact: null, keyAction: true },
  { id: 'hr2', timestamp: '07:45', endTime: '08:15', durationMinutes: 30, title: 'Payroll compliance check', description: 'Verified payroll data against HMRC requirements — all NI contributions and pension auto-enrolment compliant', category: 'monitoring', revenueImpact: null, keyAction: true },
  { id: 'hr3', timestamp: '08:30', endTime: '09:00', durationMinutes: 30, title: 'Hiring pipeline review', description: 'Updated recruitment tracker — 2 new applications for senior seamstress role, 1 interview scheduled Thursday', category: 'analysis', revenueImpact: null, keyAction: false },
  { id: 'hr4', timestamp: '09:15', endTime: '09:45', durationMinutes: 30, title: 'Onboarding checklist update', description: 'Prepared onboarding pack for new studio assistant starting Monday — IT, workspace, and training schedule confirmed', category: 'execution', revenueImpact: null, keyAction: true },
  { id: 'hr5', timestamp: '10:00', endTime: '10:30', durationMinutes: 30, title: 'Performance review scheduling', description: 'Sent calendar invites for Q1 review cycle — 12 reviews scheduled across next 2 weeks', category: 'communication', revenueImpact: null, keyAction: false },
  { id: 'hr6', timestamp: '10:45', endTime: '11:15', durationMinutes: 30, title: 'Absence pattern analysis', description: 'Analysed absence data for Q1 — average 2.1 days per employee, no Bradford Factor triggers detected', category: 'analysis', revenueImpact: null, keyAction: false },
  { id: 'hr7', timestamp: '13:00', endTime: '13:30', durationMinutes: 30, title: 'HR policy compliance audit', description: 'Reviewed handbook against latest Employment Rights Act changes — 1 policy update recommended for flexible working', category: 'monitoring', revenueImpact: null, keyAction: true },
  { id: 'hr8', timestamp: '13:45', endTime: '14:15', durationMinutes: 30, title: 'Team org chart & headcount report', description: 'Generated weekly headcount summary — 12 active, 1 pending start, 0 leavers. Org chart updated with reporting lines', category: 'reporting', revenueImpact: null, keyAction: false },
];

const DAILY_SUMMARIES: Record<string, string> = {
  setup: 'Platform health check complete. All 47 Xero account mappings verified and aligned. Data quality score improved to 82/100 (+3 from last week). Budget baselines regenerated with latest Q1 actuals. Zero duplicates and zero reconciliation discrepancies detected. Three missing vendor categorisations identified and auto-suggested. All assumptions within tolerance. System operating nominally.',
  finance: 'Today\'s focus was on maintaining financial hygiene ahead of quarter-end. Successfully reconciled all overnight transactions with zero discrepancies. Flagged a duplicate vendor invoice saving £1,200 in potential overpayment. Cash flow remains healthy with 28 weeks runway. Two overdue receivables were escalated with £2,220 expected recovery. VAT return preparation is on track for the April deadline.',
  marketing: 'Strong engagement day across channels. Scored 4 hot leads from recent enquiries — all with wedding dates within 6 months representing ~£4,800 potential revenue. The Spring lookbook email campaign went out to 2,400 subscribers with personalised wedding-date segmentation. NYC trunk show follow-ups are generating warm responses. Instagram reach continues to grow at +18% week-on-week.',
  'project-management': 'Operational efficiency remains high at 87% task completion rate (above 80% target). Prepared Thursday\'s L10 meeting agenda with 3 issues for IDS resolution. The US expansion rock is flagged at risk — recommending a focused discussion at L10. Identified a potential seamstress capacity bottleneck for April that needs early intervention. All other quarterly rocks remain on track.',
  strategy: 'Significant strategic insight today: pricing sensitivity analysis suggests a 5% price increase could add £65K annual revenue with minimal volume impact given ALONUKO\'s positioning in the luxury segment. Investment readiness score improved to 72/100. Board pack executive summary drafted for Q1 review. US trunk show market sizing looks promising at £280K addressable opportunity.',
  secretarial: 'All compliance obligations are current with one amber flag: textile import licence renewal due in 6 weeks. Identified a US trunk show insurance coverage gap that needs addressing before the next NY trip. GDPR audit flagged 23 client records past retention — recommending a data cleanse. Companies House confirmation statement is due 15 April. Trademark monitoring clear — no new conflicting marks detected.',
  hr: 'People operations running smoothly. Processed 3 leave requests with 2 approved and 1 escalated for manager review due to date overlap. Payroll compliance verified — all NI and pension contributions on track. New studio assistant onboarding pack prepared for Monday start. Q1 performance review cycle scheduled across the next 2 weeks covering all 12 team members. Absence patterns healthy with no Bradford Factor triggers. One HR policy update recommended following recent flexible working legislation changes.',
};

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function getTimesheetForDate(slug: string, _date: string): TimesheetDay {
  const taskMap: Record<string, TimesheetTask[]> = {
    setup: SETUP_TASKS,
    finance: FINANCE_TASKS,
    marketing: MARKETING_TASKS,
    'project-management': PM_TASKS,
    strategy: STRATEGY_TASKS,
    secretarial: SECRETARIAL_TASKS,
    hr: HR_TASKS,
  };

  const tasks = taskMap[slug] ?? FINANCE_TASKS;
  const totalMinutes = tasks.reduce((sum, t) => sum + t.durationMinutes, 0);
  const revenue = tasks.reduce((sum, t) => sum + (t.revenueImpact ?? 0), 0);
  const keyActions = tasks.filter((t) => t.keyAction).length;

  return {
    date: _date,
    agentSlug: slug,
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    tasksCompleted: tasks.length,
    revenueGenerated: revenue,
    keyActions,
    tasks,
    dailySummary: DAILY_SUMMARIES[slug] ?? '',
  };
}
