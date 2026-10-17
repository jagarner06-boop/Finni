// Real model → goal approval → contribution approval → live goal progress, on an isolated user.
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { runAgent } from '../src/agent/loop.js';
import { db, schema } from '../src/db/client.js';
import { approveAction, getActionRow } from '../src/services/actions.js';
import { listGoals } from '../src/services/goals.js';
import { bootstrapUser } from '../src/services/users.js';

const { user } = await bootstrapUser(`smoke|chat-goals-${Date.now()}`, { firstName: 'ChatTest' });
for (let i = 0; i < 60; i++) {
  if ((await db.query.users.findFirst({ where: eq(schema.users.id, user.id) }))?.seededAt) break;
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
const reply = await runAgent(user, 'Create a savings goal named Laptop for $900 by May 2027.');
assert.equal(reply.actionIds.length, 1, `Expected a single proposal: ${reply.text}`);
const proposal = await getActionRow(user, reply.actionIds[0]);
assert.equal(proposal.type, 'create_goal');
assert.equal((proposal.payload as { targetCents: number }).targetCents, 90000);
assert.doesNotMatch(reply.text, /\p{Extended_Pictographic}|\bpropose_\w+|"args"/u);
assert.equal((await approveAction(user, proposal.id)).status, 'executed');
const goal = (await listGoals(user)).find((g) => g.name.toLowerCase() === 'laptop')!;
assert.ok(goal); assert.equal(goal.currentCents, 0);
const contribution = await runAgent(user, 'Add $37 from checking to my Laptop goal.');
assert.equal(contribution.actionIds.length, 1, contribution.text);
const transfer = await getActionRow(user, contribution.actionIds[0]);
assert.equal(transfer.type, 'transfer');
assert.equal(transfer.amountCents, 3700);
assert.equal((transfer.payload as { toAccountId: string }).toAccountId, goal.nessieAccountId);
assert.equal((await approveAction(user, transfer.id)).status, 'executed');
const after = (await listGoals(user)).find((g) => g.id === goal.id)!;
assert.equal(after.currentCents, 3700); assert.equal(after.percent, 4);
console.log('Passed: chat creates the requested $900 Laptop goal; approved $37 chat contribution is persisted at 4%.');
process.exit(0);
