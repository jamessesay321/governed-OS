/* Governance Centre — policies, audit trail, compliance, preferences */

export interface GovernancePolicy {
  id: string;
  title: string;
  description: string;
  category: 'collection' | 'processing' | 'retention' | 'sharing' | 'deletion';
  status: 'active';
}

export interface AgentAuditEntry {
  id: string;
  agentSlug: string;
  agentName: string;
  action: string;
  dataAccessed: string;
  timestamp: string;
  result: 'success' | 'blocked' | 'review';
}

export interface ComplianceStatus {
  framework: string;
  status: 'compliant' | 'in_progress' | 'planned';
  lastReviewed: string;
  controls: number;
}

export interface AIPreference {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  category: 'automation' | 'data' | 'communication';
}

export interface AIToolAssessment {
  name: string;
  category: string;
  safetyScore: number;
  concerns: string[];
  recommendation: string;
}

export function getGovernancePolicies(): GovernancePolicy[] {
  return [
    { id: 'pol-1', title: 'Data Collection', description: 'We collect only financial data explicitly connected via Xero and business context provided during onboarding.', category: 'collection', status: 'active' },
    { id: 'pol-2', title: 'Data Processing', description: 'All data is processed within UK/EU data centres. AI analysis uses anonymised aggregates where possible.', category: 'processing', status: 'active' },
    { id: 'pol-3', title: 'Data Retention', description: 'Financial data retained for duration of account plus 7 years. AI-generated insights retained for 3 years.', category: 'retention', status: 'active' },
    { id: 'pol-4', title: 'Data Sharing', description: 'Data is never shared with third parties without explicit consent. Consultant access requires owner approval.', category: 'sharing', status: 'active' },
    { id: 'pol-5', title: 'Data Deletion', description: 'Full account deletion available on request. All data permanently removed within 30 days.', category: 'deletion', status: 'active' },
  ];
}

export function getAgentAuditTrail(): AgentAuditEntry[] {
  const entries: AgentAuditEntry[] = [];
  const agents = [
    { slug: 'setup', name: 'Setup Agent' },
    { slug: 'finance', name: 'Finance Agent' },
    { slug: 'secretarial', name: 'Secretarial Agent' },
  ];
  const actions = [
    { action: 'Scanned transactions', data: 'Xero transaction ledger' },
    { action: 'Generated budget baselines', data: 'Historical P&L data (12 months)' },
    { action: 'Calculated data quality score', data: 'All connected data sources' },
    { action: 'Reconciled bank transactions', data: 'Barclays current account' },
    { action: 'Flagged duplicate invoice', data: 'Accounts payable ledger' },
    { action: 'Updated cash flow forecast', data: 'Cash position + receivables' },
    { action: 'Checked Companies House deadlines', data: 'Company registration data' },
    { action: 'Reviewed insurance policies', data: 'Policy documents' },
    { action: 'Mapped chart of accounts', data: 'Xero account categories' },
    { action: 'Generated compliance report', data: 'Filing calendar + obligations' },
  ];

  for (let i = 0; i < 20; i++) {
    const agent = agents[i % agents.length];
    const act = actions[i % actions.length];
    const hour = 7 + (i % 10);
    const min = (i * 7) % 60;
    entries.push({
      id: `audit-${i + 1}`,
      agentSlug: agent.slug,
      agentName: agent.name,
      action: act.action,
      dataAccessed: act.data,
      timestamp: `2026-03-21T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00Z`,
      result: i === 7 ? 'review' : 'success',
    });
  }
  return entries;
}

export function getComplianceStatuses(): ComplianceStatus[] {
  return [
    { framework: 'GDPR', status: 'compliant', lastReviewed: '2026-03-15', controls: 12 },
    { framework: 'Data Protection Act 2018', status: 'compliant', lastReviewed: '2026-03-15', controls: 8 },
    { framework: 'ISO 27001', status: 'in_progress', lastReviewed: '2026-02-28', controls: 24 },
    { framework: 'SOC 2 Type II', status: 'planned', lastReviewed: '2026-01-15', controls: 18 },
  ];
}

export function getAIPreferences(): AIPreference[] {
  return [
    { id: 'pref-1', label: 'Agent autonomous actions', description: 'Allow agents to take actions (e.g. reconcile, categorise) without manual approval.', enabled: true, category: 'automation' },
    { id: 'pref-2', label: 'AI-generated narratives', description: 'Allow AI to generate written summaries and explanations of financial data.', enabled: true, category: 'automation' },
    { id: 'pref-3', label: 'Consultant data sharing', description: 'Allow verified consultants to access your financial data when engaged.', enabled: false, category: 'data' },
    { id: 'pref-4', label: 'Anonymous benchmarking', description: 'Contribute anonymised metrics to industry benchmarks for comparative analysis.', enabled: false, category: 'data' },
    { id: 'pref-5', label: 'AI email summaries', description: 'Receive AI-generated email summaries of daily agent activity.', enabled: true, category: 'communication' },
    { id: 'pref-6', label: 'Proactive notifications', description: 'Allow agents to send alerts about anomalies and opportunities.', enabled: true, category: 'communication' },
  ];
}

export function getAIToolAssessments(): AIToolAssessment[] {
  return [
    { name: 'ChatGPT (OpenAI)', category: 'Productivity', safetyScore: 72, concerns: ['Data may be used for model training', 'No enterprise DPA by default', 'Chat history retention'], recommendation: 'Use with caution. Enable data controls in settings. Avoid sharing sensitive financial data.' },
    { name: 'Canva AI', category: 'Design', safetyScore: 85, concerns: ['Generated content IP ownership varies', 'Brand consistency not enforced'], recommendation: 'Generally safe for design work. Establish brand guidelines for AI-generated assets.' },
    { name: 'Google Analytics 4', category: 'Analytics', safetyScore: 78, concerns: ['Cookie consent implementation varies', 'Data transfer to US servers', 'Cross-site tracking capabilities'], recommendation: 'Review cookie consent against ICO guidance. Consider server-side tracking for sensitive data.' },
  ];
}
