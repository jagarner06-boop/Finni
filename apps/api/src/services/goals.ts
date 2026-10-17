import type { Goal, GoalIcon } from "@finni/shared";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import type { User } from "../db/schema.js";
import { goalEta, isBehind, goalPercent } from "../domain/goals.js";
import { isoDay } from "../lib/dates.js";
import { nessie } from "../nessie/client.js";
import { liveBalanceCents } from "./ledger.js";

type GoalRow = typeof schema.goals.$inferSelect;

export { goalPercent } from '../domain/goals.js';

/** A goal row joined with its Nessie account's live balance. */
export async function toGoal(row: GoalRow): Promise<Goal> {
  const currentCents = await liveBalanceCents(await nessie.getAccount(row.nessieAccountId));
  const eta = row.status === "active" ? goalEta({ currentCents, targetCents: row.targetCents, contributionCents: row.contributionCents, cadence: row.cadence }, isoDay()) : null;
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
    eta,
    behind: isBehind(eta, row.targetDate),
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
