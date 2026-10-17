import type { ChatMessage } from '@finni/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { api } from '@/api/endpoints';
import FinnScreen from '@/app/(tabs)/finn';

const mockParams: { focus?: string; q?: string } = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/lib/location', () => ({ getLocation: () => Promise.resolve(null) }));
jest.mock('@/api/endpoints', () => ({
  api: { chatHistory: jest.fn(), sendChat: jest.fn(), me: jest.fn(), scanNudges: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;

const msg = (over: Partial<ChatMessage>): ChatMessage => ({
  id: 'm1',
  role: 'finn',
  text: 'Your card is at 68%.',
  mood: 'worried',
  cards: [],
  chips: ['Why 9%?', 'Pay it down'],
  createdAt: '2026-10-17T12:00:00Z',
  ...over,
});

let client: QueryClient;

function wrap(ui: ReactNode) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

// Let refetches and mutations finish inside the test so no update lands outside act().
afterEach(async () => {
  await waitFor(() => expect(client.isFetching() + client.isMutating()).toBe(0));
});

beforeEach(() => {
  jest.clearAllMocks();
  delete mockParams.focus;
  delete mockParams.q;
  mockApi.me.mockResolvedValue({ firstName: 'Gabe' } as never);
});

describe('Finn screen', () => {
  it("shows the last Finn message's chips and sends a picked chip", async () => {
    mockApi.chatHistory.mockResolvedValue({ messages: [msg({})] });
    mockApi.sendChat.mockResolvedValue({ reply: msg({ id: 'm2' }), cards: [] });
    await render(wrap(<FinnScreen />));
    await fireEvent.press(await screen.findByLabelText('Ask Finn: Why 9%?'));
    await waitFor(() => expect(mockApi.sendChat).toHaveBeenCalledWith({ message: 'Why 9%?' }));
    await waitFor(() => expect(mockApi.chatHistory).toHaveBeenCalledTimes(2));
  });

  it('greets by name with default chips when history is empty', async () => {
    mockApi.chatHistory.mockResolvedValue({ messages: [] });
    await render(wrap(<FinnScreen />));
    expect(await screen.findByText('Hi Gabe. Ask me about your card, bills, or goals.')).toBeTruthy();
    expect(screen.getByLabelText('Ask Finn: How’s my card?')).toBeTruthy();
  });

  it('marks a failed message and resends it on Retry', async () => {
    mockApi.chatHistory.mockResolvedValue({ messages: [msg({})] });
    mockApi.sendChat.mockRejectedValueOnce(new Error('offline'));
    await render(wrap(<FinnScreen />));
    await fireEvent.changeText(await screen.findByLabelText('Ask Finn'), 'Pay my card');
    await fireEvent.press(screen.getByLabelText('Send'));
    expect(await screen.findByText('Not sent · Retry')).toBeTruthy();
    expect(screen.getByText('Pay my card')).toBeTruthy();
    mockApi.sendChat.mockResolvedValueOnce({ reply: msg({ id: 'm3' }), cards: [] });
    await fireEvent.press(screen.getByText('Not sent · Retry'));
    await waitFor(() => expect(mockApi.sendChat).toHaveBeenCalledTimes(2));
    expect(mockApi.sendChat).toHaveBeenLastCalledWith({ message: 'Pay my card' });
    await waitFor(() => expect(screen.queryByText('Not sent · Retry')).toBeNull());
  });

  it('puts ?q= in the composer without sending it', async () => {
    mockParams.q = 'Pay my card down';
    mockApi.chatHistory.mockResolvedValue({ messages: [] });
    await render(wrap(<FinnScreen />));
    expect(await screen.findByText('Hi Gabe. Ask me about your card, bills, or goals.')).toBeTruthy();
    expect(screen.getByLabelText('Ask Finn').props.value).toBe('Pay my card down');
    expect(mockApi.sendChat).not.toHaveBeenCalled();
  });
});
