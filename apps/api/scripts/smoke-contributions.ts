// Isolated sandbox user: verifies budget enforcement at proposal AND execution, plus live progress.
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { db, schema } from '../src/db/client.js';
import { bootstrapUser } from '../src/services/users.js';
import { listAccounts } from '../src/services/accounts.js';
import { listGoals } from '../src/services/goals.js';
import { createAction, approveAction } from '../src/services/actions.js';
import { contributionLimit } from '../src/services/contributions.js';

const { user: initial } = await bootstrapUser(`smoke|contributions-${Date.now()}`, { firstName: 'BudgetTest' });
for (let i = 0; i < 60; i++) {
  if ((await db.query.users.findFirst({ where: eq(schema.users.id, initial.id) }))?.seededAt) break;
  await new Promise((r) => setTimeout(r, 1000));
}
const [user] = await db.update(schema.users).set({ prefs: { ...initial.prefs, monthlySavingsBudgetCents: 5000 } }).where(eq(schema.users.id, initial.id)).returning();
const accounts = await listAccounts(user);
const from = accounts.find((a) => a.type === 'Checking')!;
const goal = (await listGoals(user))[0];
const propose = (amountCents: number) => createAction(user, { type: 'transfer', fromAccountId: from.id, toAccountId: goal.nessieAccountId, amountCents }, 'chat');
assert.equal((await contributionLimit(user, from)).maxCents, 5000);
await assert.rejects(propose(5100), /up to \$50\.00/);
await assert.rejects(propose(1250), /whole dollars/);
const first = await propose(3700), stale = await propose(5000);
assert.equal((await approveAction(user, first.id)).status, 'executed');
const beforeStale = (await listGoals(user)).find((g) => g.id === goal.id)!;
assert.equal(beforeStale.currentCents, goal.currentCents + 3700);
assert.equal((await contributionLimit(user, from)).remainingBudgetCents, 1300);
assert.equal((await approveAction(user, stale.id)).status, 'failed');
assert.equal((await listGoals(user)).find((g) => g.id === goal.id)!.currentCents, beforeStale.currentCents);
assert.equal((await approveAction(user, (await propose(1300)).id)).status, 'executed');
assert.equal((await contributionLimit(user, from)).maxCents, 0);
await assert.rejects(propose(100), /up to \$0\.00/);
// Increasing the budget leaves $50. Two $40 approvals must never both execute.
await db.update(schema.users).set({ prefs: { ...user.prefs, monthlySavingsBudgetCents: 10000 } }).where(eq(schema.users.id, user.id));
const fresh = (await db.query.users.findFirst({ where: eq(schema.users.id, user.id) }))!;
const req = { type: 'transfer' as const, fromAccountId: from.id, toAccountId: goal.nessieAccountId, amountCents: 4000 };
const one = await createAction(fresh, req, 'chat'), two = await createAction(fresh, req, 'chat');
const concurrent = await Promise.allSettled([approveAction(fresh, one.id), approveAction(fresh, two.id)]);
assert.equal(concurrent.filter((r) => r.status === 'fulfilled' && r.value.status === 'executed').length, 1);
assert.equal((await contributionLimit(fresh, from)).usedCents, 9000);
console.log('Passed: custom amount, exact budget, stale approval, monthly usage, live goal progress, concurrent approvals.');
process.exit(0);
