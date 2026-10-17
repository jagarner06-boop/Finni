import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAction, useApproveAction, useRejectAction } from '@/api/queries';
import { useAuth } from '@/auth/AuthProvider';
import { EndedPhase, ExecutedPhase, ExecutingPhase, FailedPhase, ReviewPhase } from '@/components/approval/ApprovalPhases';
import { phaseFor } from '@/components/approval/copy';
import { StepUpPhase } from '@/components/approval/StepUpPhase';
import { FinnTyping } from '@/components/finn/FinnTyping';
import { colors, motion, radius } from '@/theme/tokens';

const sheetIn = SlideInDown.duration(motion.standard).easing(Easing.out(Easing.cubic));
const sheetOut = SlideOutDown.duration(motion.standard);

// Approval sheet. Every money move ends here: plain summary, hold to approve, explicit outcome.
// A 403 step_up_required shows the step-up phase; a fresh sign-in then retries the approval.
export default function ApproveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data } = useAction(id);
  const approve = useApproveAction();
  const reject = useRejectAction();
  const { stepUp } = useAuth();
  const [steppingUp, setSteppingUp] = useState(false);

  const action = approve.data?.action ?? reject.data?.action ?? data?.action;
  const phase = action ? phaseFor(action.status, approve, steppingUp) : null;
  const close = () => router.back();

  // Cancelled or failed sign-in keeps the step-up phase up (the 403 is still the last result).
  const continueStepUp = async (id: string) => {
    setSteppingUp(true);
    const token = await stepUp().catch(() => null);
    setSteppingUp(false);
    if (token) approve.mutate(id);
  };

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
        ) : phase === 'stepUp' ? (
          <StepUpPhase busy={steppingUp} onContinue={() => continueStepUp(action.id)} onCancel={close} />
        ) : phase === 'executing' ? (
          <ExecutingPhase />
        ) : phase === 'executed' ? (
          <ExecutedPhase
            action={action}
            onDone={close}
            onViewActivity={() => {
              close();
              router.push('/activity?segment=transactions');
            }}
          />
        ) : phase === 'failed' ? (
          <FailedPhase type={action.type} onRetry={() => approve.mutate(action.id)} onNotNow={close} />
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
