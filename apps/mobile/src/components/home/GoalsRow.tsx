import { Feather } from '@expo/vector-icons';
import { formatCents, type Cents } from '@finni/shared';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

export function GoalsRow({ count, savedCents, onPress }: { count: number; savedCents: Cents; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Text style={styles.text}>{`Goals · ${count} · ${formatCents(savedCents)} saved`}</Text>
      <Feather name="chevron-right" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.7 },
  text: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, fontVariant: ['tabular-nums'] },
});
