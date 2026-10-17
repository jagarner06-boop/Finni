import { act, render, renderHook, screen } from '@testing-library/react-native';
import { createRef } from 'react';
import { Text } from 'react-native';

import { AgentHeader } from '@/components/chat/AgentHeader';
import { FinnRiveHead, type FinnRiveHandle } from '@/components/finn/FinnRive';
import { usePeek } from '@/components/finn/usePeek';
import { FINN_RIVE } from '@/components/finn/rive';

const rive = (globalThis as unknown as { __rive: Record<string, jest.Mock> }).__rive;
const lastMood = () => rive.setEnum.mock.calls.filter(([path]) => path === FINN_RIVE.mood).at(-1)?.[1];

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

describe('FinnRiveHead', () => {
  it('sends its mood to the Rive view model', async () => {
    await render(<FinnRiveHead mood="worried" size={64} fallback={<Text testID="fallback" />} />);
    expect(lastMood()).toBe('worried');
    expect(screen.getByTestId('rive-view')).toBeTruthy();
  });

  it('fires a named trigger on request', async () => {
    const ref = createRef<FinnRiveHandle>();
    await render(<FinnRiveHead ref={ref} mood="happy" size={64} fallback={<Text testID="fallback" />} />);
    await act(async () => ref.current?.fire('nod'));
    expect(rive.trigger).toHaveBeenCalledWith(FINN_RIVE.nod);
  });

  it('falls back to the PNG Finn when the file fails to load', async () => {
    rive.file.mockReturnValueOnce({ riveFile: null, isLoading: false, error: new Error('bad file') });
    await render(<FinnRiveHead mood="happy" size={64} fallback={<Text testID="fallback" />} />);
    expect(screen.getByTestId('fallback')).toBeTruthy();
    expect(screen.queryByTestId('rive-view')).toBeNull();
  });
});

describe('AgentHeader', () => {
  it('thinks 300ms after a message is sent, then nods with the reply mood', async () => {
    const { rerender } = await render(<AgentHeader sending={false} replyMood="happy" />);
    await rerender(<AgentHeader sending replyMood="happy" />);
    await act(async () => jest.advanceTimersByTime(299));
    expect(lastMood()).not.toBe('thinking');
    await act(async () => jest.advanceTimersByTime(1));
    expect(lastMood()).toBe('thinking');

    await rerender(<AgentHeader sending={false} replyMood="celebrating" />);
    expect(lastMood()).toBe('celebrating');
    expect(rive.trigger).toHaveBeenCalledWith(FINN_RIVE.nod);
  });

  it('does not nod on first render', async () => {
    await render(<AgentHeader sending={false} replyMood="happy" />);
    expect(rive.trigger).not.toHaveBeenCalled();
  });
});

describe('usePeek', () => {
  const scroll = (y: number) => ({
    nativeEvent: { contentOffset: { x: 0, y }, layoutMeasurement: { width: 360, height: 600 }, contentSize: { width: 360, height: 1000 } },
  });

  it('shows Finn within 6pt of the end and hides him 40pt back up', async () => {
    const { result } = await renderHook(() => usePeek());
    expect(result.current.shown).toBe(false);
    await act(async () => result.current.onScroll(scroll(393) as never));
    expect(result.current.shown).toBe(false);
    await act(async () => result.current.onScroll(scroll(395) as never));
    expect(result.current.shown).toBe(true);
    await act(async () => result.current.onScroll(scroll(360) as never));
    expect(result.current.shown).toBe(true);
    await act(async () => result.current.onScroll(scroll(354) as never));
    expect(result.current.shown).toBe(false);
  });
});
