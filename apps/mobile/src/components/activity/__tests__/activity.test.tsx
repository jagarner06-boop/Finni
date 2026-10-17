import type { LedgerEntry, Nudge } from '@finni/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { api } from '@/api/endpoints';
import ActivityScreen from '@/app/(tabs)/activity';

const mockParams: { segment?: string; accountId?: string } = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: jest.fn(),
}));
jest.mock('@/api/endpoints', () => ({
  api: { nudges: jest.fn(), transactions: jest.fn(), dismissNudge: jest.fn(), actOnNudge: jest.fn(), markNudgeRead: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const dupId = 'n_dup';

const nudge = (over: Partial<Nudge>): Nudge => ({
  id: dupId,
  rule: 'duplicate_charge',
  title: 'Duplicate charge',
  body: 'Spotify charged you $15.00 twice on Oct 14.',
  mood: 'worried',
  severity: 'danger',
  face: 'skeptical',
  meta: 'Spotify · $15.00 · Oct 14',
  highlight: '$15.00',
  action: { type: 'propose_dispute', purchaseId: 'p2', label: 'Get it back' },
  notifiedAt: null,
  readAt: null,
  dismissedAt: null,
  resolvedAt: null,
  createdAt: new Date().toISOString(),
  ...over,
});

const today = new Date();
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const entry = (over: Partial<LedgerEntry>): LedgerEntry => ({
  id: 'e1',
  accountId: 'acc_card',
  accountLabel: 'Closer Card',
  kind: 'purchase',
  title: 'Spotify',
  category: 'Subscriptions',
  amountCents: -1_500,
  date: iso(today),
  ...over,
});

let client: QueryClient;

/** Renders and waits for every query to settle, so no update lands outside act(). */
async function renderActivity() {
  await render(wrap(<ActivityScreen />));
  await waitFor(() => expect(client.isFetching()).toBe(0));
}

function wrap(ui: ReactNode) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </SafeAreaProvider>
  );
}

// Let refetches and mutations finish inside the test so no update lands outside act().
afterEach(async () => {
  await waitFor(() => expect(client.isFetching() + client.isMutating()).toBe(0));
});

beforeEach(() => {
  jest.clearAllMocks();
  delete mockParams.segment;
  delete mockParams.accountId;
  mockApi.nudges.mockResolvedValue({
    nudges: [
      nudge({}),
      nudge({ id: 'n_trial', rule: 'trial_converted', title: 'Free trial converted', face: null, action: null }),
      nudge({ id: 'n_done', rule: 'bill_due', title: 'Rent is due', readAt: today.toISOString(), resolvedAt: today.toISOString(), action: { type: 'propose_bill_payment', billId: 'b1', label: 'Pay rent' } }),
    ],
  });
  mockApi.transactions.mockResolvedValue({
    entries: [
      entry({}),
      entry({ id: 'e2' }),
      entry({ id: 'e3', kind: 'deposit', title: 'Payroll', category: undefined, accountId: 'acc_chk', accountLabel: 'Everyday', amountCents: 120_000 }),
    ],
  });
});

describe('Activity', () => {
  it('counts unread nudges and shows transactions with signed amounts', async () => {
    await renderActivity();
    expect(await screen.findByText('From Finn · 2')).toBeTruthy();
    await fireEvent.press(screen.getByText('Transactions'));
    expect((await screen.findAllByText('Spotify')).length).toBe(2);
    expect(screen.getAllByText('−$15.00')).toHaveLength(2);
    expect(screen.getByText('+$1,200.00')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getAllByText('Closer Card · Subscriptions')).toHaveLength(2);
  });

  it('dismisses a nudge from the accessibility action', async () => {
    mockApi.dismissNudge.mockResolvedValue(undefined as never);
    await renderActivity();
    await fireEvent(await screen.findByLabelText(/Duplicate charge/), 'accessibilityAction', { nativeEvent: { actionName: 'dismiss' } });
    await waitFor(() => expect(mockApi.dismissNudge).toHaveBeenCalledWith(dupId));
  });

  it('opens the approval sheet from the action button', async () => {
    mockApi.actOnNudge.mockResolvedValue({ action: { id: 'act_9' } } as never);
    await renderActivity();
    await fireEvent.press(await screen.findByText('Get it back'));
    await waitFor(() => expect(mockApi.actOnNudge).toHaveBeenCalledWith(dupId));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/approve/act_9'));
  });

  it('shows Done and no button for a resolved nudge', async () => {
    await renderActivity();
    expect(await screen.findByText('Done')).toBeTruthy();
    expect(screen.queryByText('Pay rent')).toBeNull();
    expect(screen.getByText('New')).toBeTruthy();
    expect(screen.getByText('Earlier')).toBeTruthy();
  });

  it('marks a nudge read only when tapped', async () => {
    mockApi.markNudgeRead.mockResolvedValue(undefined as never);
    await renderActivity();
    await screen.findByText('From Finn · 2');
    expect(mockApi.markNudgeRead).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText(/Free trial converted/));
    await waitFor(() => expect(mockApi.markNudgeRead).toHaveBeenCalledWith('n_trial'));
  });

  it('filters transactions by account from the route', async () => {
    mockParams.segment = 'transactions';
    mockParams.accountId = 'acc_card';
    await renderActivity();
    await waitFor(() => expect(mockApi.transactions).toHaveBeenCalledWith({ accountId: 'acc_card' }));
    expect(await screen.findByLabelText('Remove filter Closer Card')).toBeTruthy();
  });
});
