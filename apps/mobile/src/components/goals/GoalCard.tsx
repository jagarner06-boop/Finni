import { formatCents, type Goal } from '@finni/shared';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { FinnAvatar } from '@/components/finn/FinnAvatar';
import { FinnTicks } from '@/components/finn/FinnTicks';
import { useFinnReaction } from '@/components/finn/useFinnReaction';
import { TideWell } from '@/components/goals/TideWell';
import { useCountUp } from '@/components/goals/useCountUp';
import { Surface } from '@/components/ui/Surface';
import { haptics } from '@/lib/haptics';
import { colors, fonts } from '@/theme/tokens';

/** Goal with its tide fill. A deposit raises the water, counts the balance up, and Finn bobs; filling it makes him hop. */
export function GoalCard({ goal, eta, behind = false }: { goal: Goal; eta?: string; behind?: boolean }) {
  const complete = goal.status === 'completed' || goal.percent >= 100;
  // Ticks burst only when the goal fills while on screen, not for goals already done.
  const [startedComplete] = useState(complete);
  const finn = useFinnReaction();
  const shownCents = useCountUp(goal.currentCents);
  const prev = useRef(goal.percent);

  const { bob, hop } = finn;
  useEffect(() => {
    const before = prev.current;
    prev.current = goal.percent;
    if (goal.percent <= before) return;
    if (before < 100 && goal.percent >= 100) {
      hop();
      haptics.success();
    } else {
      bob();
      haptics.light();
    }
  }, [goal.percent, bob, hop]);

  const label = `${goal.name}, ${goal.percent} percent, ${formatCents(goal.currentCents)} of ${formatCents(goal.targetCents)}`;

  return (
    <Surface style={[styles.card, complete && styles.complete]}>
      <View accessible accessibilityLabel={label} style={styles.row}>
        <TideWell percent={goal.percent} />
        <View style={styles.text}>
          <Text style={styles.name}>{goal.name}</Text>
          <Text style={styles.amount}>
            {formatCents(shownCents)} <Text style={styles.of}>of {formatCents(goal.targetCents)}</Text>
          </Text>
          {complete ? (
            <Text style={[styles.eta, styles.done]}>Done. Nice work.</Text>
          ) : eta ? (
            <Text style={[styles.eta, behind && styles.behind]}>{eta}</Text>
          ) : null}
        </View>
        <View style={styles.finn}>
          {complete && !startedComplete && (
            <View style={styles.ticks}>
              <FinnTicks count={3} animated size={18} />
            </View>
          )}
          <Animated.View style={finn.style}>
            <FinnAvatar mood={complete ? 'celebrating' : 'happy'} head={complete ? 'love' : undefined} size={40} />
          </Animated.View>
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14 },
  complete: { borderColor: colors.success },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  text: { flex: 1, gap: 3 },
  name: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  amount: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, fontVariant: ['tabular-nums'] },
  of: { fontFamily: fonts.regular, color: colors.muted },
  eta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  behind: { color: colors.warningInk },
  done: { fontFamily: fonts.semibold, color: colors.successInk },
  finn: { alignSelf: 'flex-start' },
  ticks: { position: 'absolute', top: -10, right: -8 },
});
