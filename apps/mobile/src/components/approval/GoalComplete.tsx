import type { GoalsResponse, PendingAction } from '@finni/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { api } from '@/api/endpoints';
import { qk } from '@/api/queries';
import { FINN_PLUSH } from '@/components/finn/assets';
import { haptics } from '@/lib/haptics';
import { colors, fonts, motion } from '@/theme/tokens';

const SHOW_MS = 2_400;

/**
 * After an executed transfer, refetches goals and compares with what was cached when the sheet
 * opened. Returns the name of a goal that just crossed 100% (for 2.4s), else null.
 */
export function useGoalCompleted(action: PendingAction | undefined): string | null {
  const client = useQueryClient();
  const before = useRef(client.getQueryData<GoalsResponse>(qk.goals));
  const checked = useRef(false);
  const [name, setName] = useState<string | null>(null);

  const executedTransfer = action?.type === 'transfer' && action.status === 'executed';

  useEffect(() => {
    if (!executedTransfer || checked.current || !before.current) return;
    checked.current = true;
    const was = new Map(before.current.goals.map((g) => [g.id, g.percent]));
    let timer: ReturnType<typeof setTimeout> | undefined;
    client
      .fetchQuery({ queryKey: qk.goals, queryFn: api.goals, staleTime: 0 })
      .then((res) => {
        const done = res.goals.find((g) => g.percent >= 100 && (was.get(g.id) ?? 100) < 100);
        if (!done) return;
        haptics.success();
        setName(done.name);
        timer = setTimeout(() => setName(null), SHOW_MS);
      })
      .catch(() => {});
    return () => clearTimeout(timer);
  }, [executedTransfer, client]);

  return name;
}

/** Full-screen plush Finn for the moment a goal fills. */
export function GoalCompleteOverlay({ name }: { name: string }) {
  return (
    <Animated.View
      entering={FadeIn.duration(motion.standard)}
      exiting={FadeOut.duration(motion.standard)}
      style={styles.overlay}
      accessibilityViewIsModal
      accessibilityLiveRegion="assertive">
      <Image source={FINN_PLUSH.complete} style={styles.plush} accessibilityLabel="Finn is celebrating" />
      <Text style={styles.title}>{name} is fully funded.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center', gap: 16 },
  plush: { width: 240, height: 240, resizeMode: 'contain' },
  title: { fontFamily: fonts.bold, fontSize: 24, color: colors.ink, textAlign: 'center', paddingHorizontal: 24 },
});
