import type { Nudge } from '@finni/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { api } from '@/api/endpoints';
import { notifyLocal } from '@/lib/notifications';
import { useNudgeNotifier } from '@/lib/useNudgeNotifier';

jest.mock('@/lib/notifications', () => ({ notifyLocal: jest.fn(() => Promise.resolve()) }));
jest.mock('@/lib/useForegroundPoll', () => ({ useForegroundPoll: () => {} }));
jest.mock('@/api/endpoints', () => ({ api: { nudges: jest.fn(), settings: jest.fn(), markNudgeNotified: jest.fn(() => Promise.resolve()) } }));

const mockApi = api as jest.Mocked<typeof api>;
const nudge = { id: 'n1', title: 'Duplicate charge', body: 'Spotify charged you twice.', notifiedAt: null, readAt: null } as Nudge;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.nudges.mockResolvedValue({ nudges: [nudge] });
});

describe('useNudgeNotifier', () => {
  it('notifies when check-ins are on', async () => {
    mockApi.settings.mockResolvedValue({ prefs: { notifications: true, hideBalance: false } } as never);
    const { result } = await renderHook(() => useNudgeNotifier(), { wrapper });
    await waitFor(() => expect(notifyLocal).toHaveBeenCalledWith('Duplicate charge', 'Spotify charged you twice.', { nudgeId: 'n1' }));
    expect(result.current).toBe(1);
  });

  it('stays quiet when check-ins are off but still counts unread', async () => {
    mockApi.settings.mockResolvedValue({ prefs: { notifications: false, hideBalance: false } } as never);
    const { result } = await renderHook(() => useNudgeNotifier(), { wrapper });
    await waitFor(() => expect(mockApi.markNudgeNotified).toHaveBeenCalledWith('n1'));
    expect(notifyLocal).not.toHaveBeenCalled();
    expect(result.current).toBe(1);
  });
});
