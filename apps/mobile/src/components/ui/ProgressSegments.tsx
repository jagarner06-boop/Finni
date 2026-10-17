import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { View } from 'react-native';
import { neutral, palette, type PaletteKey } from '@/theme/palette';
export function ProgressSegments({ count, index, color, deck }: { count: number; index: number; color: PaletteKey; deck: number }) {
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={`Deck ${deck} of 4, step ${index + 1} of ${count}`} accessibilityValue={{ min: 1, max: count, now: index + 1 }} style={{ flex: 1, flexDirection: 'row', gap: 4 }}>{Array.from({ length: count }, (_, i) => <Segment key={i} active={i <= index} color={color} />)}</View>;
}

function Segment({ active, color }: { active: boolean; color: PaletteKey }) {
  const fill = useSharedValue(active ? palette[color].base : neutral.lip);
  useEffect(() => { fill.value = withTiming(active ? palette[color].base : neutral.lip, { duration: 250 }); }, [active, color, fill]);
  const style = useAnimatedStyle(() => ({ backgroundColor: fill.value }));
  return <Animated.View style={[{ flex: 1, height: 6, borderRadius: 3 }, style]} />;
}
