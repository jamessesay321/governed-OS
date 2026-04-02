// src/lib/intelligence/search-examples.ts
// Per-section example queries shown as clickable chips in the AI search bar.
// 'use client' compatible — no server-side imports, all inline mock data.

export interface SearchExample {
  query: string;
  section: string;
}

// ---------------------------------------------------------------------------
// Section -> Example queries map
// ---------------------------------------------------------------------------

const SEARCH_EXAMPLES: Record<string, SearchExample[]> = {
  dashboard: [
    { query: "What's my cash runway?", section: 'dashboard' },
    { query: 'Compare this month to last year', section: 'dashboard' },
    { query: 'Show me my top expenses', section: 'dashboard' },
    { query: 'How are we tracking against targets?', section: 'dashboard' },
    { query: 'Summarise my financial health', section: 'dashboard' },
  ],

  kpi: [
    { query: 'Which KPIs are underperforming?', section: 'kpi' },
    { query: 'Benchmark against luxury retail', section: 'kpi' },
    { query: 'Show revenue growth trend', section: 'kpi' },
    { query: "What's my customer acquisition cost?", section: 'kpi' },
    { query: 'How has fitting conversion changed this quarter?', section: 'kpi' },
  ],

  variance: [
    { query: 'Why did expenses increase this month?', section: 'variance' },
    { query: 'Show me the biggest positive variances', section: 'variance' },
    { query: 'Compare Q1 vs Q4', section: 'variance' },
    { query: 'Which budget lines are most over?', section: 'variance' },
  ],

  financials: [
    { query: 'Show my P&L for last quarter', section: 'financials' },
    { query: 'What are my biggest cost lines?', section: 'financials' },
    { query: 'How has revenue trended over 12 months?', section: 'financials' },
    { query: 'Compare gross margin by collection', section: 'financials' },
  ],

  scenarios: [
    { query: 'What if revenue grows 20%?', section: 'scenarios' },
    { query: 'Model hiring 3 new staff', section: 'scenarios' },
    { query: 'Show me break-even analysis', section: 'scenarios' },
    { query: 'What happens if fabric costs rise 15%?', section: 'scenarios' },
    { query: 'Simulate opening a second showroom', section: 'scenarios' },
  ],

  playbook: [
    { query: "What's my maturity score?", section: 'playbook' },
    { query: 'Which areas need the most improvement?', section: 'playbook' },
    { query: 'Compare to similar businesses', section: 'playbook' },
    { query: 'Show my governance roadmap', section: 'playbook' },
  ],

  reports: [
    { query: 'Generate a board pack', section: 'reports' },
    { query: 'Create monthly review for March', section: 'reports' },
    { query: 'Build an investor update', section: 'reports' },
    { query: 'Show trunk show ROI summary', section: 'reports' },
  ],

  modules: [
    { query: 'Which modules would benefit my business?', section: 'modules' },
    { query: 'How does the Cash Forecaster work?', section: 'modules' },
    { query: 'Show module pricing', section: 'modules' },
    { query: 'Compare modules to what I already have', section: 'modules' },
  ],

  billing: [
    { query: "What's my monthly spend?", section: 'billing' },
    { query: 'Show invoice history', section: 'billing' },
    { query: 'Compare bundle options', section: 'billing' },
    { query: 'How much am I saving with my current plan?', section: 'billing' },
  ],

  agents: [
    { query: 'What can the Finance Agent do?', section: 'agents' },
    { query: 'Show agent activity this week', section: 'agents' },
    { query: 'How much time has the Marketing Agent saved?', section: 'agents' },
    { query: 'Which agent would help me most?', section: 'agents' },
    { query: 'Compare agent bundle vs individual pricing', section: 'agents' },
  ],

  consultants: [
    { query: 'Find a marketing consultant', section: 'consultants' },
    { query: 'Who can help with US expansion?', section: 'consultants' },
    { query: 'Show consultant pricing', section: 'consultants' },
    { query: 'What specialities are available?', section: 'consultants' },
  ],

  'custom-builds': [
    { query: 'What custom tools can you build?', section: 'custom-builds' },
    { query: 'How much would a client portal cost?', section: 'custom-builds' },
    { query: 'Show examples from other industries', section: 'custom-builds' },
    { query: 'How long does a custom build take?', section: 'custom-builds' },
    { query: 'Can you build a production tracker?', section: 'custom-builds' },
  ],

  intelligence: [
    { query: 'Show recent anomalies', section: 'intelligence' },
    { query: 'What trends are affecting bridal?', section: 'intelligence' },
    { query: 'Are there any unusual transactions?', section: 'intelligence' },
    { query: 'Summarise this week\u2019s insights', section: 'intelligence' },
  ],

  settings: [
    { query: 'How do I invite my accountant?', section: 'settings' },
    { query: 'Change my notification preferences', section: 'settings' },
    { query: 'Set up multi-currency', section: 'settings' },
    { query: 'Manage team permissions', section: 'settings' },
  ],
};

// ---------------------------------------------------------------------------
// Section-specific placeholder text for the search bar
// ---------------------------------------------------------------------------

const SECTION_PLACEHOLDERS: Record<string, string> = {
  dashboard: 'Ask about your business performance...',
  kpi: 'Ask about your KPIs and metrics...',
  variance: 'Ask about budget variances and deviations...',
  financials: 'Ask about your financial data...',
  scenarios: 'Describe a scenario to model...',
  playbook: 'Ask about your governance maturity...',
  reports: 'Describe the report you need...',
  modules: 'Ask about available modules...',
  billing: 'Ask about your plan and billing...',
  agents: 'Ask about AI agents and automation...',
  consultants: 'Ask about consultant matching...',
  'custom-builds': 'Describe what you want to build...',
  intelligence: 'Ask about insights and anomalies...',
  settings: 'Ask about platform configuration...',
};

const DEFAULT_PLACEHOLDER = 'Ask anything about your business...';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the example search queries for a given section.
 * Falls back to an empty array for unknown sections.
 */
export function getSearchExamplesForSection(section: string): SearchExample[] {
  return SEARCH_EXAMPLES[section] || [];
}

/**
 * Returns a section-specific placeholder string for the AI search bar.
 */
export function getSearchPlaceholder(section: string): string {
  return SECTION_PLACEHOLDERS[section] || DEFAULT_PLACEHOLDER;
}

/**
 * Returns all available section keys that have search examples.
 */
export function getAvailableSearchSections(): string[] {
  return Object.keys(SEARCH_EXAMPLES);
}

/**
 * Returns all search examples across every section.
 */
export function getAllSearchExamples(): SearchExample[] {
  return Object.values(SEARCH_EXAMPLES).flat();
}
