import { useEffect } from "react";
import type { ViewProps } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { entrance, type Entrance } from "@/theme/onboardingMotion";

export function MotionView({
  effect = "pop",
  delay = 0,
  ...props
}: ViewProps & { effect?: Entrance; delay?: number }) {
  const reduced = useReducedMotion();
  return (
    <Animated.View {...props} entering={entrance(effect, reduced, delay)} />
  );
}

export function LoopView({
  kind = "float",
  delay = 0,
  fast = false,
  ...props
}: ViewProps & {
  kind?: "float" | "bob" | "dot" | "shimmer" | "orbit";
  delay?: number;
  fast?: boolean;
}) {
  const reduced = useReducedMotion();
  const phase = useSharedValue(0);
  useEffect(() => {
    if (!reduced)
      phase.value = withDelay(
        delay,
        withRepeat(
          withTiming(1, {
            duration:
              kind === "float"
                ? 3500
                : kind === "bob"
                  ? fast
                    ? 900
                    : 1600
                  : kind === "shimmer"
                    ? 1300
                    : kind === "orbit"
                      ? 3200
                      : 1200,
            easing: Easing.linear,
          }),
          -1,
        ),
      );
    return () => cancelAnimation(phase);
  }, [delay, fast, kind, phase, reduced]);
  const style = useAnimatedStyle(() => {
    if (reduced) return {};
    const p = phase.value;
    if (kind === "shimmer")
      return { transform: [{ translateX: -180 + p * 540 }] };
    if (kind === "orbit") return { transform: [{ rotate: `${p * 360}deg` }] };
    const y =
      kind === "float"
        ? -3 + 3 * Math.cos(p * Math.PI * 2)
        : kind === "dot"
          ? p < 0.6
            ? -4 * Math.sin((p / 0.6) * Math.PI)
            : 0
          : -3 * Math.sin(p * Math.PI * 2);
    return {
      transform: [
        { translateY: y },
        { rotate: `${kind === "bob" ? -6 * Math.sin(p * Math.PI * 2) : 0}deg` },
      ],
    };
  });
  return <Animated.View {...props} style={[props.style, style]} />;
}
