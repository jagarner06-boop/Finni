import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ease } from '@/theme/motion';
import { colors } from '@/theme/tokens';

const DOTS = [colors.accent, colors.typingDot, colors.typingDot] as const;

/** Three dots bob 3pt on a 1.2s loop with a 150ms stagger. Static under Reduce Motion. */
export function FinnTyping() {
  return (
    <View accessible accessibilityLabel="Finn is typing" accessibilityLiveRegion="polite" style={styles.row}>
      {DOTS.map((color, i) => (
        <Dot key={i} color={color} index={i} />
      ))}
    </View>
  );
}

function Dot({ color, index }: { color: string; index: number }) {
  const reduced = useReducedMotion();
  const y = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    // keyframes: 0% rest, 30% up 3pt, 60–100% rest
    const q = { duration: 360, easing: ease.inOut };
    y.value = withDelay(index * 150, withRepeat(withSequence(withTiming(-4, q), withTiming(0, q), withTiming(0, { duration: 480 })), -1));
    return () => cancelAnimation(y);
  }, [reduced, index, y]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }], opacity: reduced ? 1 : 0.6 + (-y.value / 4) * 0.4 }));

  return <Animated.View testID="typing-dot" style={[styles.dot, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 5, alignItems: 'center', height: 20 },
  dot: { width: 8, height: 8, borderRadius: 999 },
});
