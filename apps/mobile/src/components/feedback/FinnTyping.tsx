import { View } from "react-native";
import { FinnSphere } from "@/components/finn/FinnSphere";
import { FinnTyping as Dots } from "@/components/finn/FinnTyping";
import { LoopView, MotionView } from "@/components/ui/MotionView";
import { colors } from "@/theme/tokens";
import { Delayed } from "./Skeleton";
export function FinnTyping() {
  return (
    <Delayed>
      <MotionView
        style={{
          flexDirection: "row",
          gap: 8,
          alignItems: "flex-end",
          marginTop: 12,
        }}
      >
        <LoopView kind="bob">
          <FinnSphere size={30} head="curious" />
        </LoopView>
        <View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 20,
            borderBottomLeftRadius: 6,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.hairline,
          }}
        >
          <Dots />
        </View>
      </MotionView>
    </Delayed>
  );
}
