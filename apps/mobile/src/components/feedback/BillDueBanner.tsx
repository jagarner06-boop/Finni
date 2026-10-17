import { Text, View } from "react-native";
import { MotionView } from "@/components/ui/MotionView";
import { colors, fonts } from "@/theme/tokens";
import { palette } from "@/theme/palette";
export function BillDueBanner({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <MotionView
      effect="drop"
      style={{
        borderRadius: 20,
        padding: 14,
        gap: 8,
        backgroundColor: colors.surface,
      }}
    >
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            backgroundColor: palette.sun.tint,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ color: palette.sun.ink, fontFamily: fonts.bold }}>
            F
          </Text>
        </View>
        <Text
          style={{
            fontFamily: fonts.semibold,
            fontSize: 12,
            color: colors.muted,
            flex: 1,
          }}
        >
          FINNI
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>now</Text>
      </View>
      <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>
        {title}
      </Text>
      <Text
        style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}
      >
        {body}
      </Text>
    </MotionView>
  );
}
