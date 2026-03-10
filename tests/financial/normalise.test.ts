import { describe, it, expect } from 'vitest';
import { toMonthStart, roundCurrency } from '@/lib/financial/normalise';

describe('toMonthStart', () => {
  it('converts a date to the first of the month', () => {
    expect(toMonthStart('2024-03-15')).toBe('2024-03-01');
    expect(toMonthStart('2024-12-31')).toBe('2024-12-01');
    expect(toMonthStart('2024-01-01')).toBe('2024-01-01');
  });

  it('handles ISO date strings', () => {
    expect(toMonthStart('2024-06-15T10:30:00Z')).toBe('2024-06-01');
  });

  it('zero-pads single-digit months', () => {
    expect(toMonthStart('2024-01-15')).toBe('2024-01-01');
    expect(toMonthStart('2024-09-20')).toBe('2024-09-01');
  });
});

describe('roundCurrency', () => {
  it('rounds to 2 decimal places', () => {
    expect(roundCurrency(10.555)).toBe(10.56);
    expect(roundCurrency(10.554)).toBe(10.55);
    expect(roundCurrency(10.5)).toBe(10.5);
    expect(roundCurrency(10)).toBe(10);
  });

  it('handles negative numbers', () => {
    expect(roundCurrency(-10.555)).toBe(-10.55);
    expect(roundCurrency(-0.001)).toBe(0);
  });

  it('handles very small numbers', () => {
    expect(roundCurrency(0.001)).toBe(0);
    expect(roundCurrency(0.005)).toBe(0.01);
  });

  it('handles large numbers', () => {
    expect(roundCurrency(999999.999)).toBe(1000000);
    expect(roundCurrency(123456.78)).toBe(123456.78);
  });
});
