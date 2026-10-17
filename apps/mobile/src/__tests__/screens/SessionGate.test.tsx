import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { SessionGate } from '@/components/session/SessionGate';
import { config } from '@/config';

const mockSession = jest.fn();
jest.mock('@/auth/useSession', () => ({ useSession: () => mockSession() }));

describe('SessionGate', () => {
  it('shows the error copy and retries', async () => {
    const retry = jest.fn();
    mockSession.mockReturnValue({ phase: 'error', retry });
    await render(<SessionGate><Text>child</Text></SessionGate>);
    expect(screen.getByText(`Couldn't reach Finni at ${config.apiUrl}`)).toBeTruthy();
    await fireEvent.press(screen.getByText('Try again'));
    expect(retry).toHaveBeenCalled();
    expect(screen.queryByText('child')).toBeNull();
  });

  it('shows the seeding copy', async () => {
    mockSession.mockReturnValue({ phase: 'seeding', retry: jest.fn() });
    await render(<SessionGate><Text>child</Text></SessionGate>);
    expect(screen.getByText('Finn is getting your accounts ready…')).toBeTruthy();
  });

  it('renders children when ready', async () => {
    mockSession.mockReturnValue({ phase: 'ready', retry: jest.fn() });
    await render(<SessionGate><Text>child</Text></SessionGate>);
    expect(screen.getByText('child')).toBeTruthy();
  });
});
