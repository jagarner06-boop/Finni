import { Image, Text, View } from "react-native";
import { FINN_POSE } from "@/components/finn/assets";
import { LoopView } from "@/components/ui/MotionView";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { palette, type PaletteKey } from "@/theme/palette";
import { colors, fonts } from "@/theme/tokens";
export function EmptyState({
  pose,
  color,
  title,
  sub,
  cta,
  onPress,
}: {
  pose: "thumbsup" | "wave" | "laptop";
  color: PaletteKey;
  title: string;
  sub: string;
  cta: string;
  onPress: () => void;
}) {
  const p = palette[color];
  return (
    <View style={{ alignItems: "center", gap: 14, paddingVertical: 20 }}>
      <View
        style={{
          width: 220,
          height: 190,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            position: "absolute",
            width: 170,
            height: 170,
            borderRadius: 85,
            backgroundColor: p.tint,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 15,
            left: 0,
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: p.tint,
            transform: [{ rotate: "-12deg" }],
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: 15,
            right: 0,
            width: 30,
            height: 30,
            borderRadius: 10,
            backgroundColor: p.tint,
            transform: [{ rotate: "14deg" }],
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 12,
            right: 6,
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: p.base,
            opacity: 0.75,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: 12,
            left: 15,
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: p.base,
            opacity: 0.8,
          }}
        />
        <LoopView>
          <Image
            accessibilityLabel={`Finn ${pose === "laptop" ? "is searching" : "waves"}`}
            source={FINN_POSE[pose]}
            style={{ width: 160, height: 160 }}
          />
        </LoopView>
      </View>
      <Text
        style={{
          fontFamily: fonts.bold,
          fontSize: 22,
          color: colors.ink,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontFamily: fonts.regular,
          fontSize: 15,
          lineHeight: 21,
          color: colors.muted,
          textAlign: "center",
        }}
      >
        {sub}
      </Text>
      <SecondaryButton label={cta} onPress={onPress} />
    </View>
  );
}
