import { useEffect, useState, type ReactNode } from "react";
import { View, type DimensionValue } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { LoopView } from "@/components/ui/MotionView";
import { colors } from "@/theme/tokens";

export function Delayed({
  children,
  delay = 300,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  return visible ? <>{children}</> : null;
}
export function Skeleton({ hero = false }: { hero?: boolean }) {
  return (
    <View accessible accessibilityLabel="Loading" style={{ gap: 14 }}>
      {hero && <Block height={150} width="100%" />}
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <Block width={40} height={40} />
        <View style={{ flex: 1, gap: 8 }}>
          <Block width="70%" height={12} />
          <Block width="45%" height={10} />
        </View>
        <Block width={56} height={14} />
      </View>
    </View>
  );
}
function Block({ width, height }: { width: DimensionValue; height: number }) {
  const reduced = useReducedMotion();
  return (
    <View
      style={{
        width,
        height,
        borderRadius: height > 40 ? 20 : 8,
        backgroundColor: colors.warmTrack,
        overflow: "hidden",
      }}
    >
      {!reduced && (
        <LoopView
          kind="shimmer"
          style={{
            width: 180,
            height,
            opacity: 0.8,
            experimental_backgroundImage: `linear-gradient(90deg, ${colors.warmTrack}, ${colors.canvas}, ${colors.warmTrack})`,
          }}
        />
      )}
    </View>
  );
}
