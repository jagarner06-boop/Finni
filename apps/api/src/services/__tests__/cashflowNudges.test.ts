import type { Account, CashflowForecast } from '@finni/shared';
import { beforeEach, expect, it, vi } from 'vitest';
import type { User } from '../../db/schema.js';

const state = vi.hoisted(() => ({ rows: [] as any[], actions: [] as any[], forecast: null as CashflowForecast | null, savings: 40_000, createAction: vi.fn(), beforeActionUpdate: null as (() => void) | null }));
vi.mock('../../env.js', () => ({ env: {} }));
vi.mock('../../db/client.js', async () => {
  const schema = await import('../../db/schema.js');
  const { PgDialect } = await import('drizzle-orm/pg-core');
  // Evaluate the emitted WHERE expression against in-memory rows; keep the real Drizzle predicates.
  const matches = (where: any, row: any) => {
    const { sql, params } = new PgDialect().sqlToQuery(where);
    const expression = sql.replace(/"\w+"\."(\w+)"/g, (_, key: string) => `r["${key.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())}"]`)
      .replace(/\$(\d+)/g, (_, n: string) => `p[${Number(n) - 1}]`)
      .replace(/ is not null/g, ' != null').replace(/ is null/g, ' == null').replace(/ = /g, ' === ')
      .replace(/ and /g, ' && ').replace(/ or /g, ' || ');
    return new Function('r', 'p', `return ${expression}`)(row, params.map((p) => typeof p === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(p) ? new Date(p).getTime() : p));
  };
  const rowsFor = (table: unknown) => table === schema.pendingActions ? state.actions : table === schema.nudges ? state.rows : [];
  const db = {
    query: {
      nudges: { findFirst: async ({ where }: any) => state.rows.find((r) => matches(where, r)) },
      pendingActions: { findFirst: async ({ where }: any) => state.actions.find((r) => matches(where, r)) },
    },
    select: () => ({ from: (table: unknown) => ({ where: async (where: any) => rowsFor(table).filter((r) => matches(where, r)) }) }),
    update: (table: unknown) => ({ set: (patch: any) => ({ where: (where: any) => {
      if (table === schema.pendingActions) state.beforeActionUpdate?.();
      const rows = rowsFor(table).filter((r) => matches(where, r));
      rows.forEach((r) => Object.assign(r, patch));
      return Object.assign(Promise.resolve(rows), { returning: async () => rows });
    } }) }),
    insert: () => ({ values: (values: any) => {
      const insert = (patch?: any) => {
        const inserted: any[] = [];
        for (const v of Array.isArray(values) ? values : [values]) {
          const existing = state.rows.find((r) => r.userId === v.userId && r.dedupeKey === v.dedupeKey);
          if (existing) { if (patch) Object.assign(existing, patch); }
          else { const row = { id: `n${state.rows.length}`, readAt: null, notifiedAt: null, dismissedAt: null, resolvedAt: null, createdAt: new Date(), ...v }; state.rows.push(row); inserted.push(row); }
        }
        return { returning: async () => inserted };
      };
      return { onConflictDoNothing: () => insert(), onConflictDoUpdate: ({ set }: any) => insert(set) };
    } }),
  };
  return { db, schema };
});
vi.mock('../accounts.js', () => ({ listAccounts: async () => [
  { id: 'chk', nickname: 'Everyday', type: 'Checking', balanceCents: state.forecast?.balanceCents ?? 10_000 },
  { id: 'sav', nickname: 'Rainy Day', type: 'Savings', balanceCents: state.savings },
] as Account[] }));
vi.mock('../cashflow.js', () => ({ getCashflow: async () => state.forecast }));
vi.mock('../card.js', () => ({ getCardSummary: async () => null }));
vi.mock('../bills.js', () => ({ listBills: async () => [] }));
vi.mock('../transactions.js', () => ({ listPurchases: async () => [] }));
vi.mock('../activity.js', () => ({ refundedPurchaseIds: async () => new Set() }));
vi.mock('../goals.js', () => ({ listGoals: async () => [], findGoalRow: vi.fn() }));
vi.mock('../actions.js', () => ({ createAction: state.createAction, toPendingAction: (row: unknown) => row }));
import { actOnNudge, scanNudges } from '../nudges.js';

const user = { id: 'u', checkingAccountId: 'chk', savingsAccountId: 'sav' } as User;
const short = (amount = 2_500): CashflowForecast => ({
  balanceCents: 4_500 - amount, paycheck: null, untilDate: '2026-10-30',
  commitments: [{ kind: 'bill', id: 'b', label: 'Phone', date: '2026-10-19', amountCents: 4_500 }],
  billsCents: 4_500, goalsCents: 0, safeCents: -amount, shortCents: amount,
  firstShort: { kind: 'bill', id: 'b', label: 'Phone', date: '2026-10-19', amountCents: 4_500 },
});
const warning = () => state.rows.find((r) => r.rule === 'cash_short')!;
beforeEach(() => { state.rows = []; state.actions = []; state.forecast = short(); state.savings = 40_000; state.beforeActionUpdate = null; state.createAction.mockReset().mockImplementation(async (_user, req) => ({ ...req, status: 'pending' })); });

it('refreshes the cover when a second purchase increases the shortfall', async () => {
  await scanNudges(user);
  state.forecast = short(7_500);
  await scanNudges(user);
  expect(state.rows.filter((r) => r.rule === 'cash_short')).toHaveLength(1);
  expect(warning().action.amountCents).toBe(7_500);
  expect(warning().body).toContain('$75.00 short');
});
it('adds an offer when savings becomes sufficient', async () => {
  state.savings = 0;
  await scanNudges(user);
  expect(warning().action).toBeNull();
  state.savings = 40_000;
  await scanNudges(user);
  expect(warning().action?.amountCents).toBe(2_500);
});
it('resolves a warning even when there was no savings offer', async () => {
  state.savings = 0;
  await scanNudges(user);
  state.forecast = { ...short(), balanceCents: 10_000, safeCents: 5_500, shortCents: 0, firstShort: null };
  await scanNudges(user);
  expect(warning().resolvedAt).toBeInstanceOf(Date);
});
it('reopens a warning when another shortfall occurs before the same payday', async () => {
  await scanNudges(user);
  state.forecast = { ...short(), shortCents: 0, firstShort: null };
  await scanNudges(user);
  warning().dismissedAt = new Date();
  state.forecast = short(5_000);
  await scanNudges(user);
  expect(warning().resolvedAt).toBeNull();
  expect(warning().dismissedAt).toBeNull();
  expect(warning().action.amountCents).toBe(5_000);
});
it('rechecks the cover before creating a pending transfer', async () => {
  await scanNudges(user);
  state.forecast = short(7_550);
  const action = await actOnNudge(user, warning().id);
  expect(action).toMatchObject({ type: 'transfer', amountCents: 7_600, status: 'pending' });
});
it('expires an older pending cover when the amount has changed', async () => {
  await scanNudges(user);
  state.actions.push({ id: 'old', nudgeId: warning().id, status: 'pending', expiresAt: new Date(Date.now() + 60_000), amountCents: 2_500, payload: { fromAccountId: 'sav', toAccountId: 'chk' } });
  state.forecast = short(5_000);
  const action = await actOnNudge(user, warning().id);
  expect(action).toMatchObject({ type: 'transfer', amountCents: 5_000 });
  expect(state.actions[0].status).toBe('expired');
});
it('does not create a transfer after Checking has been replenished', async () => {
  await scanNudges(user);
  state.forecast = { ...short(), shortCents: 0, firstShort: null };
  await expect(actOnNudge(user, warning().id)).rejects.toMatchObject({ code: 'nudge_resolved' });
  expect(state.createAction).not.toHaveBeenCalled();
});
it('does not offer an unaffordable transfer after savings changes', async () => {
  await scanNudges(user);
  state.savings = 0;
  await expect(actOnNudge(user, warning().id)).rejects.toMatchObject({ code: 'nudge_not_actionable' });
  expect(state.createAction).not.toHaveBeenCalled();
});
it('keeps a current pending cover on repeated taps', async () => {
  await scanNudges(user);
  const existing = { id: 'same', nudgeId: warning().id, status: 'pending', expiresAt: new Date(Date.now() + 60_000), amountCents: 2_500, payload: { fromAccountId: 'sav', toAccountId: 'chk' } };
  state.actions.push(existing);
  expect(await actOnNudge(user, warning().id)).toEqual(existing);
  expect(state.createAction).not.toHaveBeenCalled();
});
it('preserves dismissal while the same warning stays open', async () => {
  await scanNudges(user);
  const dismissed = new Date();
  warning().dismissedAt = dismissed;
  await scanNudges(user);
  expect(warning().dismissedAt).toEqual(dismissed);
});

it('does not overwrite an approval that starts while an old cover is expiring', async () => {
  await scanNudges(user);
  state.actions.push({ id: 'old', nudgeId: warning().id, status: 'pending', expiresAt: new Date(Date.now() + 60_000), amountCents: 2_500, payload: { fromAccountId: 'sav', toAccountId: 'chk' } });
  state.forecast = short(5_000);
  state.beforeActionUpdate = () => { state.actions[0].status = 'executing'; };
  await expect(actOnNudge(user, warning().id)).rejects.toMatchObject({ code: 'action_in_progress' });
  expect(state.actions[0].status).toBe('executing');
  expect(state.createAction).not.toHaveBeenCalled();
});
