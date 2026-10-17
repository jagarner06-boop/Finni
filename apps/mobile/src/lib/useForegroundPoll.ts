import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * Calls `fn` when the app comes to the foreground and every `intervalMs` while it
 * stays foregrounded. Paused in the background.
 */
export function useForegroundPoll(fn: () => void, intervalMs: number, enabled = true) {
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; }, [fn]);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      fnRef.current();
      timer ??= setInterval(() => fnRef.current(), intervalMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    if (AppState.currentState === 'active') start();
    const sub = AppState.addEventListener('change', (s) => (s === 'active' ? start() : stop()));
    return () => {
      stop();
      sub.remove();
    };
  }, [intervalMs, enabled]);
}
