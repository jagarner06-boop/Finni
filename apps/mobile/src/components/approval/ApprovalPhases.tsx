import type { PendingAction, PendingActionType } from '@finni/shared';
import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, Keyframe, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { AMOUNT_LABEL } from '@/components/approval/copy';
import { HoldToApprove } from '@/components/approval/HoldToApprove';
import { FinnAvatar, type FinnAvatarSize } from '@/components/finn/FinnAvatar';
import { FinnTicks } from '@/components/finn/FinnTicks';
import { FinnTyping } from '@/components/finn/FinnTyping';
import { useFinnReaction } from '@/components/finn/useFinnReaction';
import { Button } from '@/components/ui/Button';
import { haptics } from '@/lib/haptics';
import { splitMoney } from '@/lib/format';
import { ease } from '@/theme/motion';
import { colors, fonts, motion } from '@/theme/tokens';

// ---------- Review ----------

export function ReviewPhase({ action, onApprove, onNotNow }: { action: PendingAction; onApprove: () => void; onNotNow: () => void }) {
  const [whyOpen, setWhyOpen] = useState(false);
  const finn = useFinnReaction();
  const label = AMOUNT_LABEL[action.type];
  const amount = label && action.amountCents != null ? splitMoney(action.amountCents) : null;

  return (
    <View style={styles.phase}>
      <Animated.View style={finn.style}>
        <ShieldedFinn size={48} />
      </Animated.View>
      <Text style={styles.summary}>{action.title}</Text>

      {amount && (
        <View>
          <Text style={styles.micro}>{label}</Text>
          <Text style={styles.amount}>
            {amount.whole}
            <Text style={styles.cents}>{amount.cents}</Text>
          </Text>
        </View>
      )}

      {(action.fromLabel || action.toLabel) && (
        <View style={styles.details}>
          {action.fromLabel && <Detail label="From" value={action.fromLabel} sub={action.fromDetail} />}
          {action.toLabel && <Detail label="To" value={action.toLabel} sub={action.toDetail} />}
        </View>
      )}

      {action.reason ? (
        <View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: whyOpen }}
            onPress={() => setWhyOpen((o) => !o)}
            hitSlop={10}
            style={styles.why}>
            <Text style={styles.whyLabel}>Why Finn suggests this</Text>
            <Feather name={whyOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.accent} />
          </Pressable>
          {whyOpen && <Text style={styles.body}>{action.reason}</Text>}
        </View>
      ) : null}

      <HoldToApprove onApprove={onApprove} onHoldStart={finn.holdSquash} onHoldCancel={finn.release} />
      <Button label="Not now" variant="ghost" onPress={onNotNow} />
    </View>
  );
}

function Detail({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.detailRight}>
        <Text style={styles.detailValue}>{value}</Text>
        {sub ? <Text style={styles.detailSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

/** Finn with the shield badge: approval is a protected moment. */
function ShieldedFinn({ size }: { size: FinnAvatarSize }) {
  return (
    <View>
      <FinnAvatar mood="happy" size={size} />
      <View style={styles.badge}>
        <Feather name="shield" size={12} color={colors.surface} />
      </View>
    </View>
  );
}

// ---------- Executing ----------

export function ExecutingPhase() {
  return (
    <View style={[styles.phase, styles.center]}>
      <FinnAvatar mood="thinking" size={64} />
      <Text style={styles.title}>Sending to Capital One…</Text>
      <FinnTyping />
    </View>
  );
}

// ---------- Executed ----------

// Head pops in: 0.85 → 1 with overshoot.
const pop = new Keyframe({
  0: { transform: [{ scale: 0.85 }], opacity: 0 },
  100: { transform: [{ scale: 1 }], opacity: 1, easing: ease.overshoot },
}).duration(motion.hero);

export function ExecutedPhase({
  action,
  onDone,
  onViewActivity,
}: {
  action: PendingAction;
  onDone: () => void;
  onViewActivity: () => void;
}) {
  const finn = useFinnReaction();
  const { hop } = finn;

  useEffect(() => {
    haptics.success();
    hop();
  }, [hop]);

  return (
    <View style={[styles.phase, styles.center]}>
      <View style={styles.celebrate}>
        <View style={styles.ticksLeft}>
          <FinnTicks count={3} animated size={28} />
        </View>
        {/* The pop and Finn's hop both use transform, so they sit on separate views. */}
        <Animated.View entering={pop}>
          <Animated.View style={finn.style}>
            <FinnAvatar mood="celebrating" size={88} />
          </Animated.View>
        </Animated.View>
        <View style={styles.ticksRight}>
          <FinnTicks count={3} animated size={28} />
        </View>
      </View>
      <Text style={styles.done}>Done.</Text>
      {action.resultLine ? <Text style={[styles.body, styles.centerText]}>{action.resultLine}</Text> : null}
      <Text style={styles.meta}>
        Confirmation {action.reference ?? `#${action.id.slice(-6).toUpperCase()}`} ·{' '}
        <Text accessibilityRole="link" onPress={onViewActivity} style={styles.link}>
          View in Activity
        </Text>
      </Text>
      <View style={styles.fullWidth}>
        <Button label="Done" onPress={onDone} />
      </View>
    </View>
  );
}

// ---------- Failed ----------

export function FailedPhase({ type, onRetry, onNotNow }: { type: PendingActionType; onRetry: () => void; onNotNow: () => void }) {
  const reduced = useReducedMotion();
  const x = useSharedValue(0);

  useEffect(() => {
    haptics.error();
    if (reduced) return;
    const q = { duration: motion.standard / 4, easing: Easing.inOut(Easing.sin) };
    x.set(withSequence(withTiming(-4, q), withTiming(4, q), withTiming(-4, q), withTiming(0, q)));
  }, [reduced, x]);

  const nudge = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <Animated.View style={[styles.phase, styles.center, nudge]}>
      <FinnAvatar mood="worried" size={88} ring />
      <Text style={styles.title}>That didn’t go through.</Text>
      <Text style={[styles.body, styles.centerText]}>
        Capital One didn’t respond.{' '}
        <Text style={styles.strong}>{type === 'cancel_subscription' ? 'Nothing was changed.' : 'Nothing was moved.'}</Text> You can try
        again now, or Finn will remind you tomorrow.
      </Text>
      <View style={styles.fullWidth}>
        <Button label="Try again" onPress={onRetry} />
        <Button label="Not now" variant="ghost" onPress={onNotNow} />
      </View>
    </Animated.View>
  );
}

// ---------- Expired / declined ----------

export function EndedPhase({ declined, onDone }: { declined: boolean; onDone: () => void }) {
  return (
    <View style={[styles.phase, styles.center]}>
      <FinnAvatar mood="happy" head={declined ? 'sad' : undefined} size={64} />
      <Text style={styles.title}>{declined ? 'You declined this.' : 'This request expired.'}</Text>
      <Text style={[styles.body, styles.centerText]}>Nothing was moved.</Text>
      <View style={styles.fullWidth}>
        <Button label="Done" onPress={onDone} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  phase: { gap: 16 },
  center: { alignItems: 'center' },
  centerText: { textAlign: 'center' },
  fullWidth: { alignSelf: 'stretch', gap: 8 },
  summary: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, color: colors.ink },
  title: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 24, color: colors.ink, textAlign: 'center' },
  done: { fontFamily: fonts.bold, fontSize: 24, color: colors.ink },
  micro: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.5, color: colors.muted },
  amount: { fontFamily: fonts.bold, fontSize: 40, lineHeight: 46, color: colors.ink, fontVariant: ['tabular-nums'] },
  cents: { fontFamily: fonts.regular, fontSize: 26 },
  details: { borderTopWidth: 1, borderColor: colors.hairline },
  detail: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.hairline },
  detailLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  detailRight: { flexShrink: 1, alignItems: 'flex-end', gap: 2 },
  detailValue: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  detailSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, fontVariant: ['tabular-nums'] },
  why: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 24 },
  whyLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.accent },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.muted, marginTop: 6 },
  strong: { fontFamily: fonts.bold, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, textAlign: 'center' },
  link: { fontFamily: fonts.semibold, color: colors.accent },
  badge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrate: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ticksLeft: { transform: [{ scaleX: -1 }] },
  ticksRight: {},
});
