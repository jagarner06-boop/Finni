import type { Account } from "@finni/shared";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import type { User } from "../db/schema.js";
import { nessie } from "../nessie/client.js";
import { liveBalanceCents } from "./ledger.js";

/** The user's Nessie accounts with ledger-derived balances; goal accounts are flagged. */
export async function listAccounts(user: User): Promise<Account[]> {
  const [raw, goalRows] = await Promise.all([
    nessie.getCustomerAccounts(user.nessieCustomerId),
    db.select({ id: schema.goals.id, accountId: schema.goals.nessieAccountId }).from(schema.goals).where(eq(schema.goals.userId, user.id)),
  ]);
  const goalByAccount = new Map(goalRows.map((g) => [g.accountId, g.id]));
  return Promise.all(
    raw.map(async (a) => ({
      id: a._id,
      nickname: a.nickname,
      type: a.type,
      balanceCents: await liveBalanceCents(a),
      isGoal: goalByAccount.has(a._id),
      goalId: goalByAccount.get(a._id),
    })),
  );
}
