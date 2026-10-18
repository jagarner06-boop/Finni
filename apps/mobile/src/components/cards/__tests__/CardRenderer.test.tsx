import type { CashflowForecast, Card } from '@finni/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { CardRenderer } from '@/components/cards/CardRenderer';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const localDate = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const transactions: Card = {
  type: 'transaction_list',
  transactions: [{ id: 'tx_1', accountId: 'acc_1', merchantName: 'Spotify', category: 'Music', amountCents: 1499, date: localDate(-3) }],
};

const approval = (status: Extract<Card, { type: 'approval' }>['status']): Card => ({
  type: 'approval',
  actionId: 'act_1',
  actionType: 'bill_payment',
  title: 'Pay $1,184.20 before Oct 22.',
  amountCents: 118420,
  fromLabel: 'Everyday Checking',
  toLabel: 'Closer Card',
  requiresStepUp: true,
  status,
  expiresAt: '2026-10-22T00:00:00.000Z',
});

beforeEach(() => jest.clearAllMocks());

describe('CardRenderer', () => {
  it('lists transactions as money out', async () => {
    await render(<CardRenderer card={transactions} />);
    expect(screen.getByText('Spotify')).toBeTruthy();
    expect(screen.getByText('−$14.99')).toBeTruthy();
  });

  it('draws one bar per spending item', async () => {
    const card: Card = {
      type: 'spending_breakdown',
      days: 30,
      groupBy: 'category',
      totalCents: 60000,
      items: [
        { label: 'Food', amountCents: 30000, percent: 50 },
        { label: 'Rides', amountCents: 18000, percent: 30 },
        { label: 'Music', amountCents: 12000, percent: 20 },
      ],
    };
    await render(<CardRenderer card={card} />);
    expect(screen.getAllByTestId('spend-bar', { includeHiddenElements: true })).toHaveLength(3);
  });

  it('marks a pending bill with a due chip', async () => {
    const card: Card = {
      type: 'bill_list',
      bills: [{ id: 'bill_1', accountId: 'acc_1', payee: 'Closer Card', amountCents: 118420, dueDate: localDate(1), status: 'pending' }],
    };
    await render(<CardRenderer card={card} />);
    expect(screen.getByText('Due tomorrow')).toBeTruthy();
  });

  it('says so when a list is empty', async () => {
    await render(<CardRenderer card={{ type: 'transaction_list', transactions: [] }} />);
    expect(screen.getByText('No transactions in this range.')).toBeTruthy();
  });

  it('opens the approval sheet from a pending approval', async () => {
    await render(<CardRenderer card={approval('pending')} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Review payment' }));
    expect(router.push).toHaveBeenCalledWith('/approve/act_1');
  });

  it('says Done once the action executed', async () => {
    await render(<CardRenderer card={approval('executed')} />);
    expect(screen.getByText('Done.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Review payment' })).toBeNull();
  });

  it('says nothing moved when the action failed', async () => {
    await render(<CardRenderer card={approval('failed')} />);
    expect(screen.getByText(/Nothing was moved\./)).toBeTruthy();
  });

  it('shows a stale pending approval as expired instead of offering Review', async () => {
    await render(<CardRenderer card={{ ...approval('pending'), expiresAt: '2020-01-01T00:00:00.000Z' } as Card} />);
    expect(screen.getByText('Expired. Nothing was moved.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Review payment' })).toBeNull();
  });

  it('leaves rows as plain text when nothing handles taps', async () => {
    await render(<CardRenderer card={transactions} />);
    expect(screen.queryByRole('button', { name: /Spotify/ })).toBeNull();
  });

  it('reports which row was tapped', async () => {
    const onRowPress = jest.fn();
    await render(<CardRenderer card={transactions} onRowPress={onRowPress} />);
    await fireEvent.press(screen.getByRole('button', { name: /Spotify/ }));
    expect(onRowPress).toHaveBeenCalledWith('tx_1');
  });
});

const forecast: CashflowForecast = {
  balanceCents: 214_000, paycheck: { date: "2026-10-29", amountCents: 62_000, source: "Campus job", basis: "deposits" }, untilDate: "2026-10-28",
  commitments: [
    { kind: "goal", id: "car", label: "Car repair", date: "2026-10-17", amountCents: 4_000 },
    { kind: "bill", id: "b", label: "Phone", date: "2026-10-19", amountCents: 4_500 },
    { kind: "goal", id: "hawaii", label: "Hawaii Fund", date: "2026-10-20", amountCents: 5_000 },
    { kind: "goal", id: "hawaii", label: "Hawaii Fund", date: "2026-10-27", amountCents: 5_000 },
  ], billsCents: 4_500, goalsCents: 14_000, safeCents: 195_500, shortCents: 0, firstShort: null,
};

it('shows what is safe to spend after bills and goals', async () => {
  await render(<CardRenderer card={{ type: 'safe_to_spend', forecast }} />);
  expect(screen.getByText('Before your paycheck Oct 29')).toBeTruthy();
  expect(screen.getByText('Phone')).toBeTruthy();
  expect(screen.getByText('−$45.00')).toBeTruthy();
  expect(screen.getByText('Safe to spend')).toBeTruthy();
  expect(screen.getByText('$1,955.00')).toBeTruthy();
});
it('shows the gap when a purchase does not fit', async () => {
  await render(<CardRenderer card={{ type: 'safe_to_spend', forecast, askedCents: 200_000 }} />);
  expect(screen.getByText('This purchase')).toBeTruthy();
  expect(screen.getByText('Short by')).toBeTruthy();
  expect(screen.getByText('$45.00')).toBeTruthy();
});
it('says next 2 weeks without a paycheck', async () => {
  await render(<CardRenderer card={{ type: 'safe_to_spend', forecast: { ...forecast, paycheck: null } }} />);
  expect(screen.getByText('Next 2 weeks')).toBeTruthy();
});
