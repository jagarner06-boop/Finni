import type { PendingAction } from '@finni/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import ApproveScreen from '@/app/approve/[id]';

const mockStepUp = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: 'act_1' }),
}));
jest.mock('@/auth/AuthProvider', () => ({ useAuth: () => ({ stepUp: mockStepUp }) }));
jest.mock('@/api/endpoints', () => ({
  api: { action: jest.fn(), approveAction: jest.fn(), rejectAction: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;

const pending: PendingAction = {
  id: 'act_1',
  type: 'card_payment',
  title: 'Pay $1,184.00 toward your Closer Card',
  amountCents: 118_400,
  fromLabel: 'Everyday Checking',
  toLabel: 'Closer Card',
  requiresStepUp: true,
  status: 'pending',
  source: 'nudge',
  createdAt: '2026-10-17T12:00:00.000Z',
  expiresAt: '2026-10-22T00:00:00.000Z',
  executedAt: null,
  error: null,
  resultLine: null,
  reference: null,
};

function wrap(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </SafeAreaProvider>
  );
}

beforeEach(() => jest.clearAllMocks());

describe('Approve screen step-up', () => {
  it('asks for a second sign-in, then approves again', async () => {
    mockApi.action.mockResolvedValue({ action: pending });
    mockApi.approveAction.mockRejectedValueOnce(new ApiError(403, 'step_up_required'));
    mockApi.approveAction.mockResolvedValueOnce({
      action: { ...pending, status: 'executed', resultLine: 'Paid $1,184.00 to your Closer Card.', reference: '#CP-12345' },
    });
    mockStepUp.mockResolvedValue('tok');

    await render(wrap(<ApproveScreen />));
    await fireEvent(await screen.findByRole('button', { name: 'Hold to approve' }), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    expect(await screen.findByText("Quick check it's you.")).toBeTruthy();
    expect(screen.getByText('Secured on this device')).toBeTruthy();

    await fireEvent.press(screen.getByText('Continue with Face ID'));
    await waitFor(() => expect(mockStepUp).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockApi.approveAction).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Paid $1,184.00 to your Closer Card.')).toBeTruthy();
  });

  it('stays on the check when the sign-in is cancelled', async () => {
    mockApi.action.mockResolvedValue({ action: pending });
    mockApi.approveAction.mockRejectedValueOnce(new ApiError(403, 'step_up_required'));
    mockStepUp.mockResolvedValue(null);

    await render(wrap(<ApproveScreen />));
    await fireEvent(await screen.findByRole('button', { name: 'Hold to approve' }), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });
    await fireEvent.press(await screen.findByText('Continue with Face ID'));
    await waitFor(() => expect(mockStepUp).toHaveBeenCalled());
    expect(screen.getByText("Quick check it's you.")).toBeTruthy();
    expect(mockApi.approveAction).toHaveBeenCalledTimes(1);
  });
});
