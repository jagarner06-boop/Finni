import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { tickBurst } from '@/theme/motion';
import { colors } from '@/theme/tokens';

// Finn's cobalt ticks, drawn on a 20×20 box. `origin` is each stroke's center so it scales in place.
const STROKES = [
  { d: 'M5 3.5l1.8 4', origin: '29.5% 27.5%' },
  { d: 'M11.5 2.5l-.6 4.4', origin: '56% 23.5%' },
  { d: 'M17 6.5l-3.6 2.4', origin: '76% 38.5%' },
] as const;

/** Decorative: hidden from screen readers. Static by default (unread mark); `animated` bursts on mount and whenever `burstKey` changes. */
export function FinnTicks({
  count = 2,
  animated = false,
  size = 16,
  burstKey = 0,
}: {
  count?: 2 | 3;
  animated?: boolean;
  size?: number;
  burstKey?: number;
}) {
  return (
    <View
      testID="finn-ticks"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ width: size, height: size }}>
      {STROKES.slice(0, count).map((s, i) => (
        <Stroke key={i} index={i} d={s.d} origin={s.origin} size={size} animated={animated} burstKey={burstKey} />
      ))}
    </View>
  );
}

function Stroke({ index, d, origin, size, animated, burstKey }: { index: number; d: string; origin: string; size: number; animated: boolean; burstKey: number }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(animated ? 0 : 1);
  const opacity = useSharedValue(animated ? 0 : 1);

  useEffect(() => {
    if (animated) tickBurst(scale, opacity, index, reduced);
  }, [animated, burstKey, index, reduced, scale, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));

  return (
    <Animated.View testID="finn-tick" style={[StyleSheet.absoluteFill, { transformOrigin: origin }, style]}>
      <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
        <Path d={d} stroke={colors.accent} strokeWidth={2.4} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}
