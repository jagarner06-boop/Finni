import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptics } from '@/lib/haptics';
import { ease } from '@/theme/motion';
import { neutral } from '@/theme/palette';
import { colors, shadow } from '@/theme/tokens';

export function Toggle({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (value: boolean) => void }) {
  const reduced = useReducedMotion();
  const x = useSharedValue(value ? 21 : 3);
  useEffect(() => { x.value = withTiming(value ? 21 : 3, { duration: reduced ? 0 : 200, easing: ease.overshoot }); }, [value, reduced, x]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value }} onPress={() => { haptics.selection(); onValueChange(!value); }} style={{ width: 48, minHeight: 44, justifyContent: 'center' }}><View style={{ width: 48, height: 30, borderRadius: 15, backgroundColor: value ? colors.accent : neutral.toggleOff, boxShadow: shadow.well }}><Animated.View style={[{ position: 'absolute', top: 3, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface }, knob]} /></View></Pressable>;
}
