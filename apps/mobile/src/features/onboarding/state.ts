import { BILLS, LIFE_STAGES, PAY_SCHEDULES, type OnboardingProfile } from './content';

export const initialProfile = (): OnboardingProfile => ({
  firstName: '', lifeStage: null, monthlyIncome: 4200, paySchedule: 'biweekly', nextPayday: 0,
  bills: ['Rent', 'Phone', 'Subscriptions'], monthlyBills: 1850, habits: [null, null, null],
  handsOn: 'suggest', bank: null, notifications: { bills: true, unusual: true, goals: true, recap: false }, quietHours: 0,
});
export interface Storage { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void> }

function valid(value: unknown): value is OnboardingProfile {
  if (!value || typeof value !== 'object') return false;
  const p = value as OnboardingProfile;
  return typeof p.firstName === 'string' && (p.lifeStage === null || LIFE_STAGES.some(s => s.id === p.lifeStage))
    && Number.isFinite(p.monthlyIncome) && p.monthlyIncome >= 500 && p.monthlyIncome <= 12000
    && Number.isFinite(p.monthlyBills) && p.monthlyBills >= 0 && p.monthlyBills <= billsMaximum(p.monthlyIncome)
    && PAY_SCHEDULES.some(s => s.id === p.paySchedule) && [0, 1, 2].includes(p.nextPayday)
    && Array.isArray(p.bills) && p.bills.every(b => (BILLS as readonly string[]).includes(b))
    && Array.isArray(p.habits) && p.habits.length === 3 && p.habits.every(h => h === null || h === 'a' || h === 'b')
    && ['watch', 'suggest', 'prep'].includes(p.handsOn) && [0, 1, 2].includes(p.quietHours)
    && !!p.notifications && ['bills', 'unusual', 'goals', 'recap'].every(k => typeof p.notifications[k as keyof typeof p.notifications] === 'boolean')
    && (p.bank === null || (typeof p.bank === 'object' && typeof p.bank.institution === 'string' && typeof p.bank.linked === 'boolean'));
}

export async function loadOnboarding(store: Storage) {
  const [raw, flag] = await Promise.all([store.getItem('finni.onboarding.v1'), store.getItem('finni.onboarding.complete')]);
  let parsed: unknown;
  try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }
  const profile = valid(parsed) ? parsed : initialProfile();
  return { profile, complete: flag === 'true' && valid(parsed) };
}
export async function saveOnboarding(store: Storage, profile: OnboardingProfile) {
  await store.setItem('finni.onboarding.v1', JSON.stringify({ ...profile, firstName: profile.firstName.trim() }));
  await store.setItem('finni.onboarding.complete', 'true');
}
export function destination(auth: 'loading' | 'signedOut' | 'signedIn', hydrated: boolean, complete: boolean) {
  if (auth === 'loading' || !hydrated) return null;
  if (auth === 'signedOut') return 'welcome';
  return complete ? 'tabs' : 'onboarding';
}
export const billsMaximum = (income: number) => Math.max(500, Math.round(income * .9 / 25) * 25);
