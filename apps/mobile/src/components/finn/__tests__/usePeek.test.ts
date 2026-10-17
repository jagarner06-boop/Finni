import { act, renderHook } from '@testing-library/react-native';

import { usePeek } from '@/components/finn/usePeek';

const layout = (height: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width: 360, height } } }) as never;
const scroll = (y: number, content = 1000) =>
  ({ nativeEvent: { contentOffset: { x: 0, y }, layoutMeasurement: { width: 360, height: 600 }, contentSize: { width: 360, height: content } } }) as never;

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('usePeek on a short list', () => {
  it('pops Finn up once by himself, then ducks him away', async () => {
    const { result } = await renderHook(() => usePeek());
    await act(async () => {
      result.current.onLayout(layout(600));
      result.current.onContentSizeChange(360, 400);
    });
    expect(result.current.shown).toBe(false);
    await act(async () => jest.advanceTimersByTime(600));
    expect(result.current.shown).toBe(true);
    await act(async () => jest.advanceTimersByTime(3500));
    expect(result.current.shown).toBe(false);
    // Only once per visit.
    await act(async () => result.current.onContentSizeChange(360, 420));
    await act(async () => jest.advanceTimersByTime(5000));
    expect(result.current.shown).toBe(false);
  });

  it('waits until there is content', async () => {
    let ready = false;
    const { result, rerender } = await renderHook(() => usePeek({ ready }));
    await act(async () => {
      result.current.onLayout(layout(600));
      result.current.onContentSizeChange(360, 200);
    });
    await act(async () => jest.advanceTimersByTime(2000));
    expect(result.current.shown).toBe(false);
    ready = true;
    await rerender({});
    await act(async () => jest.advanceTimersByTime(600));
    expect(result.current.shown).toBe(true);
  });

  it('peeks again after a reset (new visit or segment)', async () => {
    const { result } = await renderHook(() => usePeek());
    await act(async () => {
      result.current.onLayout(layout(600));
      result.current.onContentSizeChange(360, 400);
      jest.advanceTimersByTime(600);
    });
    expect(result.current.shown).toBe(true);
    await act(async () => result.current.reset());
    expect(result.current.shown).toBe(false);
    await act(async () => {
      result.current.recheck();
      jest.advanceTimersByTime(600);
    });
    expect(result.current.shown).toBe(true);
  });
});

describe('usePeek on a long list', () => {
  it('never auto-peeks; scrolling to the end shows him and he ducks away after a while', async () => {
    const { result } = await renderHook(() => usePeek());
    await act(async () => {
      result.current.onLayout(layout(600));
      result.current.onContentSizeChange(360, 1000);
      jest.advanceTimersByTime(2000);
    });
    expect(result.current.shown).toBe(false);
    await act(async () => result.current.onScroll(scroll(395)));
    expect(result.current.shown).toBe(true);
    await act(async () => jest.advanceTimersByTime(3500));
    expect(result.current.shown).toBe(false);
  });

  it('ignores end-of-list bounces on lists that barely scroll', async () => {
    const { result } = await renderHook(() => usePeek());
    await act(async () => result.current.onScroll(scroll(50, 650)));
    expect(result.current.shown).toBe(false);
  });
});
