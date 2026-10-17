import { useCallback, useEffect, useRef } from 'react';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';

import { motion } from '@/theme/tokens';

const MARKS = [0.25, 0.5, 0.75];
const TICK_MS = 16;

/** Marks passed between two progress readings (prev < mark ≤ next). */
export function crossedMilestones(prev: number, next: number, marks = MARKS): number[] {
  return marks.filter((m) => prev < m && m <= next);
}

/**
 * Hold-to-approve timing. A JS clock decides milestones and completion (so it is testable and
 * independent of animation), while `progress` drives the visual fill on the UI thread.
 */
export function useHoldTimer({
  duration = motion.hold,
  onMilestone,
  onComplete,
}: {
  duration?: number;
  onMilestone: (mark: number) => void;
  onComplete: () => void;
}) {
  const progress = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const handlers = useRef({ onMilestone, onComplete });

  useEffect(() => {
    handlers.current = { onMilestone, onComplete };
  }, [onMilestone, onComplete]);

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);

  const start = useCallback(() => {
    stop();
    const t0 = Date.now();
    let last = 0;
    progress.set(0);
    progress.set(withTiming(1, { duration, easing: Easing.linear }));
    timer.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / duration);
      crossedMilestones(last, p).forEach((m) => handlers.current.onMilestone(m));
      last = p;
      if (p >= 1) {
        stop();
        handlers.current.onComplete();
      }
    }, TICK_MS);
  }, [duration, progress, stop]);

  const cancel = useCallback(() => {
    if (!timer.current) return; // already completed or never started
    stop();
    progress.set(withTiming(0, { duration: motion.standard }));
  }, [progress, stop]);

  useEffect(() => stop, [stop]);

  return { start, cancel, progress };
}
