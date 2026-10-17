import { PERSONALITIES, type HabitAnswer, type OnboardingProfile, type PaySchedule } from './content';
import { billsMaximum } from './state';

export const dollars = (value: number) => `$${Math.round(value).toLocaleString('en-US')}`;
export const personalityFor = (answers: (HabitAnswer | null)[]) => PERSONALITIES[answers.filter(a => a === 'a').length];
export function incomePatch(profile: OnboardingProfile, amount: number) {
  const monthlyIncome = Math.min(12000, Math.max(500, Math.round(amount / 50) * 50));
  return { monthlyIncome, monthlyBills: Math.min(profile.monthlyBills, billsMaximum(monthlyIncome)) };
}
export function canContinue(deck: 'basics' | 'income' | 'personality', step: number, p: OnboardingProfile) {
  if (deck === 'basics') return step === 1 ? !!p.firstName.trim() : step === 2 ? !!p.lifeStage : true;
  if (deck === 'income') return step !== 2 || p.bills.length > 0;
  return step !== 0 || p.habits.every(Boolean);
}
// Suggested dates only: weekly/biweekly use upcoming Fridays; semimonthly uses 1st/15th;
// monthly uses the next month start. "Not sure" remains available for every schedule.
export function paydayLabels(schedule: PaySchedule, now = new Date()): string[] {
  if (schedule === 'irregular') return ['This week', 'Next week', 'Not sure'];
  const first = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const second = new Date(first);
  if (schedule === 'weekly' || schedule === 'biweekly') {
    first.setDate(first.getDate() + ((5 - first.getDay() + 7) % 7 || 7));
    second.setTime(first.getTime()); second.setDate(first.getDate() + (schedule === 'weekly' ? 7 : 14));
  } else if (schedule === 'monthly') {
    first.setMonth(first.getMonth() + 1, 1); second.setMonth(second.getMonth() + 2, 1);
  } else {
    if (first.getDate() < 15) first.setDate(15); else first.setMonth(first.getMonth() + 1, 1);
    second.setTime(first.getTime());
    if (first.getDate() === 1) second.setDate(15); else second.setMonth(second.getMonth() + 1, 1);
  }
  const format = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return [format(first), format(second), 'Not sure'];
}
