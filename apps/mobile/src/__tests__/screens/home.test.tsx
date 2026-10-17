import type { HomeResponse, Nudge } from '@finni/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

import { api } from '@/api/endpoints';
import HomeScreen from '@/app/(tabs)/index';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/api/endpoints', () => ({
  api: { home: jest.fn(), actOnNudge: jest.fn(), scanNudges: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const planId = 'nudge_plan';
const actionId = 'act_1';

const nudge = (over: Partial<Nudge>): Nudge => ({
  id: 'n',
  rule: 'duplicate_charge',
  title: 'Duplicate charge',
  body: 'Spotify charged you twice.',
  mood: 'worried',
  severity: 'danger',
  face: null,
  meta: 'Spotify · $15.00 · Oct 14',
  highlight: null,
  action: { type: 'propose_dispute', purchaseId: 'p1', label: 'Dispute' },
  notifiedAt: null,
  readAt: null,
  dismissedAt: null,
  resolvedAt: null,
  createdAt: '2026-10-17T12:00:00Z',
  ...over,
});

const checking = {
  id: 'acc_chk',
  type: 'Checking' as const,
  nickname: 'Everyday',
  mask: '1093',
  balanceCents: 214_000,
};

const full: HomeResponse = {
  firstName: 'Gabe',
  card: {
    accountId: 'acc_card',
    nickname: 'Closer Card',
    mask: '4821',
    balanceCents: 136_400,
    limitCents: 200_000,
    utilization: 68,
    statementCloseDate: '2026-10-22',
    closesInDays: 5,
  },
  checking: checking as HomeResponse['checking'],
  plan: nudge({
    id: planId,
    rule: 'high_utilization',
    title: 'Card plan',
    body: 'I can drop your utilization to 9% before Oct 22.',
    highlight: '9%',
    mood: 'celebrating',
    severity: 'info',
    action: { type: 'propose_card_payment', amountCents: 118_400, label: 'Review plan' },
  }),
  attention: [
    nudge({ id: 'n1' }),
    nudge({ id: 'n2', rule: 'trial_converted', title: 'Free trial converted', severity: 'warning', meta: 'Hulu · $17.99 · Oct 12' }),
  ],
  attentionCount: 2,
  goals: { count: 2, savedCents: 52_000 },
  hideBalance: false,
};

function wrap(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

beforeEach(() => jest.clearAllMocks());

describe('Home screen', () => {
  it('shows the card, plan, and attention rows, and opens the plan for approval', async () => {
    mockApi.home.mockResolvedValue(full);
    mockApi.actOnNudge.mockResolvedValue({ action: { id: actionId } } as never);
    await render(wrap(<HomeScreen />));
    expect(await screen.findByText(/Gabe/)).toBeTruthy();
    expect(screen.getByLabelText('Closer Card ending 4821, balance $1,364.00')).toBeTruthy();
    expect(screen.getByText('Duplicate charge')).toBeTruthy();
    expect(screen.getByText('Free trial converted')).toBeTruthy();
    await fireEvent.press(screen.getByText('Review plan →'));
    await waitFor(() => expect(mockApi.actOnNudge).toHaveBeenCalledWith(planId));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/approve/${actionId}`));
  });

  it('falls back to Checking with no card, no plan, and nothing to fix', async () => {
    mockApi.home.mockResolvedValue({ ...full, card: null, plan: null, attention: [], attentionCount: 0 });
    await render(wrap(<HomeScreen />));
    expect(await screen.findByLabelText(/Everyday ending/)).toBeTruthy();
    expect(screen.queryByText(/Utilization/)).toBeNull();
    expect(screen.getByText("You're all caught up.")).toBeTruthy();
    expect(screen.queryByText('Needs attention')).toBeNull();
    await fireEvent.press(screen.getByText('Ask Finn →'));
    expect(router.push).toHaveBeenCalledWith('/finn');
  });

  it('hides the balance when asked', async () => {
    mockApi.home.mockResolvedValue({ ...full, hideBalance: true });
    await render(wrap(<HomeScreen />));
    expect(await screen.findByLabelText(/balance hidden/)).toBeTruthy();
  });

  it('shows the error with Try again', async () => {
    mockApi.home.mockRejectedValue(new Error('down'));
    await render(wrap(<HomeScreen />));
    expect(await screen.findByText("Couldn't load your accounts.")).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
  });

  it('opens goals and the chat from the bottom rows', async () => {
    mockApi.home.mockResolvedValue(full);
    await render(wrap(<HomeScreen />));
    await fireEvent.press(await screen.findByText(/Goals · 2 · \$520\.00 saved/));
    expect(router.push).toHaveBeenCalledWith('/goals');
    await fireEvent.press(screen.getByText('Ask your agent…'));
    expect(router.push).toHaveBeenCalledWith('/finn?focus=1');
  });
});
