import { describe, it, expect } from 'vitest';
import {
  getFinancialYearStart,
  getFinancialYearEnd,
  getCurrentFYStartPeriod,
  getYTDPeriods,
  getDefaultDisplayPeriods,
  getFinancialYearLabel,
  getFinancialQuarter,
  groupByFinancialQuarter,
  DEFAULT_YEAR_END_MONTH,
  DEFAULT_YEAR_END_DAY,
} from '@/lib/financial/periods';

// ─── getFinancialYearStart ──────────────────────────────────────────

describe('getFinancialYearStart', () => {
  it('calendar year (Dec year-end): FY starts Jan 1 of same year', () => {
    const result = getFinancialYearStart(new Date(2025, 5, 15), 12); // Jun 2025
    expect(result).toEqual(new Date(2025, 0, 1)); // Jan 2025
  });

  it('calendar year: any month in the year returns Jan 1', () => {
    expect(getFinancialYearStart(new Date(2025, 0, 1), 12)).toEqual(new Date(2025, 0, 1));
    expect(getFinancialYearStart(new Date(2025, 11, 31), 12)).toEqual(new Date(2025, 0, 1));
  });

  it('March year-end (UK standard): FY starts Apr 1', () => {
    // Nov 2025 → FY start = Apr 2025
    const result = getFinancialYearStart(new Date(2025, 10, 15), 3);
    expect(result).toEqual(new Date(2025, 3, 1)); // Apr 2025
  });

  it('March year-end: Feb 2026 is still in FY starting Apr 2025', () => {
    const result = getFinancialYearStart(new Date(2026, 1, 15), 3); // Feb 2026
    expect(result).toEqual(new Date(2025, 3, 1)); // Apr 2025
  });

  it('March year-end: Apr 2026 starts a new FY', () => {
    const result = getFinancialYearStart(new Date(2026, 3, 1), 3); // Apr 2026
    expect(result).toEqual(new Date(2026, 3, 1)); // Apr 2026
  });

  it('June year-end: FY starts Jul 1', () => {
    const result = getFinancialYearStart(new Date(2025, 8, 15), 6); // Sep 2025
    expect(result).toEqual(new Date(2025, 6, 1)); // Jul 2025
  });

  it('June year-end: May 2025 is in the FY that started Jul 2024', () => {
    const result = getFinancialYearStart(new Date(2025, 4, 15), 6); // May 2025
    expect(result).toEqual(new Date(2024, 6, 1)); // Jul 2024
  });

  it('September year-end: FY starts Oct 1', () => {
    const result = getFinancialYearStart(new Date(2025, 11, 15), 9); // Dec 2025
    expect(result).toEqual(new Date(2025, 9, 1)); // Oct 2025
  });
});

// ─── getFinancialYearEnd ────────────────────────────────────────────

describe('getFinancialYearEnd', () => {
  it('calendar year: ends Dec 31 of same year', () => {
    const result = getFinancialYearEnd(new Date(2025, 5, 15), 12, 31);
    expect(result).toEqual(new Date(2025, 11, 31));
  });

  it('March year-end: ends Mar 31 of next calendar year', () => {
    const result = getFinancialYearEnd(new Date(2025, 10, 15), 3, 31); // Nov 2025
    expect(result).toEqual(new Date(2026, 2, 31)); // Mar 31, 2026
  });

  it('June year-end: ends Jun 30', () => {
    const result = getFinancialYearEnd(new Date(2025, 8, 15), 6, 30); // Sep 2025
    expect(result).toEqual(new Date(2026, 5, 30)); // Jun 30, 2026
  });
});

// ─── getFinancialYearLabel ──────────────────────────────────────────

describe('getFinancialYearLabel', () => {
  it('calendar year: shows full calendar year', () => {
    const label = getFinancialYearLabel(12);
    const year = new Date().getFullYear();
    expect(label).toBe(`Jan ${year} \u2013 Dec ${year}`);
  });

  it('March year-end: shows Apr YYYY - Mar YYYY+1', () => {
    const label = getFinancialYearLabel(3);
    // This depends on current date, so just check format
    expect(label).toMatch(/^[A-Z][a-z]{2} \d{4} \u2013 Mar \d{4}$/);
  });
});

// ─── getFinancialQuarter ────────────────────────────────────────────

describe('getFinancialQuarter', () => {
  it('calendar year: standard quarters', () => {
    expect(getFinancialQuarter('2025-01-01', 12).quarter).toBe(1);
    expect(getFinancialQuarter('2025-03-01', 12).quarter).toBe(1);
    expect(getFinancialQuarter('2025-04-01', 12).quarter).toBe(2);
    expect(getFinancialQuarter('2025-07-01', 12).quarter).toBe(3);
    expect(getFinancialQuarter('2025-10-01', 12).quarter).toBe(4);
  });

  it('March year-end: Q1 = Apr-Jun, Q2 = Jul-Sep, Q3 = Oct-Dec, Q4 = Jan-Mar', () => {
    expect(getFinancialQuarter('2025-04-01', 3).quarter).toBe(1);
    expect(getFinancialQuarter('2025-06-01', 3).quarter).toBe(1);
    expect(getFinancialQuarter('2025-07-01', 3).quarter).toBe(2);
    expect(getFinancialQuarter('2025-10-01', 3).quarter).toBe(3);
    expect(getFinancialQuarter('2026-01-01', 3).quarter).toBe(4);
    expect(getFinancialQuarter('2026-03-01', 3).quarter).toBe(4);
  });

  it('returns FY-aware label', () => {
    const q = getFinancialQuarter('2025-04-01', 3);
    expect(q.label).toMatch(/^Q1 FY\d{2}$/);
  });
});

// ─── getYTDPeriods ──────────────────────────────────────────────────

describe('getYTDPeriods', () => {
  const allPeriods = [
    '2024-01-01', '2024-02-01', '2024-03-01', '2024-04-01',
    '2024-05-01', '2024-06-01', '2024-07-01', '2024-08-01',
    '2024-09-01', '2024-10-01', '2024-11-01', '2024-12-01',
    '2025-01-01', '2025-02-01', '2025-03-01', '2025-04-01',
    '2025-05-01', '2025-06-01', '2025-07-01', '2025-08-01',
    '2025-09-01', '2025-10-01', '2025-11-01', '2025-12-01',
    '2026-01-01', '2026-02-01', '2026-03-01',
  ];

  it('returns only periods from FY start up to current month', () => {
    // Current date is 2026-03-31 (from system context)
    // With March year-end: FY starts Apr 2025
    const ytd = getYTDPeriods(allPeriods, 3);
    // Should include Apr 2025 through Mar 2026
    expect(ytd.every((p) => p >= '2025-04-01' && p <= '2026-03-01')).toBe(true);
    expect(ytd.length).toBeGreaterThan(0);
  });

  it('returns sorted periods', () => {
    const ytd = getYTDPeriods(allPeriods, 3);
    for (let i = 1; i < ytd.length; i++) {
      expect(ytd[i] >= ytd[i - 1]).toBe(true);
    }
  });
});

// ─── getDefaultDisplayPeriods ───────────────────────────────────────

describe('getDefaultDisplayPeriods', () => {
  it('returns YTD periods when available', () => {
    const periods = ['2025-04-01', '2025-05-01', '2025-06-01'];
    const result = getDefaultDisplayPeriods(periods, 3);
    expect(result.length).toBeGreaterThan(0);
  });

  it('falls back to last 12 months when no FY periods match', () => {
    const oldPeriods = ['2020-01-01', '2020-02-01', '2020-03-01'];
    const result = getDefaultDisplayPeriods(oldPeriods, 3);
    // Should return what's available (max 12)
    expect(result.length).toBeLessThanOrEqual(12);
    expect(result.length).toBe(3);
  });
});

// ─── groupByFinancialQuarter ────────────────────────────────────────

describe('groupByFinancialQuarter', () => {
  it('groups periods by FY quarter for March year-end', () => {
    const periods = ['2025-04-01', '2025-05-01', '2025-06-01', '2025-07-01'];
    const groups = groupByFinancialQuarter(periods, 3);
    // Apr-Jun = Q1, Jul = Q2
    expect(groups.size).toBe(2);
    const keys = Array.from(groups.keys());
    expect(keys[0]).toMatch(/Q1/);
    expect(keys[1]).toMatch(/Q2/);
  });

  it('groups 12 months into 4 quarters', () => {
    const periods = [
      '2025-04-01', '2025-05-01', '2025-06-01',
      '2025-07-01', '2025-08-01', '2025-09-01',
      '2025-10-01', '2025-11-01', '2025-12-01',
      '2026-01-01', '2026-02-01', '2026-03-01',
    ];
    const groups = groupByFinancialQuarter(periods, 3);
    expect(groups.size).toBe(4);
  });
});

// ─── Defaults ───────────────────────────────────────────────────────

describe('defaults', () => {
  it('DEFAULT_YEAR_END_MONTH is 12 (December)', () => {
    expect(DEFAULT_YEAR_END_MONTH).toBe(12);
  });

  it('DEFAULT_YEAR_END_DAY is 31', () => {
    expect(DEFAULT_YEAR_END_DAY).toBe(31);
  });
});
