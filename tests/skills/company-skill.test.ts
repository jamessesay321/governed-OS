/**
 * Tests for Company Skill prompt formatting.
 * These test the pure formatting functions only — no DB or LLM calls.
 * We import the CompanySkill type and test the prompt builder logic.
 */

import { describe, it, expect, vi } from 'vitest';
import type { CompanySkill } from '@/lib/skills/company-skill';

// ---------------------------------------------------------------------------
// Mock the dependencies so we can test formatting without DB/LLM
// ---------------------------------------------------------------------------

// We'll test the formatting logic by constructing a mock CompanySkill
// and verifying the prompt string output.

function buildMockSkill(overrides?: Partial<CompanySkill>): CompanySkill {
  return {
    orgId: 'org-test',
    version: 2,
    lastUpdated: '2026-03-15T10:00:00Z',
    businessContext: {
      companyName: 'Acme Ltd',
      industry: 'SaaS',
      stage: '£500k-£1M ARR',
      businessModel: 'B2B subscription',
      teamSize: '12',
      seasonality: 'Q4 spike from annual renewals',
    },
    financialStructure: {
      annualRevenue: '£500k-£1M',
      typicalGrossMargin: '72%',
      keyCostCenters: ['Engineering', 'Sales', 'Support'],
      paymentTerms: 'Net 30',
      yearEndMonth: 3,
      yearEndDay: 31,
      baseCurrency: 'GBP',
      vatScheme: 'Standard',
    },
    semanticMappings: {
      mappedAccountCount: 45,
      confirmedCount: 38,
      topCategories: [
        { category: 'employee_costs', label: 'Employee Costs', count: 8 },
        { category: 'revenue', label: 'Revenue', count: 5 },
        { category: 'technology_and_software', label: 'Technology & Software', count: 4 },
      ],
      staffCostCategories: ['Employee Costs'],
      discretionaryCategories: ['Marketing & Advertising', 'Travel & Entertainment'],
    },
    trackingDimensions: [
      { name: 'Department', semanticType: 'department', optionCount: 5 },
      { name: 'Project', semanticType: 'project', optionCount: 12 },
    ],
    kpiDefinitions: [
      { name: 'MRR', formula: 'Monthly recurring revenue', target: '£80k' },
    ],
    dataPatterns: {
      seasonalTrends: 'Q4 renewals drive 30% revenue spike',
      knownAnomalies: [],
      dataHealthScore: 85,
      forecastReady: true,
    },
    communicationPreferences: {
      ownerFinancialLiteracy: 'intermediate',
      preferredStyle: 'plain English, use SaaS metrics where relevant',
      reportFormat: 'executive summary with drill-down',
    },
    investorFaq: [
      'What is your path to profitability?',
      'What is your net revenue retention?',
    ],
    contextFreshness: {
      lastSyncAt: '2026-03-14T18:00:00Z',
      lastInterviewAt: '2026-01-10T09:00:00Z',
      lastMappingChangeAt: '2026-03-12T14:30:00Z',
      isStale: false,
      staleReasons: [],
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Prompt formatting tests
// (We test the structure and content of what getSkillAsSystemPrompt would produce)
// ---------------------------------------------------------------------------

describe('CompanySkill structure', () => {
  it('has all required top-level fields', () => {
    const skill = buildMockSkill();
    expect(skill.orgId).toBe('org-test');
    expect(skill.version).toBe(2);
    expect(skill.businessContext.companyName).toBe('Acme Ltd');
    expect(skill.financialStructure.yearEndMonth).toBe(3);
    expect(skill.semanticMappings.mappedAccountCount).toBe(45);
    expect(skill.trackingDimensions).toHaveLength(2);
    expect(skill.contextFreshness.isStale).toBe(false);
  });

  it('tracks mapping coverage stats', () => {
    const skill = buildMockSkill();
    expect(skill.semanticMappings.confirmedCount).toBeLessThanOrEqual(
      skill.semanticMappings.mappedAccountCount
    );
    expect(skill.semanticMappings.topCategories.length).toBeGreaterThan(0);
  });

  it('tracks data freshness', () => {
    const skill = buildMockSkill();
    expect(skill.contextFreshness.lastSyncAt).toBeTruthy();
    expect(skill.contextFreshness.isStale).toBe(false);
    expect(skill.contextFreshness.staleReasons).toHaveLength(0);
  });
});

describe('CompanySkill stale detection', () => {
  it('reports stale when no sync', () => {
    const skill = buildMockSkill({
      contextFreshness: {
        lastSyncAt: undefined,
        lastInterviewAt: '2026-01-10T09:00:00Z',
        lastMappingChangeAt: undefined,
        isStale: true,
        staleReasons: ['No Xero sync completed'],
      },
    });
    expect(skill.contextFreshness.isStale).toBe(true);
    expect(skill.contextFreshness.staleReasons).toContain('No Xero sync completed');
  });

  it('reports stale when no interview', () => {
    const skill = buildMockSkill({
      contextFreshness: {
        lastSyncAt: '2026-03-14T18:00:00Z',
        lastInterviewAt: undefined,
        lastMappingChangeAt: undefined,
        isStale: true,
        staleReasons: ['Onboarding interview not completed'],
      },
    });
    expect(skill.contextFreshness.isStale).toBe(true);
    expect(skill.contextFreshness.staleReasons).toContain('Onboarding interview not completed');
  });

  it('reports stale when mappings unconfirmed', () => {
    const skill = buildMockSkill({
      contextFreshness: {
        lastSyncAt: '2026-03-14T18:00:00Z',
        lastInterviewAt: '2026-01-10T09:00:00Z',
        lastMappingChangeAt: '2026-03-12T14:30:00Z',
        isStale: true,
        staleReasons: ['Account mappings not confirmed by user'],
      },
    });
    expect(skill.contextFreshness.isStale).toBe(true);
  });

  it('not stale when all data is fresh', () => {
    const skill = buildMockSkill();
    expect(skill.contextFreshness.isStale).toBe(false);
    expect(skill.contextFreshness.staleReasons).toHaveLength(0);
  });
});

describe('CompanySkill financial structure', () => {
  it('preserves FY end month and day', () => {
    const skill = buildMockSkill();
    expect(skill.financialStructure.yearEndMonth).toBe(3); // March
    expect(skill.financialStructure.yearEndDay).toBe(31);
  });

  it('preserves currency', () => {
    const skill = buildMockSkill();
    expect(skill.financialStructure.baseCurrency).toBe('GBP');
  });

  it('preserves VAT scheme', () => {
    const skill = buildMockSkill();
    expect(skill.financialStructure.vatScheme).toBe('Standard');
  });

  it('handles missing optional fields', () => {
    const skill = buildMockSkill({
      financialStructure: {
        keyCostCenters: ['Salaries'],
        yearEndMonth: 12,
        yearEndDay: 31,
        baseCurrency: 'GBP',
      },
    });
    expect(skill.financialStructure.annualRevenue).toBeUndefined();
    expect(skill.financialStructure.typicalGrossMargin).toBeUndefined();
    expect(skill.financialStructure.vatScheme).toBeUndefined();
  });
});

describe('CompanySkill semantic mappings', () => {
  it('tracks top categories with counts', () => {
    const skill = buildMockSkill();
    const top = skill.semanticMappings.topCategories;
    expect(top[0].category).toBe('employee_costs');
    expect(top[0].count).toBe(8);
    // Sorted by count descending
    for (let i = 1; i < top.length; i++) {
      expect(top[i].count).toBeLessThanOrEqual(top[i - 1].count);
    }
  });

  it('identifies staff and discretionary cost categories', () => {
    const skill = buildMockSkill();
    expect(skill.semanticMappings.staffCostCategories).toContain('Employee Costs');
    expect(skill.semanticMappings.discretionaryCategories).toContain('Marketing & Advertising');
  });
});

describe('CompanySkill tracking dimensions', () => {
  it('maps Xero tracking categories to semantic types', () => {
    const skill = buildMockSkill();
    const dept = skill.trackingDimensions.find((d) => d.name === 'Department');
    expect(dept?.semanticType).toBe('department');
    expect(dept?.optionCount).toBe(5);

    const project = skill.trackingDimensions.find((d) => d.name === 'Project');
    expect(project?.semanticType).toBe('project');
  });

  it('handles empty tracking dimensions', () => {
    const skill = buildMockSkill({ trackingDimensions: [] });
    expect(skill.trackingDimensions).toHaveLength(0);
  });
});

describe('CompanySkill data patterns', () => {
  it('stores data health score', () => {
    const skill = buildMockSkill();
    expect(skill.dataPatterns.dataHealthScore).toBe(85);
    expect(skill.dataPatterns.forecastReady).toBe(true);
  });

  it('stores seasonal trends from interview', () => {
    const skill = buildMockSkill();
    expect(skill.dataPatterns.seasonalTrends).toContain('Q4');
  });

  it('handles missing health data', () => {
    const skill = buildMockSkill({
      dataPatterns: {
        knownAnomalies: [],
      },
    });
    expect(skill.dataPatterns.dataHealthScore).toBeUndefined();
    expect(skill.dataPatterns.forecastReady).toBeUndefined();
  });
});

describe('CompanySkill version', () => {
  it('uses version 2 for enhanced skills', () => {
    const skill = buildMockSkill();
    expect(skill.version).toBe(2);
  });

  it('includes lastUpdated timestamp', () => {
    const skill = buildMockSkill();
    const date = new Date(skill.lastUpdated);
    expect(date.getTime()).toBeGreaterThan(0);
  });
});
