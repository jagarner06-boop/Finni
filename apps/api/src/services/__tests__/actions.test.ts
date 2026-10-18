import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ returning: vi.fn(), insert: vi.fn(), move: vi.fn(), chat: vi.fn(), goal: vi.fn(), toGoal: vi.fn() }));
vi.mock('../../env.js', () => ({ env: { STEP_UP_THRESHOLD: 100 } }));
vi.mock('../../db/client.js', async () => {
  const schema = await import('../../db/schema.js');
  const update = () => ({ set: () => ({ where: () => ({ returning: mocks.returning }) }) });
  const db = { update, insert: () => ({ values: mocks.insert }), query: { users: { findFirst: async () => ({ id: 'user', prefs: {} }) }, chatMessages: { findFirst: mocks.chat } } };
  return { db, schema };
});
vi.mock('../accounts.js', () => ({ listAccounts: async () => [{ id: 'from', nickname: 'Checking', balanceCents: 10000 }, { id: 'to', nickname: 'Savings 🎯', balanceCents: 0 }] }));
vi.mock('../ownership.js', () => ({ ownedAccount: async (_user: unknown, id: string, accounts: { id: string }[]) => accounts.find((a) => a.id === id) }));
vi.mock('../goals.js', () => ({ findGoalRow: mocks.goal, toGoal: mocks.toGoal }));
vi.mock('../ledger.js', () => ({ moveMoney: mocks.move }));
vi.mock('../nudges.js', () => ({ scanNudges: async () => [] }));
vi.mock('../contributions.js', () => ({ requireContribution: async () => {} }));
vi.mock('../approvalLock.js', () => ({ withApprovalLock: async (_id: string, work: () => unknown) => work() }));
import { approveAction } from '../actions.js';
import type { User } from '../../db/schema.js';
const claimed = { id: 'a1', userId: 'user', type: 'transfer', status: 'executing', amountCents: 5000, payload: { fromAccountId: 'from', toAccountId: 'to', display: { title: 'Move $50' } }, createdAt: new Date(), expiresAt: new Date(Date.now() + 60000) };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.goal.mockResolvedValue(undefined);
  mocks.move.mockResolvedValue({ withdrawalId: 'w', depositId: 'd' });
  mocks.returning.mockResolvedValueOnce([claimed]).mockResolvedValueOnce([{ ...claimed, status: 'executed', executedAt: new Date() }]).mockResolvedValueOnce([{ ...claimed, status: 'failed' }]);
});
it('keeps an executed transfer successful if its confirmation message cannot be saved', async () => {
  mocks.insert.mockRejectedValue(new Error('chat unavailable'));
  const action = await approveAction({ id: 'user' } as User, 'a1');
  expect(action.status).toBe('executed');
  expect(mocks.move).toHaveBeenCalledTimes(1);
  expect(mocks.returning).toHaveBeenCalledTimes(2);
});
it('posts no Finn chat message for results, and keeps the result line emoji-free', async () => {
  mocks.insert.mockResolvedValue(undefined);
  const action = await approveAction({ id: 'user' } as User, 'a1');
  // A "Paid $45.00 to Visible." line from Finn read as Finn paying it; the card turning Done is the result.
  expect(mocks.insert).not.toHaveBeenCalled();
  expect(action.resultLine ?? '').not.toMatch(/\p{Extended_Pictographic}/u);
});
it('keeps a completed deposit successful when fetching its progress card fails', async () => {
  mocks.insert.mockResolvedValue(undefined);
  mocks.goal.mockResolvedValue({ id: 'goal', milestonesHit: [], cadence: null });
  mocks.toGoal.mockRejectedValue(new Error('balance read failed'));
  expect((await approveAction({ id: 'user' } as User, 'a1')).status).toBe('executed');
  expect(mocks.move).toHaveBeenCalledTimes(1);
});
