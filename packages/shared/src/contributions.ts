import { formatCents } from './money';

/** The current bank adapter supports whole dollars, up to $1,000,000. */
export function parseContribution(input: string): number | null {
  const text = input.trim();
  if (!/^\d+(?:\.0{1,2})?$/.test(text)) return null;
  const cents = Number(text) * 100;
  return Number.isSafeInteger(cents) && cents > 0 && cents <= 100_000_000 ? cents : null;
}

export function contributionLimitCents(balanceCents: number, budgetCents: number | null = null, usedCents = 0): number {
  const available = Math.max(0, balanceCents);
  return Math.floor(Math.min(available, budgetCents === null ? available : Math.max(0, budgetCents - usedCents)) / 100) * 100;
}

export function contributionError(amountCents: number, limitCents: number): string | null {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents % 100 !== 0) return 'Enter a positive amount in whole dollars.';
  if (amountCents > 100_000_000) return 'The maximum contribution is $1,000,000.';
  return amountCents > limitCents ? `You can add up to ${formatCents(limitCents)} based on the balance in that account.` : null;
}

export interface ContributionLimit {
  availableCents: number;
  budgetCents: number | null;
  usedCents: number;
  remainingBudgetCents: number | null;
  maxCents: number;
}
