import { useCallback, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/** End-of-list peek: shown within `threshold` of the end, hidden after scrolling `hideAfter` back up. */
export function usePeek({ threshold = 6, hideAfter = 40 } = {}) {
  const [shown, setShown] = useState(false);
  const shownAt = useRef<number | null>(null);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
      const y = contentOffset.y;
      if (shownAt.current == null) {
        if (y + layoutMeasurement.height >= contentSize.height - threshold) {
          shownAt.current = y;
          setShown(true);
        }
      } else if (y < shownAt.current - hideAfter) {
        shownAt.current = null;
        setShown(false);
      }
    },
    [threshold, hideAfter],
  );

  return { onScroll, shown };
}
