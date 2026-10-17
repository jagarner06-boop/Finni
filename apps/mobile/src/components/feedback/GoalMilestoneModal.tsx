import { useEffect } from "react";
import { formatCents, type Goal } from "@finni/shared";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { FinnSphere } from "@/components/finn/FinnSphere";
import { MotionView } from "@/components/ui/MotionView";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useConfetti } from "@/components/confetti/ConfettiOverlay";
import { haptics } from "@/lib/haptics";
import { confettiColors, palette } from "@/theme/palette";
import { colors, fonts } from "@/theme/tokens";

export function GoalMilestoneModal({
  goal,
  milestone,
  onClose,
}: {
  goal: Goal;
  milestone: number;
  onClose: () => void;
}) {
  const burst = useConfetti();
  useEffect(() => {
    burst({
      big: milestone === 100,
      originY: 0.3,
      colors: confettiColors(palette.mint.base),
    });
    haptics.success();
  }, [burst, milestone]);
  const title =
    milestone === 100
      ? `${goal.name} complete.`
      : milestone === 75
        ? "Three quarters done."
        : milestone === 50
          ? "Halfway there!"
          : "A quarter of the way.";
  return (
    <View
      accessibilityViewIsModal
      style={{
        position: "absolute",
        inset: 0,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close celebration"
        onPress={onClose}
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: colors.scrim,
        }}
      />
      <MotionView
        effect="bigPop"
        style={{
          width: "100%",
          borderRadius: 28,
          paddingVertical: 26,
          paddingHorizontal: 22,
          alignItems: "center",
          gap: 16,
          backgroundColor: colors.surface,
        }}
      >
        <View
          style={{
            width: 112,
            height: 112,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Svg width={112} height={112} style={{ position: "absolute" }}>
            <Circle
              cx={56}
              cy={56}
              r={54}
              fill="none"
              stroke={colors.warmTrack}
              strokeWidth={4}
            />
            <Circle
              cx={56}
              cy={56}
              r={54}
              fill="none"
              stroke={palette.mint.base}
              strokeWidth={4}
              strokeDasharray={`${(339.3 * Math.min(100, goal.percent)) / 100} 339.3`}
              rotation={-90}
              origin="56,56"
            />
          </Svg>
          <MotionView effect="hop" delay={100}>
            <FinnSphere
              size={96}
              head={milestone === 100 ? "love" : "excited"}
            />
          </MotionView>
        </View>
        <Text
          style={{
            color: palette.mint.ink,
            backgroundColor: palette.mint.tint,
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 999,
            fontFamily: fonts.bold,
          }}
        >
          {milestone}% · {formatCents(goal.currentCents)}
        </Text>
        <Text
          style={{
            color: colors.ink,
            fontFamily: fonts.bold,
            fontSize: 24,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: colors.muted,
            fontFamily: fonts.regular,
            fontSize: 15,
            textAlign: "center",
          }}
        >
          {milestone === 100
            ? `You saved ${formatCents(goal.currentCents)}.`
            : `${formatCents(goal.currentCents)} saved. ${formatCents(Math.max(0, goal.targetCents - goal.currentCents))} to go.`}
        </Text>
        <View style={{ flexDirection: "row", gap: 5 }}>
          {[25, 50, 75, 100].map((p) => (
            <View key={p} style={{ flex: 1, gap: 4 }}>
              <View
                style={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor:
                    p <= goal.percent ? palette.mint.base : colors.warmTrack,
                }}
              />
              <Text
                style={{
                  textAlign: "center",
                  fontSize: 11,
                  color:
                    p <= goal.percent ? palette.mint.ink : colors.placeholder,
                }}
              >
                {p}%
              </Text>
            </View>
          ))}
        </View>
        <View style={{ alignSelf: "stretch" }}>
          <PrimaryButton
            label={
              milestone === 100
                ? "Celebrate"
                : milestone === 75
                  ? "Almost"
                  : milestone === 50
                    ? "Nice"
                    : "Keep going"
            }
            onPress={onClose}
          />
        </View>
      </MotionView>
    </View>
  );
}
