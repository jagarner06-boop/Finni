import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { colors, fonts, hitTarget, motion, radius, shadow } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

const HEIGHT = { lg: 52, md: 48, sm: 36 } as const;
// Raised variants sit on a lip; pressing drops the face onto it.
const LIP: Record<ButtonVariant, number> = { primary: 3, secondary: 2, destructive: 2, ghost: 0 };

const GRADIENT = `linear-gradient(180deg, ${colors.accentGradient[0]} 0%, ${colors.accentGradient[1]} 60%, ${colors.accentGradient[2]} 100%)`;

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'lg' | 'md' | 'sm';
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const inactive = disabled || loading;
  const reduced = useReducedMotion();
  const lip = disabled ? 0 : LIP[variant];
  const height = HEIGHT[size];
  const slop = Math.max(0, Math.ceil((hitTarget - height) / 2));
  const [pressed, setPressed] = useState(false);
  const ty = useSharedValue(0);

  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));

  const pressIn = () => {
    setPressed(true);
    haptics.light();
    if (lip && !reduced) ty.set(withTiming(lip, { duration: motion.pressDown }));
  };
  const pressOut = () => {
    setPressed(false);
    ty.set(reduced ? withTiming(0, { duration: motion.micro }) : withSpring(0, motion.finnSpring));
  };

  const look = disabled ? looks.disabled : looks[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={loading ? 'Loading' : (accessibilityLabel ?? label)}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      hitSlop={slop ? { top: slop, bottom: slop, left: 0, right: 0 } : undefined}
      style={[styles.root, { minHeight: height, marginBottom: lip }]}>
      {lip > 0 && <View style={[styles.lip, { top: lip, backgroundColor: look.lip }]} />}
      <Animated.View
        style={[
          styles.face,
          { minHeight: height, paddingHorizontal: size === 'sm' ? 16 : 22 },
          look.face,
          variant === 'primary' && !disabled && { boxShadow: pressed ? shadow.primaryPressed : shadow.primaryFace },
          faceStyle,
        ]}>
        <Text style={[styles.label, { fontSize: size === 'lg' ? 17 : size === 'sm' ? 15 : 16, color: look.text }, loading && styles.hidden]}>{label}</Text>
        {loading && <ActivityIndicator style={StyleSheet.absoluteFill} color={look.text} />}
      </Animated.View>
    </Pressable>
  );
}

const looks: Record<ButtonVariant | 'disabled', { face: ViewStyle; text: string; lip?: string }> = {
  primary: { face: { experimental_backgroundImage: GRADIENT }, text: colors.surface, lip: colors.accentLip },
  secondary: { face: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.secondaryBorder }, text: colors.ink, lip: colors.secondaryLip },
  destructive: { face: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.dangerBorder }, text: colors.dangerInk, lip: colors.secondaryLip },
  ghost: { face: { backgroundColor: 'transparent' }, text: colors.accent },
  disabled: { face: { backgroundColor: colors.disabledBg }, text: colors.placeholder },
};

const styles = StyleSheet.create({
  root: { borderRadius: radius.pill },
  lip: { position: 'absolute', left: 0, right: 0, bottom: -3, borderRadius: radius.pill },
  face: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.bold },
  hidden: { opacity: 0 },
});
