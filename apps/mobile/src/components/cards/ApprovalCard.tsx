import { formatCents, type Card, type PendingActionStatus } from '@finni/shared';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';
import { colors, fonts } from '@/theme/tokens';

// Outcome copy always says what did and didn't happen.
const STATUS: Record<Exclude<PendingActionStatus, 'pending'>, { text: string; dot: string }> = {
  executing: { text: 'Sending to Capital One…', dot: colors.accent },
  executed: { text: 'Done.', dot: colors.success },
  rejected: { text: 'Declined. Nothing was moved.', dot: colors.placeholder },
  expired: { text: 'Expired. Nothing was moved.', dot: colors.placeholder },
  failed: { text: "That didn't go through. Nothing was moved.", dot: colors.danger },
};

/** Summary of a proposed money move. Approval itself happens in the approve/[id] sheet. */
export function ApprovalCard({ card }: { card: Extract<Card, { type: 'approval' }> }) {
  const route = [card.fromLabel, card.toLabel].filter(Boolean).join(' → ');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (card.status !== 'pending') return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(2_147_483_647, Math.max(0, Date.parse(card.expiresAt) - Date.now() + 1)));
    return () => clearTimeout(timer);
  }, [card.status, card.expiresAt]);
  // The card saved in chat history keeps saying `pending` after its 15-minute window; don't offer a dead Review.
  const status = card.status === 'pending' && Date.parse(card.expiresAt) <= now ? 'expired' : card.status;

  return (
    <Surface style={styles.card}>
      <Text style={styles.title}>{card.title}</Text>
      {route ? <Text style={styles.meta}>{route}</Text> : null}
      {card.amountCents != null && <Text style={styles.amount}>{formatCents(card.amountCents)}</Text>}
      {status === 'pending' ? (
        <>
          {card.requiresStepUp && (
            <View style={styles.line}>
              <Feather name="lock" size={13} color={colors.muted} />
              <Text style={styles.meta}>You’ll confirm it’s you first.</Text>
            </View>
          )}
          <Button
            label={card.actionType === 'create_goal' ? 'Review' : 'Review payment'}
            size="sm"
            onPress={() => router.push(`/approve/${card.actionId}`)}
          />
        </>
      ) : (
        <View style={styles.line}>
          <View style={[styles.dot, { backgroundColor: STATUS[status].dot }]} />
          <Text style={styles.status}>{STATUS[status].text}</Text>
        </View>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  title: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  amount: { fontFamily: fonts.bold, fontSize: 22, color: colors.ink, fontVariant: ['tabular-nums'] },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  status: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
});
