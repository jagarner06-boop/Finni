import { contributionError, contributionLimitCents, type Account, type ContributionLimit } from '@finni/shared';
import type { User } from '../db/schema.js';
import { HttpError } from './users.js';

/**
 * How much can go into a goal from `from`: whatever that account holds. There's no monthly savings
 * cap; saving more is always allowed (it used to silently shrink a $1,000 move to $50).
 * The shape keeps the budget fields (always null/0) so the app's "Add to goal" sheet works unchanged.
 */
export async function contributionLimit(_user: User, from: Account): Promise<ContributionLimit> {
  return { availableCents: from.balanceCents, budgetCents: null, usedCents: 0, remainingBudgetCents: null, maxCents: contributionLimitCents(from.balanceCents) };
}

export async function requireContribution(user: User, from: Account, amountCents: number) {
  const limit = await contributionLimit(user, from);
  const error = contributionError(amountCents, limit.maxCents);
  if (error) throw new HttpError(400, 'contribution_limit', error);
}
