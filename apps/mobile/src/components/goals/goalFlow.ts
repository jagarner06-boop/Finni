import type { Feather } from '@expo/vector-icons';
import type { Cents, GoalCadence, GoalIcon } from '@finni/shared';
import type { ComponentProps } from 'react';

type FeatherIconName = ComponentProps<typeof Feather>['name'];

export const CADENCES: Record<GoalCadence, { label: string; days: number; defaultCents: Cents }> = {
  weekly: { label: 'Weekly', days: 7, defaultCents: 5_000 },
  biweekly: { label: 'Every 2 weeks', days: 14, defaultCents: 10_000 },
  monthly: { label: 'Monthly', days: 30.4, defaultCents: 20_000 },
};

export const CADENCE_ORDER: GoalCadence[] = ['weekly', 'biweekly', 'monthly'];

const DAY = 86_400_000;

/** Month the plan reaches the target, e.g. "Mar 2027". Empty without a contribution. */
export function etaLabel(targetCents: Cents, cadence: GoalCadence, perCents: Cents, today: Date): string {
  if (perCents <= 0 || targetCents <= 0) return '';
  const periods = Math.ceil(targetCents / perCents);
  const done = new Date(today.getTime() + periods * CADENCES[cadence].days * DAY);
  return monthYear(done);
}

export const monthYear = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

export const GOAL_ICONS: { key: GoalIcon; feather: FeatherIconName; label: string }[] = [
  { key: 'sun', feather: 'sun', label: 'Trip' },
  { key: 'tool', feather: 'tool', label: 'Repair' },
  { key: 'shield', feather: 'shield', label: 'Safety net' },
  { key: 'home', feather: 'home', label: 'Home' },
  { key: 'book', feather: 'book-open', label: 'School' },
  { key: 'gift', feather: 'gift', label: 'Gift' },
];

export const featherFor = (icon: GoalIcon | null): FeatherIconName => GOAL_ICONS.find((i) => i.key === icon)?.feather ?? 'star';

export const FINN_LINES = [
  'What are we saving for?',
  'Nice. How much do you need?',
  'Got it. How often should I move money?',
  "This works. Here's the plan.",
] as const;
