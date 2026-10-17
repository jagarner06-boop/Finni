import { describe, expect, it } from 'vitest';
import { contributionLimitCents, parseContribution, contributionError } from '@finni/shared';
describe('contribution limits', () => {
  it('uses the lower of available funds and remaining monthly budget', () => {
    expect(contributionLimitCents(10000, 8000, 3000)).toBe(5000);
    expect(contributionLimitCents(2000, 8000, 3000)).toBe(2000);
    expect(contributionLimitCents(10000, null, 3000)).toBe(10000);
    expect(contributionLimitCents(10000, 0, 0)).toBe(0);
    expect(contributionLimitCents(10000, 8000, 9000)).toBe(0);
  });
  it('accepts any valid whole-dollar custom amount without silently changing it', () => {
    expect(parseContribution('37')).toBe(3700);
    expect(parseContribution('37.00')).toBe(3700);
    for (const text of ['12.50', '-5', 'abc', '1e3', '', '1000001', '0']) expect(parseContribution(text)).toBeNull();
  });
  it('accepts the exact limit and refuses values above it', () => {
    expect(contributionError(5000, 5000)).toBeNull();
    expect(contributionError(5100, 5000)).toContain('$50.00');
    expect(contributionError(0, 5000)).toBeTruthy();
    expect(contributionError(1250, 5000)).toContain('whole dollars');
  });
});
