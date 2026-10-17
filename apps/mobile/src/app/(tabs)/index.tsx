import type { Nudge } from '@finni/shared';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useActOnNudge, useHome, useScanNudges } from '@/api/queries';
import { AccountHeroCard } from '@/components/home/AccountHeroCard';
import { AskBar } from '@/components/home/AskBar';
import { AttentionRow } from '@/components/home/AttentionRow';
import { FinnNudgeCard } from '@/components/home/FinnNudgeCard';
import { GoalsRow } from '@/components/home/GoalsRow';
import { UtilizationCard } from '@/components/home/UtilizationCard';
import { Button } from '@/components/ui/Button';
import { SafeAreaView } from '@/components/ui/SafeAreaView';
import { formatShortDate, timeOfDay } from '@/lib/format';
import { colors, fonts, radius } from '@/theme/tokens';

// Home. Expressive element: Finn in the nudge card.
export default function HomeScreen() {
  const home = useHome();
  const scan = useScanNudges();
  const act = useActOnNudge();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await scan.mutateAsync().catch(() => {});
    await home.refetch();
    setRefreshing(false);
  };

  // Actionable nudges open the approval sheet; the rest open Activity.
  const open = (nudge: Nudge) => {
    if (!nudge.action) return router.push('/activity');
    act.mutate(nudge.id, { onSuccess: (res) => router.push(`/approve/${res.action.id}`) });
  };

  const data = home.data;
  const name = data?.firstName ?? '';

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.muted} />}>
        <View style={styles.header}>
          <Text style={styles.greeting} accessibilityRole="header">
            Good <Text>{timeOfDay(new Date().getHours())},</Text> <Text style={styles.bold}>{name}</Text>
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings')} style={styles.profile}>
            <Text style={styles.initial}>{name.slice(0, 1)}</Text>
          </Pressable>
        </View>

        {home.isError && !data ? (
          <View style={styles.error}>
            <Text style={styles.errorText}>Couldn&apos;t load your accounts.</Text>
            <Button label="Try again" size="sm" variant="secondary" onPress={() => home.refetch()} />
          </View>
        ) : !data ? (
          <HomeSkeleton />
        ) : (
          <>
            {data.card ? (
              <AccountHeroCard
                name={data.card.nickname}
                mask={data.card.mask}
                balanceCents={data.card.balanceCents}
                hidden={data.hideBalance}
                onPress={() => router.push(`/activity?segment=transactions&accountId=${data.card!.accountId}`)}
              />
            ) : data.checking ? (
              <AccountHeroCard
                name={data.checking.nickname}
                mask={data.checking.mask}
                balanceCents={data.checking.balanceCents}
                hidden={data.hideBalance}
                onPress={() => router.push(`/activity?segment=transactions&accountId=${data.checking!.id}`)}
              />
            ) : null}

            {data.card && (
              <UtilizationCard
                percent={data.card.utilization}
                closesInDays={data.card.closesInDays}
                limitCents={data.card.limitCents}
                closeDate={formatShortDate(data.card.statementCloseDate)}
              />
            )}

            {data.plan ? (
              <FinnNudgeCard
                text={data.plan.body}
                highlight={data.plan.highlight ?? undefined}
                cta={`${data.plan.action?.label ?? 'Ask Finn'} →`}
                mood={data.plan.mood}
                loading={act.isPending && act.variables === data.plan.id}
                onPress={() => open(data.plan!)}
              />
            ) : (
              <FinnNudgeCard text="You're all caught up." cta="Ask Finn →" mood="happy" onPress={() => router.push('/finn')} />
            )}

            {data.attention.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.section} accessibilityRole="header">
                    Needs attention
                  </Text>
                  <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.push('/activity')}>
                    <Text style={styles.link}>See all ›</Text>
                  </Pressable>
                </View>
                {data.attention.map((n) => (
                  <AttentionRow key={n.id} title={n.title} meta={n.meta} status={n.severity} onPress={() => open(n)} />
                ))}
              </>
            )}

            <GoalsRow count={data.goals.count} savedCents={data.goals.savedCents} onPress={() => router.push('/goals')} />
          </>
        )}
      </ScrollView>
      <AskBar onPress={() => router.push('/finn?focus=1')} />
    </SafeAreaView>
  );
}

/** Gray blocks the size of the hero and cards; pulses unless Reduce Motion is on. */
function HomeSkeleton() {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduced) return;
    opacity.set(withRepeat(withTiming(0.5, { duration: 700 }), -1, true));
    return () => cancelAnimation(opacity);
  }, [reduced, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.skeleton, style]} accessibilityLabel="Loading your accounts">
      <View style={[styles.block, { height: 150 }]} />
      <View style={[styles.block, { height: 120 }]} />
      <View style={[styles.block, { height: 100 }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingBottom: 24, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  greeting: { flex: 1, fontFamily: fonts.regular, fontSize: 28, lineHeight: 34, color: colors.ink },
  bold: { fontFamily: fonts.bold },
  profile: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.bold, fontSize: 17, color: colors.accentPressed },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 },
  section: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 24, color: colors.ink },
  link: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted },
  error: { gap: 12, alignItems: 'flex-start', paddingVertical: 24 },
  errorText: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  skeleton: { gap: 16 },
  block: { borderRadius: radius.card, backgroundColor: colors.disabledBg },
});
