import { formatRelativeDay } from "@/lib/format";
import { formatCents, type Bill } from "@finni/shared";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { palette } from "@/theme/palette";
import { colors, fonts } from "@/theme/tokens";
import { MotionView } from "@/components/ui/MotionView";
export function BillRow({
  bill,
  onPress,
}: {
  bill: Bill;
  onPress: () => void;
}) {
  const days = bill.dueDate
    ? Math.max(
        0,
        Math.ceil(
          (new Date(`${bill.dueDate}T00:00:00`).getTime() -
            new Date(new Date().toDateString()).getTime()) /
            86400000,
        ),
      )
    : null;
  const paid = bill.status === "completed";
  const fraction = paid ? 1 : days === null ? 0 : Math.min(1, days / 7);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${bill.nickname ?? bill.payee}, ${formatCents(bill.amountCents)}, ${paid ? "paid" : days === null ? "no due date" : `due in ${days} days`}`}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 72,
      }}
    >
      <View
        style={{
          width: 60,
          height: 60,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Svg width={60} height={60} style={{ position: "absolute" }}>
          <Circle
            cx={30}
            cy={30}
            r={27}
            stroke={colors.warmTrack}
            strokeWidth={6}
            fill="none"
          />
          <Circle
            cx={30}
            cy={30}
            r={27}
            stroke={paid ? palette.mint.base : palette.sun.base}
            strokeWidth={6}
            fill="none"
            strokeDasharray={`${170 * fraction} 170`}
            rotation={-90}
            origin="30,30"
          />
        </Svg>
        {paid ? (
          <MotionView effect="bigPop">
            <Text style={{ color: palette.mint.ink, fontSize: 22 }}>✓</Text>
          </MotionView>
        ) : (
          <>
            <Text
              style={{
                fontFamily: fonts.bold,
                fontSize: 18,
                color: colors.ink,
              }}
            >
              {days ?? "—"}
            </Text>
            <Text style={{ fontSize: 10, color: colors.muted }}>days</Text>
          </>
        )}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.ink }}
        >
          {bill.nickname ?? bill.payee}
        </Text>
        {bill.dueDate && !paid && (
          <Text
            style={{
              fontFamily: fonts.regular,
              fontSize: 12,
              color: colors.muted,
            }}
          >
            Due {formatRelativeDay(bill.dueDate)}
          </Text>
        )}
      </View>
      <Text
        style={{
          fontFamily: fonts.bold,
          fontSize: 16,
          fontVariant: ["tabular-nums"],
          color: colors.ink,
        }}
      >
        {formatCents(bill.amountCents)}
      </Text>
    </Pressable>
  );
}
