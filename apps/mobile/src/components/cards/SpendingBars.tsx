import { formatCents, type SpendingItem } from '@finni/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '@/theme/tokens';

/** 8pt pill bars on a warm track. Fills cycle ink → accent → light blues, never semantic colors. */
export function SpendingBars({ items, onPress }: { items: SpendingItem[]; onPress?: (label: string) => void }) {
  return (
    <View style={styles.list}>
      {items.map((item, i) => (
        <Pressable
          key={item.label}
          disabled={!onPress}
          onPress={() => onPress?.(item.label)}
          accessibilityRole={onPress ? 'button' : undefined}
          accessibilityLabel={`${item.label}, ${formatCents(item.amountCents)}, ${item.percent} percent`}
          style={styles.item}>
          <View style={styles.labels}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.amount}>{formatCents(item.amountCents)}</Text>
          </View>
          <View style={styles.track}>
            <View
              testID="spend-bar"
              style={[styles.fill, { width: `${Math.max(0, Math.min(100, item.percent))}%`, backgroundColor: colors.barFills[i % colors.barFills.length] }]}
            />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  item: { gap: 6 },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  amount: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, fontVariant: ['tabular-nums'] },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.warmTrack, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.pill },
});
