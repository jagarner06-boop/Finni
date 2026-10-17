import type { SettingsResponse } from '@finni/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, type AlertButton } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { api } from '@/api/endpoints';
import SettingsScreen from '@/app/(tabs)/settings';

const mockLogout = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/auth/AuthProvider', () => ({ useAuth: () => ({ logout: mockLogout }) }));
jest.mock('@/api/endpoints', () => ({
  api: { settings: jest.fn(), updateSettings: jest.fn(), resetDemo: jest.fn(), clearChat: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;

const settings: SettingsResponse = {
  firstName: 'Gabe',
  email: null,
  prefs: { notifications: true, hideBalance: false },
  accounts: [
    { id: 'acc_chk', type: 'Checking', nickname: 'Everyday', mask: '1093', balanceCents: 214_000, isGoal: false },
    { id: 'acc_card', type: 'Credit Card', nickname: 'Closer Card', mask: '4821', balanceCents: 136_400, isGoal: false },
    { id: 'acc_goal', type: 'Savings', nickname: 'Car repair', mask: '5550', balanceCents: 30_000, isGoal: true, goalId: 'g1' },
  ],
  stepUpThresholdCents: 10_000,
  authMode: 'demo',
};

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

afterEach(async () => {
  await waitFor(() => expect(client.isFetching() + client.isMutating()).toBe(0));
});

/** Presses the confirm button in the last Alert. */
async function confirmAlert(label: string) {
  const buttons = (jest.mocked(Alert.alert).mock.calls.at(-1)?.[2] ?? []) as AlertButton[];
  await act(async () => buttons.find((b) => b.text === label)?.onPress?.());
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockApi.settings.mockResolvedValue(settings);
});

describe('Settings', () => {
  it('shows the step-up rule and accounts', async () => {
    await render(wrap(<SettingsScreen />));
    expect(await screen.findByText('Over $100.00 needs Face ID')).toBeTruthy();
    expect(screen.getByText('•••• 4821')).toBeTruthy();
    expect(screen.getByText('•••• 1093')).toBeTruthy();
    expect(screen.queryByText('•••• 5550')).toBeNull();
    await fireEvent.press(screen.getByText('Closer Card'));
    expect(router.push).toHaveBeenCalledWith('/activity?segment=transactions&accountId=acc_card');
  });

  it('saves the hide balances toggle', async () => {
    mockApi.updateSettings.mockResolvedValue({ ...settings, prefs: { ...settings.prefs, hideBalance: true } });
    await render(wrap(<SettingsScreen />));
    await fireEvent(await screen.findByLabelText('Hide balances on Home'), 'valueChange', true);
    await waitFor(() => expect(mockApi.updateSettings).toHaveBeenCalledWith({ prefs: { hideBalance: true } }));
  });

  it('resets demo data after confirming', async () => {
    mockApi.resetDemo.mockResolvedValue({ me: { seeded: false } } as never);
    await render(wrap(<SettingsScreen />));
    await fireEvent.press(await screen.findByText('Reset demo data'));
    expect(mockApi.resetDemo).not.toHaveBeenCalled();
    await confirmAlert('Reset');
    await waitFor(() => expect(mockApi.resetDemo).toHaveBeenCalled());
  });

  it('clears chat and signs out after confirming', async () => {
    mockApi.clearChat.mockResolvedValue(undefined as never);
    await render(wrap(<SettingsScreen />));
    await fireEvent.press(await screen.findByText('Clear chat with Finn'));
    await confirmAlert('Clear');
    await waitFor(() => expect(mockApi.clearChat).toHaveBeenCalled());
    await fireEvent.press(screen.getByText('Sign out'));
    await confirmAlert('Sign out');
    expect(mockLogout).toHaveBeenCalled();
  });

  it('edits the name inline', async () => {
    mockApi.updateSettings.mockResolvedValue({ ...settings, firstName: 'Gabi' });
    await render(wrap(<SettingsScreen />));
    await fireEvent.press(await screen.findByText('Gabe'));
    const field = screen.getByLabelText('Your name');
    await fireEvent.changeText(field, 'Gabi');
    await fireEvent(field, 'submitEditing');
    await waitFor(() => expect(mockApi.updateSettings).toHaveBeenCalledWith({ firstName: 'Gabi' }));
  });
});
