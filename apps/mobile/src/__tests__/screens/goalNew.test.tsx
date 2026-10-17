import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { api } from '@/api/endpoints';
import NewGoalScreen from '@/app/goal/new';
import { etaLabel } from '@/components/goals/goalFlow';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), replace: jest.fn(), push: jest.fn() } }));
jest.mock('@/api/endpoints', () => ({ api: { accounts: jest.fn(), createGoal: jest.fn() } }));

const mockApi = api as jest.Mocked<typeof api>;

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

describe('New goal flow', () => {
  it('walks name, amount, cadence, and review, then creates the goal', async () => {
    mockApi.createGoal.mockResolvedValue({ action: { id: 'act_goal' } } as never);
    await render(wrap(<NewGoalScreen />));
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(screen.getByText('What are we saving for?')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Goal name'), 'Hawaii');
    await fireEvent.press(screen.getByLabelText('Trip'));
    await fireEvent.press(screen.getByText('Next'));

    expect(screen.getByText('Nice. How much do you need?')).toBeTruthy();
    await fireEvent.press(screen.getByText('$2,400'));
    await fireEvent.press(screen.getByText('Next'));

    expect(screen.getByText('Got it. How often should I move money?')).toBeTruthy();
    expect(screen.getByText('$50.00')).toBeTruthy();
    expect(screen.getAllByText(etaLabel(240_000, 'weekly', 5_000, new Date())).length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByLabelText(/^Weekly/));
    await fireEvent.press(screen.getByText('Next'));

    expect(screen.getByText("This works. Here's the plan.")).toBeTruthy();
    await fireEvent.press(screen.getByText('Create goal'));
    await waitFor(() =>
      expect(mockApi.createGoal).toHaveBeenCalledWith({
        name: 'Hawaii',
        icon: 'sun',
        targetCents: 240_000,
        cadence: 'weekly',
        contributionCents: 5_000,
        fromAccountId: 'acc_chk',
      }),
    );
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/approve/act_goal'));
  });

  it('closes from the first step', async () => {
    await render(wrap(<NewGoalScreen />));
    await waitFor(() => expect(client.isFetching()).toBe(0));
    await fireEvent.press(screen.getByLabelText('Back'));
    expect(router.back).toHaveBeenCalled();
  });

  it('needs a name before going on', async () => {
    await render(wrap(<NewGoalScreen />));
    await waitFor(() => expect(client.isFetching()).toBe(0));
    await fireEvent.press(screen.getByText('Next'));
    expect(screen.getByText('What are we saving for?')).toBeTruthy();
  });
});
