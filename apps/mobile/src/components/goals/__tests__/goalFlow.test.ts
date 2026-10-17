import { CADENCES, etaLabel, FINN_LINES, GOAL_ICONS } from '@/components/goals/goalFlow';

describe('etaLabel', () => {
  const today = new Date(2026, 9, 17);

  it('counts weekly contributions to the target month', () => {
    expect(etaLabel(240_000, 'weekly', 5_000, today)).toBe('Sep 2027'); // 48 weeks
  });

  it('counts monthly contributions', () => {
    expect(etaLabel(240_000, 'monthly', 20_000, today)).toBe('Oct 2027');
  });

  it('counts every-2-weeks contributions', () => {
    expect(etaLabel(100_000, 'biweekly', 10_000, today)).toBe('Mar 2027'); // 10 × 14 days = Mar 6
  });

  it('is empty without a contribution', () => {
    expect(etaLabel(240_000, 'weekly', 0, today)).toBe('');
  });
});

describe('goal flow constants', () => {
  it('has the cadence labels and defaults', () => {
    expect(CADENCES.weekly).toEqual({ label: 'Weekly', days: 7, defaultCents: 5_000 });
    expect(CADENCES.biweekly.label).toBe('Every 2 weeks');
    expect(CADENCES.monthly.days).toBe(30.4);
  });

  it('has six icons and four Finn lines', () => {
    expect(GOAL_ICONS.map((i) => i.key)).toEqual(['sun', 'tool', 'shield', 'home', 'book', 'gift']);
    expect(GOAL_ICONS.find((i) => i.key === 'book')?.feather).toBe('book-open');
    expect(FINN_LINES[1]).toBe('Nice. How much do you need?');
  });
});
