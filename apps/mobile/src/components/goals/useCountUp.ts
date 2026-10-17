import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/** Counts from the last value to `target` over `duration` (ease-out-cubic). Jumps under Reduce Motion. */
export function useCountUp(target: number, duration = 500): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    const start = from.current;
    from.current = target;
    if (start === target) return;
    if (reduced) {
      const id = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(id);
    }
    const t0 = Date.now();
    let id = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - t0) / duration);
      setValue(Math.round(start + (target - start) * easeOutCubic(t)));
      if (t < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target, duration, reduced]);

  return value;
}
