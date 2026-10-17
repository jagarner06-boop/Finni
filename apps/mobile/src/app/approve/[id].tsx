import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAction, useApproveAction, useRejectAction } from '@/api/queries';
import { EndedPhase, ExecutedPhase, ExecutingPhase, FailedPhase, ReviewPhase } from '@/components/approval/ApprovalPhases';
import { phaseFor } from '@/components/approval/copy';
import { FinnTyping } from '@/components/finn/FinnTyping';
import { colors, motion, radius } from '@/theme/tokens';

const sheetIn = SlideInDown.duration(motion.standard).easing(Easing.out(Easing.cubic));
const sheetOut = SlideOutDown.duration(motion.standard);

// Approval sheet. Every money move ends here: plain summary, hold to approve, explicit outcome.
// Step-up (403 → MFA → retry) happens inside apiFetch and shows as "executing".
export default function ApproveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data } = useAction(id);
  const approve = useApproveAction();
  const reject = useRejectAction();

  const action = approve.data?.action ?? reject.data?.action ?? data?.action;
  const phase = action ? phaseFor(action.status, approve) : null;
  const close = () => router.back();

  return (
    <View style={styles.root}>
      <Animated.View entering={FadeIn.duration(motion.standard)} exiting={FadeOut.duration(motion.standard)} style={StyleSheet.absoluteFill}>
        <Pressable accessibilityLabel="Close" onPress={close} style={styles.scrim} />
      </Animated.View>
      <Animated.View entering={sheetIn} exiting={sheetOut} style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.grabber} />
        {!action || !phase ? (
          <View style={styles.loading}>
            <FinnTyping />
          </View>
        ) : phase === 'review' ? (
          <ReviewPhase
            action={action}
            onApprove={() => approve.mutate(action.id)}
            onNotNow={() => {
              reject.mutate(action.id);
              close();
            }}
          />
        ) : phase === 'executing' ? (
          <ExecutingPhase />
        ) : phase === 'executed' ? (
          <ExecutedPhase action={action} onDone={close} />
        ) : phase === 'failed' ? (
          <FailedPhase onRetry={() => approve.mutate(action.id)} onNotNow={close} />
        ) : (
          <EndedPhase declined={phase === 'declined'} onDone={close} />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { flex: 1, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 16,
  },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: colors.secondaryBorder },
  loading: { alignItems: 'center', paddingVertical: 32 },
});
