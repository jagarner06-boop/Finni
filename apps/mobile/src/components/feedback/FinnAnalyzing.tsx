import { Image, Text, View } from "react-native";
import { useEffect, useId } from 'react';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { FINN_POSE } from "@/components/finn/assets";
import { LoopView, MotionView } from "@/components/ui/MotionView";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { colors, fonts } from "@/theme/tokens";
export function FinnAnalyzing({
  completed,
  found,
  error,
  onRetry,
}: {
  completed: number;
  found: number;
  error?: string | null;
  onRetry: () => void;
}) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  const gradientId = useId();
  const done = Math.max(0, Math.min(4, completed));
  useEffect(() => { progress.value = withTiming(done / 4, { duration: reduced ? 150 : 500, easing: Easing.out(Easing.cubic) }); }, [done, progress, reduced]);
  const progressStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` as `${number}%` }));
  const labels = [
    "Reading 90 days of transactions",
    "Finding subscriptions",
    "Checking upcoming bills",
    completed === 4 ? `Found ${found} ways to save` : "Spotting ways to save",
  ];
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        padding: 24,
        gap: 24,
        backgroundColor: colors.canvas,
      }}
    >
      <View
        style={{
          width: 160,
          height: 160,
          alignSelf: "center",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Image
          accessibilityLabel="Finn is analyzing your accounts"
          source={FINN_POSE.laptop}
          style={{ width: 130, height: 130 }}
        />
        {[1, 0.7, 0.5, 0.3].map((opacity, i) => (
          <LoopView
            key={i}
            kind="orbit"
            delay={800 * i}
            style={{ position: "absolute", width: 140, height: 140 }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.accent,
                opacity,
                alignSelf: "center",
              }}
            />
          </LoopView>
        ))}
      </View>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 4, now: completed }}
        style={{
          height: 10,
          borderRadius: 5,
          backgroundColor: colors.warmTrack,
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={[{ height: 10, backgroundColor: colors.accent }, progressStyle]}
          // Width advances only when a real analysis task completes.
        >
          <Svg width="100%" height={10}><Defs><LinearGradient id={gradientId} x1="0" x2="1"><Stop offset="0" stopColor={colors.accentGradient[0]} /><Stop offset="1" stopColor={colors.accentGradient[1]} /></LinearGradient></Defs><Rect width="100%" height={10} fill={`url(#${gradientId})`} /></Svg>
        </Animated.View>
      </View>
      {labels.map((label, i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            gap: 12,
            alignItems: "center",
            opacity: i > completed ? 0.45 : 1,
          }}
        >
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              borderWidth: 2,
              borderColor:
                i <= completed ? colors.accent : colors.secondaryBorder,
              backgroundColor: i < completed ? colors.accent : colors.surface,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {i < completed ? (
              <MotionView effect="bigPop">
                <Text style={{ color: colors.surface }}>✓</Text>
              </MotionView>
            ) : (
              i === completed && (
                <LoopView kind="pulse">
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.accent,
                    }}
                  />
                </LoopView>
              )
            )}
          </View>
          <Text
            style={{
              flex: 1,
              fontFamily: fonts.regular,
              fontSize: 15,
              color: colors.ink,
            }}
          >
            {label}
          </Text>
        </View>
      ))}
      {error && (
        <>
          <Text accessibilityRole="alert" style={{ color: colors.dangerInk }}>
            {error}
          </Text>
          <PrimaryButton label="Try again" onPress={onRetry} />
        </>
      )}
    </View>
  );
}
