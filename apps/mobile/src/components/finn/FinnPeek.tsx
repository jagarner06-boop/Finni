import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';

import { FinnPose } from '@/components/finn/FinnPose';
import { FinnRiveBody } from '@/components/finn/FinnRive';
import { peekIn, peekOut } from '@/theme/motion';
import { colors, fonts, radius, shadow } from '@/theme/tokens';

const SIZE = 120;

/**
 * Finn rises from behind the tab bar at the end of a list: translateY 100% → 12% → 20% over 520ms,
 * then his bubble pops in. Under Reduce Motion he fades in place. No haptic.
 */
export function FinnPeek({ shown, message }: { shown: boolean; message: string }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  const [waveKey, setWaveKey] = useState(0);

  useEffect(() => {
    if (shown) peekIn(progress, reduced);
    else peekOut(progress);
  }, [shown, reduced, progress]);

  const finnStyle = useAnimatedStyle(() => {
    if (reduced) return { opacity: progress.value, transform: [{ translateY: SIZE * 0.2 }] };
    const pct = interpolate(progress.value, [0, 0.85, 1], [100, 12, 20]);
    return { opacity: 1, transform: [{ translateY: (SIZE * pct) / 100 }] };
  });

  return (
    <View pointerEvents="none" style={styles.root}>
      {shown && (
        <Animated.View entering={FadeIn.delay(280).duration(280)} style={styles.bubble} onLayout={() => setWaveKey((k) => k + 1)}>
          <Text style={styles.text}>{message}</Text>
        </Animated.View>
      )}
      <View style={styles.window}>
        <Animated.View style={finnStyle}>
          <FinnRiveBody size={SIZE} waveKey={waveKey} fallback={<FinnPose pose="wave" size={SIZE} />} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', right: 16, bottom: 0, alignItems: 'flex-end' },
  window: { width: SIZE, height: SIZE, overflow: 'hidden' },
  bubble: {
    marginRight: SIZE * 0.4,
    marginBottom: -8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.bubble,
    borderBottomRightRadius: radius.bubbleTail,
    paddingHorizontal: 14,
    paddingVertical: 8,
    boxShadow: shadow.card,
  },
  text: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
});
