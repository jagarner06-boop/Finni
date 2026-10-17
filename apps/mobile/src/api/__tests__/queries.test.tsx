import { QueryClient, QueryClientProvider, QueryObserver } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Button, Text, View } from 'react-native';
import { api } from '../endpoints';
import { qk, useApproveAction, useSendChat } from '../queries';
jest.mock('@/lib/location', () => ({ getLocation: async () => null }));
jest.mock('../endpoints', () => ({ api: { sendChat: jest.fn(), approveAction: jest.fn() } }));
const mockApi = api as jest.Mocked<typeof api>;
function Harness() {
  const send = useSendChat();
  const approve = useApproveAction();
  return <View><Button title="Send" onPress={() => send.mutate('Save $50')} /><Button title="Approve" onPress={() => approve.mutate('a1')} /><Text>{approve.isSuccess ? 'Approved' : 'Waiting'}</Text></View>;
}
it('refreshes pending actions after a chat proposal', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  client.setQueryData(qk.actions('pending'), { actions: [] });
  mockApi.sendChat.mockResolvedValue({ reply: {}, cards: [{ type: 'approval' }] } as never);
  await render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>);
  await fireEvent.press(screen.getByText('Send'));
  await waitFor(() => expect(client.getQueryState(qk.actions('pending'))?.isInvalidated).toBe(true));
  client.clear();
});
it('waits for refreshed goal data before completing approval', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  let finish!: (v: unknown) => void;
  const refetch = jest.fn(() => new Promise((resolve) => { finish = resolve; }));
  client.setQueryData(qk.goals, { goals: [{ currentCents: 0 }] });
  const observer = new QueryObserver(client, { queryKey: qk.goals, queryFn: refetch, staleTime: Infinity });
  const unsubscribe = observer.subscribe(() => {});
  mockApi.approveAction.mockResolvedValue({ action: { id: 'a1', status: 'executed' } } as never);
  await render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>);
  await fireEvent.press(screen.getByText('Approve'));
  await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
  expect(screen.queryByText('Approved')).toBeNull();
  finish({ goals: [{ currentCents: 5000 }] });
  await screen.findByText('Approved');
  expect(client.getQueryData(qk.goals)).toEqual({ goals: [{ currentCents: 5000 }] });
  unsubscribe(); client.clear();
});
