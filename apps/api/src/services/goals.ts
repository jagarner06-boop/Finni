import type { Goal, GoalIcon } from "@finni/shared";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import type { User } from "../db/schema.js";
import { nessie } from "../nessie/client.js";
import { liveBalanceCents } from "./ledger.js";

type GoalRow = typeof schema.goals.$inferSelect;

export const goalPercent = (currentCents: number, targetCents: number) => (targetCents > 0 ? Math.min(100, Math.round((currentCents / targetCents) * 100)) : 0);

/** A goal row joined with its Nessie account's live balance. */
export async function toGoal(row: GoalRow): Promise<Goal> {
  const currentCents = await liveBalanceCents(await nessie.getAccount(row.nessieAccountId));
  return {
    id: row.id,
    name: row.name,
    icon: (row.emoji as GoalIcon | null) ?? null,
    targetCents: row.targetCents,
    currentCents,
    percent: goalPercent(currentCents, row.targetCents),
    targetDate: row.targetDate,
    nessieAccountId: row.nessieAccountId,
    milestonesHit: row.milestonesHit,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    cadence: row.cadence,
    contributionCents: row.contributionCents,
    nextContributionOn: row.nextContributionOn,
    eta: null,
    behind: false,
  };
}

export async function listGoals(user: User): Promise<Goal[]> {
  const rows = await db.select().from(schema.goals).where(eq(schema.goals.userId, user.id)).orderBy(asc(schema.goals.createdAt));
  return Promise.all(rows.map(toGoal));
}

export async function findGoalRow(user: User, where: { id?: string; nessieAccountId?: string }): Promise<GoalRow | undefined> {
  const match = where.id ? eq(schema.goals.id, where.id) : eq(schema.goals.nessieAccountId, where.nessieAccountId ?? "");
  return db.query.goals.findFirst({ where: and(eq(schema.goals.userId, user.id), match) });
}
