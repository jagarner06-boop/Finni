import type { ReactNode } from "react";
import {
  Text,
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { palette, type PaletteKey } from "@/theme/palette";
import { colors, fonts, shadow } from "@/theme/tokens";

export const layout = StyleSheet.create({
  title: { fontFamily: fonts.bold, fontSize: 22, color: colors.ink },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 23,
    color: colors.muted,
  },
  note: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  amount: {
    fontFamily: fonts.bold,
    fontVariant: ["tabular-nums"],
    color: colors.ink,
  },
});
export function Micro({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        fontFamily: fonts.semibold,
        fontSize: 12,
        letterSpacing: 0.48,
        textTransform: "uppercase",
        color: colors.muted,
      }}
    >
      {children}
    </Text>
  );
}
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          padding: 18,
          gap: 14,
          borderRadius: 20,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.hairline,
          boxShadow: shadow.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function IconTile({
  path,
  color,
  size = 40,
}: {
  path: string;
  color: PaletteKey;
  size?: number;
}) {
  return (
    <View
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: size === 40 ? 13 : 12,
        backgroundColor: palette[color].tint,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24">
        <Path
          d={path}
          stroke={palette[color].base}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}
