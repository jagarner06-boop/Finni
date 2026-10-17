import { useState, type ReactNode } from "react";
import { Text, View, type ScrollViewProps } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  useReducedMotion,
} from "react-native-reanimated";
import { FinnSphere } from "@/components/finn/FinnSphere";
import { LoopView } from "@/components/ui/MotionView";
import { haptics } from "@/lib/haptics";
import { colors, fonts } from "@/theme/tokens";
import { refreshDistance, shouldRefresh } from "./refresh";
import { RefreshTicks } from './RefreshTicks';

export function FinnRefresh({
  onRefresh,
  children,
  ...props
}: ScrollViewProps & { onRefresh: () => Promise<void>; children: ReactNode }) {
  const reduced = useReducedMotion();
  const pull = useSharedValue(0),
    scroll = useSharedValue(0),
    atTop = useSharedValue(false),
    marked = useSharedValue(false),
    busy = useSharedValue(false);
  const [refreshing, setRefreshing] = useState(false),
    [excited, setExcited] = useState(false),
    [stamp, setStamp] = useState("");
  const refresh = async () => {
    setRefreshing(true);
    haptics.light();
    try {
      await onRefresh();
      setStamp("Updated just now");
    } catch {
      setStamp("Could not refresh. Pull to try again.");
    } finally {
      setRefreshing(false);
      setExcited(false);
      busy.value = false;
      pull.value = withTiming(0, { duration: reduced ? 150 : 300, easing: Easing.bezier(0.2, 0.8, 0.3, 1) });
    }
  };
  const pan = Gesture.Pan()
    .withTestId('finn-refresh-gesture')
    .activeOffsetY(10)
    .failOffsetX([-15, 15])
    .onBegin(() => {
      atTop.value = scroll.value <= 0;
      marked.value = false;
    })
    .onUpdate((e) => {
      if (!atTop.value || busy.value) return;
      pull.value = refreshDistance(e.translationY);
      if (pull.value >= 70 && !marked.value) {
        marked.value = true;
        runOnJS(haptics.selection)();
        runOnJS(setExcited)(true);
      }
      if (pull.value < 70 && marked.value) {
        marked.value = false;
        runOnJS(setExcited)(false);
      }
    })
    .onEnd(() => {
      if (!atTop.value || busy.value) return;
      if (shouldRefresh(pull.value, busy.value)) {
        busy.value = true;
        pull.value = 76;
        runOnJS(refresh)();
      }
    })
    .onFinalize(() => {
      // Interrupted gestures do not reach onEnd. Always release their indicator.
      if (!busy.value) {
        pull.value = withTiming(0, { duration: reduced ? 150 : 300, easing: Easing.bezier(0.2, 0.8, 0.3, 1) });
        runOnJS(setExcited)(false);
      }
    });
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pull.value }],
  }));
  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pull.value / 30),
    transform: [
      { scale: reduced ? 1 : 0.6 + 0.4 * Math.min(1, pull.value / 70) },
    ],
  }));
  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        style={[
          { position: "absolute", top: 18, alignSelf: "center", width: 108, alignItems: 'center' },
          indicatorStyle,
        ]}
      >
        <RefreshTicks pull={pull} />
        {refreshing ? (
          <LoopView kind="bob" fast>
            <FinnSphere size={52} head="curious" />
          </LoopView>
        ) : (
          <FinnSphere size={52} head={excited ? "excited" : "happy"} />
        )}
      </Animated.View>
      <GestureDetector gesture={Gesture.Simultaneous(Gesture.Native(), pan)}>
        <Animated.ScrollView
          {...props}
          bounces={false}
          overScrollMode="never"
          scrollEventThrottle={16}
          onScroll={(e) => {
            scroll.value = e.nativeEvent.contentOffset.y;
            props.onScroll?.(e);
          }}
          style={[props.style, contentStyle]}
        >
          {children}
          {stamp !== "" && (
            <Text
              accessibilityLiveRegion="polite"
              style={{
                textAlign: "center",
                fontFamily: fonts.regular,
                fontSize: 12,
                color: colors.muted,
              }}
            >
              {stamp}
            </Text>
          )}
        </Animated.ScrollView>
      </GestureDetector>
    </View>
  );
}
