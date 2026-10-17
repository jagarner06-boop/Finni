import { formatCents, type LedgerEntry } from '@finni/shared';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

/** Money out reads in ink with a minus sign; money in reads green with a plus. */
export function signedAmount(cents: number): string {
  return `${cents < 0 ? '−' : '+'}${formatCents(Math.abs(cents))}`;
}

export function TransactionRow({ entry }: { entry: LedgerEntry }) {
  const meta = `${entry.accountLabel} · ${entry.category ?? entry.kind}`;
  const amount = signedAmount(entry.amountCents);

  return (
    <View style={styles.row} accessible accessibilityLabel={`${entry.title}, ${meta}, ${amount}`}>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {entry.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <Text style={[styles.amount, entry.amountCents > 0 && styles.in]}>{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8 },
  text: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  amount: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, fontVariant: ['tabular-nums'] },
  in: { color: colors.successInk },
});
