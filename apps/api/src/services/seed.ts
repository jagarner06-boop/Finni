import { eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import type { User } from "../db/schema.js";
import { isoDay, nextMonthDay } from "../lib/dates.js";
import { nessie } from "../nessie/client.js";
import { merchantIds } from "../seed/merchants.js";
import type { PersonaAccount, PersonaPlan } from "../seed/personas/alex.js";

/** Runs async tasks with at most `limit` in flight (keeps Nessie from rate-limiting us). */
async function runLimited(tasks: (() => Promise<unknown>)[], limit = 6): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) await tasks[next++]();
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
}

/**
 * Fills a freshly bootstrapped user's Nessie accounts with the persona's history, bills and goal.
 * Always stamps `seededAt` at the end, even on failure, so the app's "setting up" loader can't hang.
 */
export async function seedPersona(user: User, plan: PersonaPlan): Promise<void> {
  const started = Date.now();
  try {
    const merchants = merchantIds();
    const checking = user.checkingAccountId;
    // Users from before the card existed get card spending on checking.
    const accountFor = (a: PersonaAccount | undefined) => (a === "card" && user.creditAccountId ? user.creditAccountId : checking);

    // Goal accounts first: they're quick and the Goals tab shows them immediately.
    for (const g of plan.goals) {
      const account = await nessie.createAccount(user.nessieCustomerId, { type: "Savings", nickname: g.name, rewards: 0, balance: g.currentDollars });
      const done = g.currentDollars >= g.targetDollars;
      await db.insert(schema.goals).values({
        userId: user.id,
        name: g.name,
        emoji: g.icon,
        targetCents: g.targetDollars * 100,
        targetDate: done ? null : isoDay(g.targetInDays),
        nessieAccountId: account._id,
        milestonesHit: g.milestonesHit,
        status: done ? "completed" : "active",
        completedAt: done ? new Date() : null,
        cadence: g.cadence ?? null,
        contributionCents: g.contributionDollars ? g.contributionDollars * 100 : null,
        fromAccountId: g.cadence ? checking : null,
        nextContributionOn: g.cadence ? isoDay(g.nextInDays ?? 0) : null,
      });
    }

    await runLimited([
      ...plan.deposits.map((d) => () => nessie.createDeposit(checking, { amount: d.amount, description: d.description, transaction_date: isoDay(-d.daysAgo) })),
      ...plan.withdrawals.map((w) => () => nessie.createWithdrawal(checking, { amount: w.amount, description: w.description, transaction_date: isoDay(-w.daysAgo) })),
      ...plan.purchases.map((p) => () => nessie.createPurchase(accountFor(p.account), { merchant_id: merchants[p.merchant], amount: p.amount, purchase_date: isoDay(-p.daysAgo) })),
      // Nessie can't read a bill back unless it has both payment_date and recurring_date.
      ...plan.bills.map((b) => () => {
        const paymentDate = b.recurringDay ? nextMonthDay(b.recurringDay) : isoDay(b.dueInDays ?? 0);
        return nessie.createBill(accountFor(b.account), {
          status: b.recurringDay ? "recurring" : "pending",
          payee: b.payee,
          nickname: b.nickname,
          payment_amount: b.amount,
          payment_date: paymentDate,
          recurring_date: Number(paymentDate.slice(8)),
        });
      }),
    ]);
    console.log(`seeded ${user.id} in ${Date.now() - started}ms`);
  } catch (err) {
    console.error(`seeding ${user.id} failed`, err);
  } finally {
    await db.update(schema.users).set({ seededAt: new Date() }).where(eq(schema.users.id, user.id));
  }
}
