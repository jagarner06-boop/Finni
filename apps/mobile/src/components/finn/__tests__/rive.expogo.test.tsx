import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { FinnRiveHead } from '@/components/finn/FinnRive';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'storeClient' },
  ExecutionEnvironment: { Bare: 'bare', Standalone: 'standalone', StoreClient: 'storeClient' },
}));

const rive = (globalThis as unknown as { __rive: Record<string, jest.Mock> }).__rive;

describe('FinnRive in Expo Go', () => {
  it('skips the Rive runtime and renders the fallback', async () => {
    await render(<FinnRiveHead mood="happy" size={64} fallback={<Text testID="fallback" />} />);
    expect(screen.getByTestId('fallback')).toBeTruthy();
    expect(screen.queryByTestId('rive-view')).toBeNull();
    expect(rive.file).not.toHaveBeenCalled();
  });
});
