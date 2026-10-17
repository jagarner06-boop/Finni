import { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { tickBurst } from '@/theme/motion';
import { palette, type PaletteKey } from '@/theme/palette';
import { colors } from '@/theme/tokens';
export function TickBurst({ color }: { color?: PaletteKey }) {
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 28, height: 28 }}>{[0, 1].map(i => <Stroke key={i} i={i} color={color ? palette[color].base : colors.accent} />)}</View>;
}
function Stroke({ i, color }: { i: number; color: string }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(0), opacity = useSharedValue(0);
  useEffect(() => { tickBurst(scale, opacity, i, reduced, 300); return () => { cancelAnimation(scale); cancelAnimation(opacity); }; }, [i, opacity, reduced, scale]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  return <Animated.View style={[{ position: 'absolute', inset: 0 }, style]}><Svg width={28} height={28} viewBox="0 0 20 20"><Path d={i === 0 ? 'M4 14L9 6' : 'M11 16l5-6'} stroke={color} strokeWidth={2.4} strokeLinecap="round" /></Svg></Animated.View>;
}
