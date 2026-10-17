import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import TabsLayout from '@/app/(tabs)/_layout';

jest.mock('@/components/session/FirstAnalysisGate', () => ({ FirstAnalysisGate: ({ children }: { children: unknown }) => children }));

jest.mock('@/auth/useSession', () => ({ useSession: () => ({ phase: 'ready', retry: jest.fn() }) }));
jest.mock('@/lib/useNudgeNotifier', () => ({ useNudgeNotifier: () => 2 }));

const stub = (name: string) =>
  function Stub() {
    return <Text>{name} screen</Text>;
  };

describe('tabs layout', () => {
  it('shows Home, Finn, Activity, Settings with the unread badge', async () => {
    await renderRouter(
      {
        '(tabs)/_layout': TabsLayout,
        '(tabs)/index': stub('home'),
        '(tabs)/finn': stub('finn'),
        '(tabs)/activity': stub('activity'),
        '(tabs)/settings': stub('settings'),
      },
      { initialUrl: '/' },
    );
    await screen.findByText('home screen');
    const labels = screen.getAllByRole('button').map((b) => b.props.accessibilityLabel ?? '');
    expect(labels).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Home'),
        expect.stringContaining('Finn'),
        expect.stringContaining('Activity'),
        expect.stringContaining('Settings'),
      ]),
    );
    expect(labels).toEqual(expect.arrayContaining([expect.stringContaining('Finn, chat with your money buddy')]));
    expect(screen.queryByText('Agent')).toBeNull();
    expect(screen.queryByText('Goals')).toBeNull();
    expect(screen.getByText('2')).toBeTruthy();
  });
});
