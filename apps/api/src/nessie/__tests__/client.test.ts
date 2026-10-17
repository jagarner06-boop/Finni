import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('../../env.js', () => ({ env: { NESSIE_KEY: 'test' } }));
import { nessie } from '../client.js';
beforeEach(() => vi.restoreAllMocks());
it('sees another API worker’s new ledger entries immediately', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch');
  fetch.mockResolvedValueOnce(Response.json([]));
  expect(await nessie.getWithdrawals('other-worker')).toEqual([]);
  fetch.mockResolvedValueOnce(Response.json([{ _id: 'external', amount: 80 }]));
  expect(await nessie.getWithdrawals('other-worker')).toEqual([{ _id: 'external', amount: 80 }]);
});
it('does not reuse balances cached while a write was in flight', async () => {
  let complete!: (value: Response) => void;
  const fetch = vi.spyOn(globalThis, 'fetch');
  fetch.mockImplementationOnce(() => new Promise<Response>((r) => { complete = r; }));
  fetch.mockResolvedValueOnce(Response.json([]));
  const write = nessie.createDeposit('cache-race', { amount: 50, description: 'test' });
  expect(await nessie.getDeposits('cache-race')).toEqual([]);
  complete(Response.json({ objectCreated: { _id: 'deposit' } }));
  await write;
  fetch.mockResolvedValueOnce(Response.json([{ _id: 'deposit', amount: 50 }]));
  expect(await nessie.getDeposits('cache-race')).toEqual([{ _id: 'deposit', amount: 50 }]);
});
