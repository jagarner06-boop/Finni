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
import { loopFrame } from '@/theme/onboardingLoops';

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
  kind?: "float" | "bob" | "dot" | "shimmer" | "orbit" | "pulse";
  delay?: number;
  fast?: boolean;
}) {
  const reduced = useReducedMotion();
  const orbitOffset = kind === 'orbit' ? delay / 3200 : 0;
  const phase = useSharedValue(orbitOffset);
  useEffect(() => {
    if (!reduced)
      phase.value = withDelay(
        kind === 'orbit' ? 0 : delay,
        withRepeat(
          withTiming(orbitOffset + 1, {
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
  }, [delay, fast, kind, orbitOffset, phase, reduced]);
  const style = useAnimatedStyle(() => {
    if (reduced) return kind === 'orbit' ? { transform: [{ rotate: `${orbitOffset * 360}deg` }] } : {};
    const p = phase.value;
    if (kind === "shimmer")
      return { transform: [{ translateX: -180 + p * 540 }] };
    if (kind === "orbit") return { transform: [{ rotate: `${p * 360}deg` }] };
    if (kind === 'pulse') return { opacity: 0.55 + 0.45 * Math.cos(p * Math.PI * 2) };
    const { y, rotation } = loopFrame(kind, p);
    return {
      ...(kind === 'bob' ? { transformOrigin: '50% 90%' } : {}),
      transform: [
        { translateY: y },
        { rotate: `${rotation}deg` },
      ],
    };
  });
  return <Animated.View {...props} style={[props.style, style]} />;
}
