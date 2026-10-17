import type { Goal } from '@finni/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { api } from '@/api/endpoints';
import GoalDetailScreen from '@/app/goal/[id]';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: 'g1' }),
}));
jest.mock('@/api/endpoints', () => ({ api: { goals: jest.fn(), accounts: jest.fn(), createAction: jest.fn() } }));

const mockApi = api as jest.Mocked<typeof api>;

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: 'g1',
  name: 'Car repair',
  icon: 'tool',
  targetCents: 120_000,
  currentCents: 30_000,
  percent: 25,
  targetDate: null,
  nessieAccountId: 'acc_g1',
  milestonesHit: [],
  status: 'active',
  createdAt: '2026-09-01T00:00:00.000Z',
  cadence: 'biweekly',
  contributionCents: 4_000,
  nextContributionOn: '2026-10-24',
  eta: '2027-03-12',
  behind: false,
  ...over,
});

let client: QueryClient;

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
  mockApi.accounts.mockResolvedValue({
    accounts: [{ id: 'acc_chk', type: 'Checking', nickname: 'Everyday', mask: '1093', balanceCents: 214_000 }],
  } as never);
});

describe('Goal detail', () => {
  it('shows the plan and adds money through the approval sheet', async () => {
    mockApi.goals.mockResolvedValue({ goals: [goal()] });
    mockApi.createAction.mockResolvedValue({ action: { id: 'act_add' } } as never);
    await render(wrap(<GoalDetailScreen />));
    expect(await screen.findByText('$300.00 of $1,200.00')).toBeTruthy();
    expect(screen.getByText('$40.00 every 2 weeks · next Oct 24')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add money' }));
    await fireEvent.press(screen.getByText('$50'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add $50' })).toBeEnabled());
    await fireEvent.press(screen.getByRole('button', { name: 'Add $50' }));
    await waitFor(() =>
      expect(mockApi.createAction).toHaveBeenCalledWith({
        type: 'transfer',
        fromAccountId: 'acc_chk',
        toAccountId: 'acc_g1',
        amountCents: 5_000,
        reason: 'Added from Goals',
      }),
    );
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/approve/act_add'));
  });

  it('celebrates a finished goal instead of offering presets', async () => {
    mockApi.goals.mockResolvedValue({ goals: [goal({ percent: 100, currentCents: 120_000, status: 'completed' })] });
    await render(wrap(<GoalDetailScreen />));
    expect(await screen.findByText('Done. Nice work.')).toBeTruthy();
    expect(screen.queryByText('Add money')).toBeNull();
  });
});
