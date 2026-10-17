import { useMemo } from 'react';
import { useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';

import * as m from '@/theme/motion';

/**
 * Finn's body reactions on four shared values. Spread `style` onto an Animated.View around Finn.
 * Every action respects Reduce Motion; callers fire haptics themselves so those stay on.
 */
export function useFinnReaction() {
  const reduced = useReducedMotion();
  const y = useSharedValue(0);
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);
  const rot = useSharedValue(0);

  const style = useAnimatedStyle(() => ({
    // Rock pivots near the chin; squash and hop pivot on the ground.
    transformOrigin: rot.value !== 0 ? '50% 90%' : '50% 100%',
    transform: [{ translateY: y.value }, { rotate: `${rot.value}deg` }, { scaleX: sx.value }, { scaleY: sy.value }],
  }));

  const actions = useMemo(() => {
    const sv = { y, sx, sy, rot };
    return {
      hop: () => m.hop(sv, reduced),
      holdSquash: () => m.holdSquash(sv, reduced),
      release: () => m.release(sv),
      startRock: () => m.startRock(sv, reduced),
      stopRock: () => m.stopRock(sv),
      nod: () => m.nod(sv, reduced),
      bob: () => m.bob(sv, reduced),
    };
  }, [reduced, y, sx, sy, rot]);

  return { style, ...actions };
}
