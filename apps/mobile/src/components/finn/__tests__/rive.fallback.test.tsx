import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

// Expo Go has no NitroModules native module, so loading the Rive runtime throws.
jest.mock('@/components/finn/FinnRiveImpl', () => {
  throw new Error('Failed to get NitroModules: The native "NitroModules" Turbo/Native-Module could not be found.');
});

describe('FinnRive without the Rive native module', () => {
  it('falls back to static Finn instead of crashing', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { FinnRiveHead, FinnRiveBody } = require('@/components/finn/FinnRive') as typeof import('@/components/finn/FinnRive');

    await render(
      <>
        <FinnRiveHead mood="happy" size={64} fallback={<Text testID="head-fallback" />} />
        <FinnRiveBody size={96} waveKey={1} fallback={<Text testID="body-fallback" />} />
      </>,
    );

    expect(screen.getByTestId('head-fallback')).toBeTruthy();
    expect(screen.getByTestId('body-fallback')).toBeTruthy();
    expect(screen.queryByTestId('rive-view')).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Rive unavailable'), expect.stringContaining('NitroModules'));
  });
});
