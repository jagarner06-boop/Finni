import { formatCents, type Card } from '@finni/shared';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadow } from '@/theme/tokens';

// One renderer per Card type. Slice A/B add the rest (transactions, spending, bills, goals, ATMs, approvals).
export function CardRenderer({ card }: { card: Card }) {
  switch (card.type) {
    case 'account_list':
      return (
        <View style={styles.card}>
          {card.accounts.map((a) => (
            <View key={a.id} style={styles.row}>
              <View>
                <Text style={styles.title}>{a.nickname}</Text>
                <Text style={styles.caption}>{a.isGoal ? 'Savings goal' : a.type}</Text>
              </View>
              <Text style={styles.money}>{formatCents(a.balanceCents)}</Text>
            </View>
          ))}
        </View>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: 14, gap: 12, ...shadow },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: colors.deep },
  caption: { fontSize: 13, color: colors.muted },
  money: { fontSize: 18, fontWeight: '800', color: colors.deep, fontVariant: ['tabular-nums'] },
});
