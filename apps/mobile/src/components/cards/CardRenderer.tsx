import { formatCents, type Card } from '@finni/shared';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useApproveAction, useRejectAction } from '@/api/queries';
import { formatRelativeDay } from '@/lib/format';
import { colors, radius, shadow } from '@/theme/tokens';

// Basic one-row-per-item rendering for every Card type. Real card designs replace these in the design pass.
export function CardRenderer({ card }: { card: Card }) {
  switch (card.type) {
    case 'account_list':
      return <Rows rows={card.accounts.map((a) => [a.id, a.nickname, a.isGoal ? 'Savings goal' : a.type, formatCents(a.balanceCents)])} />;
    case 'transaction_list':
      return (
        <Rows
          title={card.title}
          rows={card.transactions.map((t) => [t.id, t.merchantName, `${t.category ?? ''} · ${formatRelativeDay(t.date)}`, `−${formatCents(t.amountCents)}`])}
        />
      );
    case 'spending_breakdown':
      return (
        <Rows
          title={`Last ${card.days} days · ${formatCents(card.totalCents)}`}
          rows={card.items.map((i) => [i.label, i.label, `${i.percent}%`, formatCents(i.amountCents)])}
        />
      );
    case 'bill_list':
      return (
        <Rows
          rows={card.bills.map((b) => [
            b.id,
            b.nickname ?? b.payee,
            b.status === 'completed' ? 'Paid' : b.status === 'recurring' ? `Monthly on the ${b.recurringDate}` : b.dueDate ? `Due ${formatRelativeDay(b.dueDate)}` : 'Unpaid',
            formatCents(b.amountCents),
          ])}
        />
      );
    case 'goal_progress':
      return (
        <Rows
          rows={card.goals.map((g) => [g.id, `${g.emoji ?? ''} ${g.name}`.trim(), `${g.percent}% of ${formatCents(g.targetCents)}`, formatCents(g.currentCents)])}
        />
      );
    case 'atm_list':
      return <Rows title={card.note} rows={card.atms.map((a) => [a.id, a.name, a.address, a.distanceMiles != null ? `${a.distanceMiles} mi` : ''])} />;
    case 'approval':
      return <ApprovalCard card={card} />;
    case 'chart':
      // Placeholder until the drawn ChartCard lands with the mobile-design merge: one row per point.
      return (
        <Rows
          title={[card.title, card.subtitle].filter(Boolean).join(' · ')}
          rows={card.labels.map((label, i) => [`${label}-${i}`, label, '', card.series.map((s) => formatCents(s.valuesCents[i] ?? 0)).join(' / ')])}
        />
      );
    default:
      // Newer API card types render nothing instead of breaking the chat.
      return null;
  }
}

function Rows({ title, rows }: { title?: string; rows: [key: string, title: string, caption: string, value: string][] }) {
  return (
    <Box>
      {title ? <Text style={styles.caption}>{title}</Text> : null}
      {rows.map(([key, t, caption, value]) => (
        <View key={key} style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.title}>{t}</Text>
            {caption ? <Text style={styles.caption}>{caption}</Text> : null}
          </View>
          <Text style={styles.money}>{value}</Text>
        </View>
      ))}
    </Box>
  );
}

const STATUS_LABEL: Record<string, string> = {
  executing: 'Working on it…',
  executed: 'Done ✅',
  rejected: 'Declined',
  expired: 'Expired',
  failed: 'Something went wrong',
};

function ApprovalCard({ card }: { card: Extract<Card, { type: 'approval' }> }) {
  const approve = useApproveAction();
  const reject = useRejectAction();
  // The mutation result is fresher than the card saved in chat history.
  const status = approve.data?.action.status ?? reject.data?.action.status ?? card.status;
  const busy = approve.isPending || reject.isPending;
  const route = [card.fromLabel, card.toLabel].filter(Boolean).join(' → ');

  return (
    <Box>
      <Text style={styles.title}>{card.title}</Text>
      {route ? <Text style={styles.caption}>{route}</Text> : null}
      {card.amountCents != null && <Text style={styles.money}>{formatCents(card.amountCents)}</Text>}
      {card.requiresStepUp && status === 'pending' && <Text style={styles.caption}>🔒 You'll confirm it's you first</Text>}
      {status === 'pending' ? (
        <View style={styles.buttons}>
          {busy ? (
            <ActivityIndicator color={colors.ocean} />
          ) : (
            <>
              <Pressable style={[styles.button, styles.secondary]} onPress={() => reject.mutate(card.actionId)}>
                <Text style={[styles.buttonText, styles.secondaryText]}>Not now</Text>
              </Pressable>
              <Pressable style={styles.button} onPress={() => approve.mutate(card.actionId)}>
                <Text style={styles.buttonText}>Approve</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : (
        <Text style={styles.caption}>{STATUS_LABEL[status] ?? status}</Text>
      )}
      {(approve.isError || reject.isError) && <Text style={styles.error}>{(approve.error ?? reject.error)?.message}</Text>}
    </Box>
  );
}

const Box = ({ children }: { children: ReactNode }) => <View style={styles.card}>{children}</View>;

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: 14, gap: 10, ...shadow },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  rowText: { flexShrink: 1 },
  title: { fontSize: 16, fontWeight: '700', color: colors.deep },
  caption: { fontSize: 13, color: colors.muted },
  money: { fontSize: 18, fontWeight: '800', color: colors.deep, fontVariant: ['tabular-nums'] },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  button: { backgroundColor: colors.ocean, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 18 },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.ocean },
  secondaryText: { color: colors.ocean },
  error: { color: colors.berry, fontSize: 13 },
});
