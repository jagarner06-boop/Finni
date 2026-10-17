import { splitMoney, timeOfDay } from '@/lib/format';

describe('splitMoney', () => {
  it('splits dollars from cents', () => {
    expect(splitMoney(136420)).toEqual({ whole: '$1,364', cents: '.20' });
  });

  it('never abbreviates large amounts', () => {
    expect(splitMoney(123456789)).toEqual({ whole: '$1,234,567', cents: '.89' });
  });

  it('keeps the sign on negative amounts', () => {
    expect(splitMoney(-500)).toEqual({ whole: '−$5', cents: '.00' });
  });

  it('shows zero with cents', () => {
    expect(splitMoney(0)).toEqual({ whole: '$0', cents: '.00' });
  });
});

describe('timeOfDay', () => {
  it('names the part of the day for the greeting', () => {
    expect(timeOfDay(4)).toBe('morning');
    expect(timeOfDay(11)).toBe('morning');
    expect(timeOfDay(12)).toBe('afternoon');
    expect(timeOfDay(16)).toBe('afternoon');
    expect(timeOfDay(17)).toBe('evening');
    expect(timeOfDay(2)).toBe('evening');
  });
});
