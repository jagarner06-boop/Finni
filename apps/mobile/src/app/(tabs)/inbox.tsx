import type { Nudge } from '@finni/shared';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useCreateAction, useMarkNudgeRead, useNudges } from '@/api/queries';
import { FinnAvatar } from '@/components/finn/FinnAvatar';
import { FinnPeek } from '@/components/finn/FinnPeek';
import { FinnTicks } from '@/components/finn/FinnTicks';
import { usePeek } from '@/components/finn/usePeek';
import { Button } from '@/components/ui/Button';
import { SafeAreaView } from '@/components/ui/SafeAreaView';
import { Surface } from '@/components/ui/Surface';
import { colors, fonts } from '@/theme/tokens';

// Inbox: nudges from Finn. Becomes Activity ("From Finn" / "Transactions") with the tab restructure.
// Unread nudges carry Finn's ticks; scrolling to the end makes him peek up from behind the tab bar.
export default function InboxScreen() {
  const { data, isLoading } = useNudges();
  const peek = usePeek();
  const nudges = data?.nudges ?? [];
  const unread = nudges.filter((n) => !n.readAt);
  const read = nudges.filter((n) => n.readAt);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} onScroll={peek.onScroll} scrollEventThrottle={16}>
        <Text style={styles.title} accessibilityRole="header">
          From Finn
        </Text>
        {unread.length > 0 && <Text style={styles.micro}>NEW</Text>}
        {unread.map((n) => (
          <NudgeItem key={n.id} nudge={n} />
        ))}
        {read.length > 0 && <Text style={styles.micro}>EARLIER</Text>}
        {read.map((n) => (
          <NudgeItem key={n.id} nudge={n} />
        ))}
        {!isLoading && nudges.length === 0 && <Text style={styles.empty}>Nothing from Finn right now.</Text>}
        <View style={styles.peekRoom} />
      </ScrollView>
      <FinnPeek shown={peek.shown && nudges.length > 0} message="That’s everything from Finn." />
    </SafeAreaView>
  );
}

function NudgeItem({ nudge }: { nudge: Nudge }) {
  const markRead = useMarkNudgeRead();
  const createAction = useCreateAction();
  const isUnread = !nudge.readAt;
  const action = nudge.action;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${isUnread ? 'Unread. ' : ''}${nudge.title}. ${nudge.body}`}
      onPress={() => isUnread && markRead.mutate(nudge.id)}>
      <Surface style={styles.item} padding={14}>
        <FinnAvatar mood={nudge.mood} size={40} />
        <View style={styles.itemText}>
          <View style={styles.titleRow}>
            <Text style={[styles.itemTitle, !isUnread && styles.readTitle]}>{nudge.title}</Text>
            {isUnread && <FinnTicks size={18} />}
          </View>
          <Text style={styles.body}>{nudge.body}</Text>
          {action?.type === 'propose_bill_payment' && (
            <View style={styles.action}>
              <Button
                label="Review payment"
                size="sm"
                loading={createAction.isPending}
                onPress={() =>
                  createAction.mutate(
                    { type: 'bill_payment', billId: action.billId },
                    { onSuccess: (res) => router.push(`/approve/${res.action.id}`) },
                  )
                }
              />
            </View>
          )}
        </View>
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, color: colors.ink, paddingTop: 8 },
  micro: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.5, color: colors.muted, marginTop: 4 },
  item: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  itemText: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  itemTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  readTitle: { color: colors.muted },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.muted },
  action: { alignSelf: 'flex-start', marginTop: 6 },
  empty: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 24 },
  // Space so the last nudge isn't covered when Finn peeks.
  peekRoom: { height: 96 },
});
