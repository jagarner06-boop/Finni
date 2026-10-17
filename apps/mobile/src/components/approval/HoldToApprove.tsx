import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useHoldTimer } from '@/components/approval/useHoldTimer';
import { haptics } from '@/lib/haptics';
import { colors, fonts, radius, shadow } from '@/theme/tokens';

const HEIGHT = 56;
const FILL = `linear-gradient(180deg, ${colors.accentGradient[0]} 0%, ${colors.accentGradient[1]} 60%, ${colors.accentGradient[2]} 100%)`;

/**
 * Hold to approve: an inset track whose fill sweeps left → right over 600ms, with light haptics at
 * 25/50/75%. Releasing early drains it. Screen readers get an "Approve" action that needs no hold.
 */
export function HoldToApprove({
  onApprove,
  onHoldStart,
  onHoldCancel,
  disabled = false,
}: {
  onApprove: () => void;
  onHoldStart?: () => void;
  onHoldCancel?: () => void;
  disabled?: boolean;
}) {
  const [holding, setHolding] = useState(false);
  const [width, setWidth] = useState(0);
  const hold = useHoldTimer({
    onMilestone: haptics.light,
    onComplete: () => {
      setHolding(false);
      onApprove();
    },
  });

  const fillStyle = useAnimatedStyle(() => ({ width: `${hold.progress.value * 100}%` }));
  const label = holding ? 'Keep holding…' : 'Hold to approve';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Hold to approve"
      accessibilityHint="Press and hold to approve, or use the Approve action."
      accessibilityState={{ disabled }}
      accessibilityActions={[{ name: 'activate', label: 'Approve' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'activate' && !disabled) onApprove();
      }}
      disabled={disabled}
      onPressIn={() => {
        setHolding(true);
        onHoldStart?.();
        hold.start();
      }}
      onPressOut={() => {
        if (!holding) return;
        setHolding(false);
        onHoldCancel?.();
        hold.cancel();
      }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.track, disabled && styles.disabled]}>
      <Text style={[styles.label, styles.onTrack]}>{label}</Text>
      {/* The fill carries a white copy of the label, clipped to the filled part. */}
      <Animated.View style={[styles.fill, fillStyle]} pointerEvents="none">
        <View style={[styles.fillLabel, { width }]}>
          <Text style={[styles.label, styles.onFill]}>{label}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    height: HEIGHT,
    borderRadius: radius.pill,
    backgroundColor: colors.accentDisabled,
    boxShadow: shadow.well,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  disabled: { opacity: 0.5 },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden', experimental_backgroundImage: FILL },
  fillLabel: { height: HEIGHT, justifyContent: 'center' },
  label: { fontFamily: fonts.bold, fontSize: 17, textAlign: 'center' },
  onTrack: { color: colors.accentPressed },
  onFill: { color: colors.surface },
});
