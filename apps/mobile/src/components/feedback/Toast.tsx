import { useEffect, useRef } from "react";
import { AccessibilityInfo, Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { haptics } from "@/lib/haptics";
import type { ToastMessage } from "@/lib/toast";
import { palette } from "@/theme/palette";
import { colors, fonts, shadow } from "@/theme/tokens";
import { entrance } from "@/theme/onboardingMotion";

export function Toast({
  message,
  onDismiss,
}: {
  message: ToastMessage;
  onDismiss: () => void;
}) {
  const reduced = useReducedMotion(),
    remaining = useSharedValue(1);
  const dismiss = useRef(onDismiss),
    used = useRef(false);
  useEffect(() => {
    dismiss.current = onDismiss;
  }, [onDismiss]);
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      [message.title, message.body].filter(Boolean).join(". "),
    );
    if (message.variant && message.variant !== "info")
      haptics[message.variant]();
    remaining.value = withTiming(0, { duration: 3000, easing: Easing.linear });
    const timer = setTimeout(() => dismiss.current(), 3000);
    return () => clearTimeout(timer);
  }, [message, remaining]);
  const timerStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: remaining.value }],
  }));
  const variant = message.variant ?? "info";
  const color =
    variant === "success"
      ? palette.mint.base
      : variant === "warning"
        ? palette.sun.base
        : variant === "error"
          ? palette.coral.base
          : colors.accent;
  return (
    <Animated.View
      entering={entrance("drop", reduced)}
      exiting={reduced ? FadeOut.duration(150) : entrance("out", false)}
      accessibilityLiveRegion="polite"
      style={{
        borderRadius: 18,
        paddingTop: 10,
        paddingHorizontal: 12,
        paddingBottom: 12,
        backgroundColor: colors.ink,
        boxShadow: shadow.toast,
        overflow: "hidden",
      }}
    >
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 11,
            backgroundColor: color,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: variant === "warning" ? colors.ink : colors.surface,
              fontFamily: fonts.bold,
              fontSize: 18,
            }}
          >
            {variant === "success"
              ? "✓"
              : variant === "warning"
                ? "!"
                : variant === "error"
                  ? "×"
                  : "↶"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.surface,
              fontFamily: fonts.semibold,
              fontSize: 14,
            }}
          >
            {message.title}
          </Text>
          {message.body && (
            <Text
              style={{
                color: colors.surface,
                fontFamily: fonts.regular,
                fontSize: 13,
              }}
            >
              {message.body}
            </Text>
          )}
        </View>
        {message.onUndo && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Undo"
            onPress={() => {
              if (used.current) return;
              used.current = true;
              onDismiss();
              message.onUndo?.();
            }}
            style={{
              minHeight: 44,
              paddingHorizontal: 10,
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: colors.accentTint,
                fontFamily: fonts.bold,
                fontSize: 13,
              }}
            >
              Undo
            </Text>
          </Pressable>
        )}
      </View>
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 3,
            transformOrigin: "left",
            backgroundColor: color,
          },
          timerStyle,
        ]}
      />
    </Animated.View>
  );
}
