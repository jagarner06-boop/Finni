import { useEffect, type ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, motion, shadow } from "@/theme/tokens";

export function Sheet({
  visible,
  onClose,
  children,
  label,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        {visible && (
          <Content onClose={onClose} label={label}>
            {children}
          </Content>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}
function Content({
  children,
  onClose,
  label,
}: {
  children: ReactNode;
  onClose: () => void;
  label: string;
}) {
  const reduced = useReducedMotion(),
    insets = useSafeAreaInsets();
  const y = useSharedValue(reduced ? 0 : 800),
    height = useSharedValue(800);
  useEffect(() => {
    y.value = withTiming(0, {
      duration: reduced ? 150 : 300,
      easing: Easing.bezier(0.2, 0.8, 0.3, 1),
    });
  }, [reduced, y]);
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      y.set(Math.max(0, e.translationY));
    })
    .onEnd(() => {
      if (y.value > height.value * 0.3) runOnJS(onClose)();
      else y.set(withSpring(0, motion.finnSpring));
    });
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: reduced ? 0 : y.value }],
  }));
  return (
    <View style={{ flex: 1, justifyContent: "flex-end" }}>
      <Animated.View
        entering={FadeIn.duration(250)}
        style={{ position: "absolute", inset: 0 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close sheet"
          onPress={onClose}
          style={{ flex: 1, backgroundColor: colors.scrim }}
        />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View
          onLayout={(e) => {
            height.value = e.nativeEvent.layout.height;
          }}
          accessibilityViewIsModal
          accessibilityLabel={label}
          entering={reduced ? FadeIn.duration(150) : undefined}
          style={[
            {
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingHorizontal: 20,
              paddingTop: 10,
              paddingBottom: 24 + insets.bottom,
              gap: 16,
              backgroundColor: colors.surface,
              boxShadow: shadow.card,
            },
            style,
          ]}
        >
          <View
            style={{
              width: 36,
              height: 5,
              borderRadius: 3,
              backgroundColor: colors.secondaryBorder,
              alignSelf: "center",
            }}
          />
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
