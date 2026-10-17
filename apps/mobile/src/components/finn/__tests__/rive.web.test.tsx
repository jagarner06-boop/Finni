import { render, screen } from '@testing-library/react-native';
import { createRef } from 'react';
import { Text } from 'react-native';

import { FinnRiveBody, FinnRiveHead, type FinnRiveHandle } from '@/components/finn/FinnRive.web';

// Web never loads the Rive runtime (its Nitro views import native-only modules).
describe('FinnRive on web', () => {
  it('shows the fallback head and ignores triggers', async () => {
    const ref = createRef<FinnRiveHandle>();
    await render(<FinnRiveHead ref={ref} mood="happy" size={64} fallback={<Text testID="fallback" />} />);
    expect(screen.getByTestId('fallback')).toBeTruthy();
    expect(() => ref.current?.fire('nod')).not.toThrow();
  });

  it('shows the fallback body', async () => {
    await render(<FinnRiveBody size={120} waveKey={1} fallback={<Text testID="fallback" />} />);
    expect(screen.getByTestId('fallback')).toBeTruthy();
  });
});
