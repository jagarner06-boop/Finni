import { act, render, screen } from '@testing-library/react-native';

import { FinnAvatar } from '@/components/finn/FinnAvatar';

let mockReduced = false;
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return { __esModule: true, ...actual, default: actual.default, useReducedMotion: () => mockReduced };
});

// Two fake reactions; everything else has no file yet.
jest.mock('@/components/finn/reactions', () => ({
  FINN_REACTIONS: {
    celebrating: { source: 1, durationMs: 1000 },
    worried: { source: 2, durationMs: 800 },
  },
}));

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.useRealTimers();
  mockReduced = false;
});

describe('FinnAvatar reactions', () => {
  it('plays the reaction once on arrival, then settles on the static head', async () => {
    await render(<FinnAvatar mood="celebrating" size={88} animated />);
    expect(screen.getByTestId('finn-reaction')).toBeTruthy();
    await act(async () => jest.advanceTimersByTime(1000));
    expect(screen.queryByTestId('finn-reaction')).toBeNull();
    expect(screen.getByTestId('finn-head')).toBeTruthy();
  });

  it('plays again when the mood changes', async () => {
    const { rerender } = await render(<FinnAvatar mood="celebrating" size={88} animated />);
    await act(async () => jest.advanceTimersByTime(1000));
    await rerender(<FinnAvatar mood="worried" size={88} animated />);
    expect(screen.getByTestId('finn-reaction')).toBeTruthy();
    await act(async () => jest.advanceTimersByTime(800));
    expect(screen.queryByTestId('finn-reaction')).toBeNull();
  });

  it('keeps the static head when the mood has no reaction file yet', async () => {
    await render(<FinnAvatar mood="happy" size={88} animated />);
    expect(screen.queryByTestId('finn-reaction')).toBeNull();
    expect(screen.getByTestId('finn-head')).toBeTruthy();
  });

  it('only plays on hero Finns (animated)', async () => {
    await render(<FinnAvatar mood="celebrating" size={32} />);
    expect(screen.queryByTestId('finn-reaction')).toBeNull();
  });

  it('shows only the static head under Reduce Motion', async () => {
    mockReduced = true;
    await render(<FinnAvatar mood="celebrating" size={88} animated />);
    expect(screen.queryByTestId('finn-reaction')).toBeNull();
    expect(screen.getByTestId('finn-head')).toBeTruthy();
  });
});
