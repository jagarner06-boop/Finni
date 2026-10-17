import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), release: vi.fn(), reserve: vi.fn() }));
vi.mock('postgres', () => ({ default: () => ({ reserve: mocks.reserve }) }));
vi.mock('../../env.js', () => ({ env: { DATABASE_URL: 'postgres://test' } }));
vi.mock('../users.js', () => ({ HttpError: class extends Error { constructor(public status: number, public code: string, message: string) { super(message); } } }));
import { withApprovalLock } from '../approvalLock.js';
beforeEach(() => { vi.clearAllMocks(); mocks.reserve.mockResolvedValue(Object.assign(mocks.query, { release: mocks.release })); });
it('unlocks and releases its dedicated connection when execution fails', async () => {
  mocks.query.mockResolvedValueOnce([{ locked: true }]).mockResolvedValueOnce([{ unlocked: true }]);
  await expect(withApprovalLock('user', async () => { throw new Error('failed'); })).rejects.toThrow('failed');
  expect(mocks.query).toHaveBeenCalledTimes(2);
  expect(mocks.release).toHaveBeenCalledTimes(1);
});
it('never executes another action when a different worker owns the user lock', async () => {
  mocks.query.mockResolvedValueOnce([{ locked: false }]);
  const work = vi.fn();
  await expect(withApprovalLock('user', work)).rejects.toMatchObject({ code: 'approval_in_progress' });
  expect(work).not.toHaveBeenCalled();
  expect(mocks.release).toHaveBeenCalledTimes(1);
});
