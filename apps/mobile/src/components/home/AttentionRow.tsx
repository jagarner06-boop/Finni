import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

export type AttentionStatus = 'danger' | 'warning' | 'success';

export function AttentionRow({ title, meta, status, onPress }: { title: string; meta: string; status: AttentionStatus; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${meta}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View testID="status-dot" style={[styles.dot, { backgroundColor: colors[status] }]} />
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.placeholder} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.7 },
  dot: { width: 9, height: 9, borderRadius: 4.5 },
  text: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, fontVariant: ['tabular-nums'] },
});
