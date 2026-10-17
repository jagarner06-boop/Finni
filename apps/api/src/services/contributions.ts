import { contributionError, contributionLimitCents, type Account, type ContributionLimit } from '@finni/shared';
import { and, eq, gte, lt, sql } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import type { User } from '../db/schema.js';
import { HttpError } from './users.js';

export async function contributionLimit(user: User, from: Account, now = new Date()): Promise<ContributionLimit> {
  const budgetCents = user.prefs.monthlySavingsBudgetCents ?? null;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const [usage] = await db.select({ used: sql<number>`coalesce(sum(${schema.pendingActions.amountCents}), 0)::int` })
    .from(schema.pendingActions)
    .innerJoin(schema.goals, and(eq(schema.goals.userId, user.id), eq(schema.goals.nessieAccountId, sql`${schema.pendingActions.payload}->>'toAccountId'`)))
    .where(and(eq(schema.pendingActions.userId, user.id), eq(schema.pendingActions.type, 'transfer'), eq(schema.pendingActions.status, 'executed'), gte(schema.pendingActions.executedAt, start), lt(schema.pendingActions.executedAt, end)));
  const usedCents = Number(usage?.used ?? 0);
  return { availableCents: from.balanceCents, budgetCents, usedCents, remainingBudgetCents: budgetCents === null ? null : Math.max(0, budgetCents - usedCents), maxCents: contributionLimitCents(from.balanceCents, budgetCents, usedCents) };
}

export async function requireContribution(user: User, from: Account, amountCents: number) {
  const limit = await contributionLimit(user, from);
  const error = contributionError(amountCents, limit.maxCents);
  if (error) throw new HttpError(400, 'contribution_limit', error);
}
