import { colors, fonts, moodRing, utilizationColor } from '@/theme/tokens';

describe('utilizationColor', () => {
  it('is success up to 30%', () => {
    expect(utilizationColor(30)).toBe(colors.success);
  });

  it('is warning from 31% to 60%', () => {
    expect(utilizationColor(31)).toBe(colors.warning);
    expect(utilizationColor(60)).toBe(colors.warning);
  });

  it('is danger above 60%', () => {
    expect(utilizationColor(61)).toBe(colors.danger);
  });
});

describe('moodRing', () => {
  it('has no ring for happy and an accent ring for thinking', () => {
    expect(moodRing.happy).toBeNull();
    expect(moodRing.thinking).toBe(colors.accent);
  });
});

describe('fonts', () => {
  it('never uses an 800 weight', () => {
    expect(Object.values(fonts).some((f) => f.includes('800'))).toBe(false);
  });
});
