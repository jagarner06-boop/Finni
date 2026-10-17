import { useCallback, useEffect, useRef, useState } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/**
 * End-of-list peek.
 * - Long lists: shown within `threshold` of the end after the person scrolls there; hidden after
 *   scrolling `hideAfter` back up.
 * - Short lists (everything fits, so there is no "end" to scroll to): Finn pops up once by himself
 *   `autoDelayMs` after the list has content (`ready`).
 * Either way he ducks away after `visibleMs`. Call `reset` when the screen loses focus or the list
 * changes (e.g. a segment switch) so the next visit can peek again, and `recheck` on focus.
 */
export function usePeek({
  threshold = 6,
  hideAfter = 40,
  minOverflow = 120,
  visibleMs = 3500,
  autoDelayMs = 600,
  ready = true,
}: { threshold?: number; hideAfter?: number; minOverflow?: number; visibleMs?: number; autoDelayMs?: number; ready?: boolean } = {}) {
  const [shown, setShown] = useState(false);
  const shownAt = useRef<number | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const autoPeeked = useRef(false);
  const size = useRef({ layout: 0, content: 0 });
  const readyRef = useRef(ready);
  readyRef.current = ready;

  const hide = useCallback(() => {
    clearTimeout(hideTimer.current);
    setShown(false);
  }, []);

  const show = useCallback(() => {
    setShown(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShown(false), visibleMs);
  }, [visibleMs]);

  /** Short list with content: peek once without waiting for a scroll. */
  const recheck = useCallback(() => {
    const { layout, content } = size.current;
    if (!readyRef.current || autoPeeked.current || layout === 0 || content === 0) return;
    if (content - layout >= minOverflow) return; // long list: the scroll path handles it
    autoPeeked.current = true;
    clearTimeout(autoTimer.current);
    autoTimer.current = setTimeout(show, autoDelayMs);
  }, [minOverflow, autoDelayMs, show]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
      const y = contentOffset.y;
      // A list that barely scrolls would "reach the end" on every bounce; short lists auto-peek instead.
      if (contentSize.height - layoutMeasurement.height < minOverflow) return;
      if (shownAt.current == null) {
        if (y > 0 && y + layoutMeasurement.height >= contentSize.height - threshold) {
          shownAt.current = y;
          show();
        }
      } else if (y < shownAt.current - hideAfter) {
        shownAt.current = null;
        hide();
      }
    },
    [threshold, hideAfter, minOverflow, show, hide],
  );

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      size.current.layout = e.nativeEvent.layout.height;
      recheck();
    },
    [recheck],
  );

  const onContentSizeChange = useCallback(
    (_w: number, h: number) => {
      size.current.content = h;
      recheck();
    },
    [recheck],
  );

  // Content can arrive (ready flips true) without the size changing.
  useEffect(() => {
    if (ready) recheck();
  }, [ready, recheck]);

  /** Hide now and forget the last peek (leaving the tab, switching lists). */
  const reset = useCallback(() => {
    shownAt.current = null;
    autoPeeked.current = false;
    clearTimeout(autoTimer.current);
    hide();
  }, [hide]);

  useEffect(
    () => () => {
      clearTimeout(hideTimer.current);
      clearTimeout(autoTimer.current);
    },
    [],
  );

  return { onScroll, onLayout, onContentSizeChange, shown, reset, recheck };
}
