import type { Goal } from '@finni/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { api } from '@/api/endpoints';
import GoalsScreen from '@/app/goals';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@/api/endpoints', () => ({ api: { goals: jest.fn() } }));

const mockApi = api as jest.Mocked<typeof api>;

const goal = (over: Partial<Goal>): Goal => ({
  id: 'g1',
  name: 'Car repair',
  icon: 'tool',
  targetCents: 120_000,
  currentCents: 30_000,
  percent: 25,
  targetDate: '2027-01-01',
  nessieAccountId: 'acc_g1',
  milestonesHit: [],
  status: 'active',
  createdAt: '2026-09-01T00:00:00.000Z',
  cadence: 'biweekly',
  contributionCents: 4_000,
  nextContributionOn: '2026-10-24',
  eta: '2027-03-12',
  behind: true,
  ...over,
});

let client: QueryClient;

function wrap(ui: ReactNode) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
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

describe('Goals screen', () => {
  it('shows behind, on track, and done', async () => {
    mockApi.goals.mockResolvedValue({
      goals: [
        goal({}),
        goal({ id: 'g2', name: 'Hawaii', behind: false, eta: '2027-09-18' }),
        goal({ id: 'g3', name: 'Laptop', percent: 100, currentCents: 120_000, status: 'completed', behind: false }),
      ],
    });
    await render(wrap(<GoalsScreen />));
    expect(await screen.findByText('Behind · Mar 2027')).toBeTruthy();
    expect(screen.getByText('On track · Sep 2027')).toBeTruthy();
    expect(screen.getByText('Done. Nice work.')).toBeTruthy();
    expect(screen.getByText('Saved across 3 goals')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(/^Hawaii/));
    expect(router.push).toHaveBeenCalledWith('/goal/g2');
    await fireEvent.press(screen.getByText('+ New goal'));
    expect(router.push).toHaveBeenCalledWith('/goal/new');
  });
});
