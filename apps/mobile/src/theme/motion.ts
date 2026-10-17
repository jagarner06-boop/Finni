// Reanimated 4 presets for Finn reactions. Spec: docs/design/finni-v2/README.md, "Finn reactions".
// Every preset takes `reduced` (useReducedMotion) and skips transforms when true. Haptics live
// in @/lib/haptics and are fired by callers, so they stay on under Reduce Motion.
import {
  Easing,
  cancelAnimation,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { motion } from './tokens';

export const ease = {
  out: Easing.out(Easing.cubic),
  in: Easing.in(Easing.cubic),
  inOut: Easing.inOut(Easing.sin),
  overshoot: Easing.bezier(0.34, 1.4, 0.64, 1),
  peek: Easing.bezier(0.2, 0.8, 0.3, 1),
};

export type FinnSV = { y: SharedValue<number>; sx: SharedValue<number>; sy: SharedValue<number>; rot: SharedValue<number> };

/** Hop: squash → leap 26 → land → settle. 700ms total. Transform origin: bottom center. */
export function hop({ y, sx, sy }: FinnSV, reduced: boolean) {
  'worklet';
  if (reduced) return;
  const seg = (ms: number) => ({ duration: ms, easing: ease.out });
  sx.value = withSequence(withTiming(1.08, seg(126)), withTiming(0.94, seg(189)), withTiming(1.06, seg(189)), withTiming(1, seg(196)));
  sy.value = withSequence(withTiming(0.88, seg(126)), withTiming(1.08, seg(189)), withTiming(0.92, seg(189)), withTiming(1, seg(196)));
  y.value = withSequence(withTiming(0, seg(126)), withTiming(-26, seg(189)), withTiming(0, { duration: 189, easing: ease.in }), withSpring(0, motion.finnSpring));
}

/** Hold squash while pressing approve. */
export function holdSquash({ sx, sy }: FinnSV, reduced: boolean) {
  'worklet';
  if (reduced) return;
  sx.value = withTiming(1.04, { duration: motion.hold, easing: ease.in });
  sy.value = withTiming(0.95, { duration: motion.hold, easing: ease.in });
}

export function release({ sx, sy }: FinnSV) {
  'worklet';
  sx.value = withSpring(1, motion.finnSpring);
  sy.value = withSpring(1, motion.finnSpring);
}

/** Thinking rock: 0 → -7° → 0 → 5° → 0, 1.6s loop. Origin 50% 90%. */
export function startRock({ rot }: FinnSV, reduced: boolean) {
  'worklet';
  if (reduced) return;
  const q = { duration: 400, easing: ease.inOut };
  rot.value = withRepeat(withSequence(withTiming(-7, q), withTiming(0, q), withTiming(5, q), withTiming(0, q)), -1);
}

export function stopRock({ rot }: FinnSV) {
  'worklet';
  cancelAnimation(rot);
  rot.value = withSpring(0, motion.finnSpring);
}

/** Answer nod: -5, 0, -3, 0 over 520ms. */
export function nod({ y }: FinnSV, reduced: boolean) {
  'worklet';
  if (reduced) return;
  const q = { duration: 130, easing: ease.inOut };
  y.value = withDelay(60, withSequence(withTiming(-5, q), withTiming(0, q), withTiming(-3, q), withTiming(0, q)));
}

/** Deposit bob: up 6 with slight stretch, 380ms. */
export function bob({ y, sx, sy }: FinnSV, reduced: boolean) {
  'worklet';
  if (reduced) return;
  y.value = withSequence(withTiming(-6, { duration: 150, easing: ease.out }), withSpring(0, motion.finnSpring));
  sx.value = withSequence(withTiming(0.97, { duration: 150 }), withTiming(1.03, { duration: 135 }), withTiming(1, { duration: 95 }));
  sy.value = withSequence(withTiming(1.03, { duration: 150 }), withTiming(0.97, { duration: 135 }), withTiming(1, { duration: 95 }));
}

/** Peek from behind tab bar. progress 0 = hidden (translateY 100%), 1 = shown (20%). */
export function peekIn(progress: SharedValue<number>, reduced: boolean) {
  'worklet';
  progress.value = reduced ? withTiming(1, { duration: motion.micro }) : withTiming(1, { duration: 520, easing: ease.peek });
}

export function peekOut(progress: SharedValue<number>) {
  'worklet';
  progress.value = withTiming(0, { duration: 220, easing: ease.in });
}

/** Tick burst per stroke i: scale 0 → 1.2 → 1 → fade, 900ms, 40ms stagger. Under Reduce Motion: fade only. */
export function tickBurst(scale: SharedValue<number>, opacity: SharedValue<number>, i: number, reduced: boolean, delay = 0) {
  'worklet';
  const d = delay + i * 40;
  if (reduced) {
    scale.value = 1;
    opacity.value = withDelay(d, withSequence(withTiming(1, { duration: motion.micro }), withTiming(1, { duration: 450 }), withTiming(0, { duration: motion.micro })));
    return;
  }
  scale.value = 0;
  scale.value = withDelay(d, withSequence(withTiming(1.2, { duration: 270, easing: ease.out }), withTiming(1, { duration: 315 }), withTiming(1, { duration: 315 })));
  opacity.value = withDelay(d, withSequence(withTiming(1, { duration: 270 }), withTiming(1, { duration: 315 }), withTiming(0, { duration: 315 })));
}

/** Primary button press: 3pt drop onto lip. */
export const press = {
  in: (ty: SharedValue<number>) => {
    'worklet';
    ty.value = withTiming(3, { duration: motion.pressDown });
  },
  out: (ty: SharedValue<number>) => {
    'worklet';
    ty.value = withSpring(0, motion.finnSpring);
  },
};
