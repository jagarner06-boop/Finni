import { EmptyState } from '@/components/feedback/EmptyState';
import { Delayed, Skeleton } from '@/components/feedback/Skeleton';
import { UnusualSpendCard } from '@/components/feedback/UnusualSpendCard';
import { Feather } from '@expo/vector-icons';
import type { LedgerEntry, Nudge } from '@finni/shared';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useActOnNudge, useDismissNudge, useMarkNudgeRead, useNudges, useTransactions } from '@/api/queries';
import { NudgeItem } from '@/components/activity/NudgeItem';
import { SegmentedControl } from '@/components/activity/SegmentedControl';
import { TransactionRow } from '@/components/activity/TransactionRow';
import { FinnPeek } from '@/components/finn/FinnPeek';
import { usePeek } from '@/components/finn/usePeek';
import { SafeAreaView } from '@/components/ui/SafeAreaView';
import { formatShortDate } from '@/lib/format';
import { colors, fonts, radius } from '@/theme/tokens';

type Segment = 'finn' | 'transactions';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function dayLabel(date: string): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date === iso(today)) return 'Today';
  if (date === iso(yesterday)) return 'Yesterday';
  return formatShortDate(date);
}

function byDay(entries: LedgerEntry[]): { date: string; entries: LedgerEntry[] }[] {
  const days: { date: string; entries: LedgerEntry[] }[] = [];
  for (const e of entries) {
    const last = days[days.length - 1];
    if (last?.date === e.date) last.entries.push(e);
    else days.push({ date: e.date, entries: [e] });
  }
  return days;
}

const monthOf = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'long' });

// Activity: nudges from Finn and every transaction. Finn peeks up at the end of either list.
export default function ActivityScreen() {
  const params = useLocalSearchParams<{ segment?: string; accountId?: string }>();
  const routeSegment: Segment | undefined = params.segment === 'transactions' ? 'transactions' : params.segment === 'finn' ? 'finn' : undefined;
  const [segment, setSegment] = useState<Segment>(routeSegment ?? 'finn');
  // A push with ?segment= switches tabs even when the screen is already mounted.
  const [seenSegment, setSeenSegment] = useState(routeSegment);
  if (routeSegment !== seenSegment) {
    setSeenSegment(routeSegment);
    if (routeSegment) setSegment(routeSegment);
  }

  const accountId = params.accountId || undefined;
  const nudgesQuery = useNudges();
  const transactions = useTransactions(accountId);
  const dismiss = useDismissNudge();
  const markRead = useMarkNudgeRead();
  const act = useActOnNudge();
  const nudges = nudgesQuery.data?.nudges ?? [];
  const fresh = nudges.filter((n) => !n.readAt && !n.resolvedAt);
  const earlier = nudges.filter((n) => n.readAt || n.resolvedAt);
  const unread = nudges.filter((n) => !n.readAt).length;
  const [search, setSearch] = useState('');
  const entries = (transactions.data?.entries ?? []).filter(e => !search.trim() || e.title.toLowerCase().includes(search.trim().toLowerCase()) || (Math.abs(e.amountCents) / 100).toFixed(2).includes(search.trim()));
  const filterLabel = accountId ? entries.find((e) => e.accountId === accountId)?.accountLabel : undefined;

  const actOn = (n: Nudge) => act.mutate(n.id, { onSuccess: (res) => router.push(`/approve/${res.action.id}`) });

  const item = (n: Nudge) => !n.resolvedAt && n.rule === 'spending_spike' ? (
    <UnusualSpendCard key={n.id} title={n.title} body={n.body} amount={n.highlight ?? undefined} onDismiss={() => dismiss.mutateAsync(n.id)} onFlag={() => n.action ? actOn(n) : router.push({ pathname: '/finn', params: { q: `Help me review this alert: ${n.title}` } })} />
  ) : (
    <NudgeItem
      key={n.id}
      nudge={n}
      acting={act.isPending && act.variables === n.id}
      onDismiss={() => dismiss.mutate(n.id)}
      onRead={() => markRead.mutate(n.id)}
      onAct={() => actOn(n)}
    />
  );

  const peekMessage =
    segment === 'finn' ? 'That’s everything from Finn.' : entries.length ? `That’s all of ${monthOf(entries[entries.length - 1].date)}.` : '';
  const hasItems = segment === 'finn' ? nudges.length > 0 : entries.length > 0;

  const peek = usePeek({ ready: hasItems });
  // Tabs stay mounted: re-arm the peek on arrival and put Finn away when leaving.
  useFocusEffect(
    useCallback(() => {
      peek.recheck();
      return peek.reset;
    }, [peek.recheck, peek.reset]),
  );
  const switchSegment = (k: Segment) => {
    if (k === segment) return;
    peek.reset();
    setSegment(k);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        onScroll={peek.onScroll}
        onLayout={peek.onLayout}
        onContentSizeChange={peek.onContentSizeChange}
        scrollEventThrottle={16}>
        <Text style={styles.title} accessibilityRole="header">
          Activity
        </Text>
        <SegmentedControl
          segments={[
            { key: 'finn', label: unread > 0 ? `From Finn · ${unread}` : 'From Finn' },
            { key: 'transactions', label: 'Transactions' },
          ]}
          value={segment}
          onChange={(k) => switchSegment(k as Segment)}
        />

        {segment === 'finn' ? (
          <>
            {fresh.length > 0 && <Text style={styles.section}>New</Text>}
            {fresh.map(item)}
            {earlier.length > 0 && <Text style={styles.section}>Earlier</Text>}
            {earlier.map(item)}
            {nudgesQuery.isLoading && <Delayed><Skeleton /><Skeleton /></Delayed>}
            {!nudgesQuery.isLoading && nudges.length === 0 && <EmptyState pose="thumbsup" color="mint" title="Nothing needs you." sub="No bills due this week and no odd charges. I'll ping you if that changes." cta="See past activity" onPress={() => switchSegment('transactions')} />}
          </>
        ) : (
          <>
            <TextInput accessibilityLabel="Search transactions" placeholder="Search transactions" placeholderTextColor={colors.placeholder} value={search} onChangeText={setSearch} style={{ minHeight: 48, borderRadius: 14, paddingHorizontal: 16, backgroundColor: colors.surface, color: colors.ink, fontFamily: fonts.regular, fontSize: 15 }} />
            {transactions.isLoading && <Delayed><Skeleton /><Skeleton /></Delayed>}
            {accountId && filterLabel && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove filter ${filterLabel}`}
                onPress={() => router.setParams({ accountId: undefined })}
                style={styles.filter}>
                <Text style={styles.filterText}>{filterLabel}</Text>
                <Feather name="x" size={14} color={colors.ink} />
              </Pressable>
            )}
            {byDay(entries).map((day) => (
              <View key={day.date}>
                <Text style={styles.section}>{dayLabel(day.date)}</Text>
                {day.entries.map((e) => (
                  <TransactionRow key={e.id} entry={e} />
                ))}
              </View>
            ))}
            {transactions.isError && <Text style={styles.empty}>Couldn&apos;t load transactions.</Text>}
            {!transactions.isLoading && !transactions.isError && entries.length === 0 && (
              search.trim() ? <EmptyState pose="laptop" color="lilac" title={`No matches for "${search}".`} sub="Try a store name or an amount like 12.50." cta="Clear search" onPress={() => setSearch('')} /> : <Text style={styles.empty}>No transactions yet.</Text>
            )}
          </>
        )}
        <View style={styles.peekRoom} />
      </ScrollView>
      <FinnPeek shown={peek.shown && hasItems} message={peekMessage} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, color: colors.ink, paddingTop: 8 },
  section: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted, marginTop: 8 },
  empty: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 24 },
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  filterText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  // Space so the last row isn't covered when Finn peeks.
  peekRoom: { height: 96 },
});
