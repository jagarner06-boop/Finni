import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, SlideOutDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAction, useApproveAction, useRejectAction } from '@/api/queries';
import { useAuth } from '@/auth/AuthProvider';
import { EndedPhase, ExecutedPhase, ExecutingPhase, FailedPhase, ReviewPhase } from '@/components/approval/ApprovalPhases';
import { phaseFor } from '@/components/approval/copy';
import { GoalCompleteOverlay, useGoalCompleted } from '@/components/approval/GoalComplete';
import { StepUpPhase } from '@/components/approval/StepUpPhase';
import { FinnTyping } from '@/components/finn/FinnTyping';
import { colors, motion, radius } from '@/theme/tokens';

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
  const completedGoal = useGoalCompleted(action);
  const close = () => router.back();
  const sheetIn = useSlideUp();

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
      <Animated.View exiting={sheetOut} style={[styles.sheet, sheetIn, { paddingBottom: insets.bottom + 16 }]}>
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
      {completedGoal && <GoalCompleteOverlay name={completedGoal} />}
    </View>
  );
}

/**
 * Slide the sheet up with a transform, not an `entering` layout animation. Layout animations pin the
 * sheet's frame to where it was when it mounted (the short loading state), so when the real content
 * loaded mid-slide the sheet grew downward and its bottom ended up off-screen.
 */
function useSlideUp() {
  const { height } = useWindowDimensions();
  const y = useSharedValue(height);
  useEffect(() => {
    y.value = withTiming(0, { duration: motion.standard, easing: Easing.out(Easing.cubic) });
  }, [y]);
  return useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
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
