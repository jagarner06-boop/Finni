import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { colors, fonts, motion, radius, shadow } from '@/theme/tokens';

const TINT = `linear-gradient(180deg, ${colors.chipGradient[0]}, ${colors.chipGradient[1]})`;

/** Finn's follow-up suggestions. Tapping one sends its text right away. */
export function SuggestionChips({ chips, onPick, disabled = false }: { chips: string[]; onPick: (text: string) => void; disabled?: boolean }) {
  if (chips.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip} contentContainerStyle={styles.row} keyboardShouldPersistTaps="handled">
      {chips.map((chip) => (
        <Chip key={chip} text={chip} disabled={disabled} onPick={onPick} />
      ))}
    </ScrollView>
  );
}

function Chip({ text, disabled, onPick }: { text: string; disabled: boolean; onPick: (text: string) => void }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ask Finn: ${text}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => scale.set(withTiming(0.96, { duration: motion.micro }))}
      onPressOut={() => scale.set(withTiming(1, { duration: motion.micro }))}
      onPress={() => {
        haptics.selection();
        onPick(text);
      }}>
      <Animated.View style={[styles.chip, style]}>
        <Text style={styles.text}>{text}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // ScrollView grows to fill free space by default; the strip should only be as tall as its chips.
  strip: { flexGrow: 0, flexShrink: 0 },
  row: { gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  chip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    justifyContent: 'center',
    experimental_backgroundImage: TINT,
    boxShadow: shadow.chip,
    marginBottom: 1,
  },
  text: { fontFamily: fonts.semibold, fontSize: 14, color: colors.accentPressed },
});
