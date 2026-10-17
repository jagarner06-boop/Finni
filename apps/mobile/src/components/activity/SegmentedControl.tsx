import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, fonts, motion, radius, shadow } from '@/theme/tokens';

const PAD = 3;

/** Inset warm track with a raised white thumb that slides to the chosen segment. */
export function SegmentedControl({
  segments,
  value,
  onChange,
}: {
  segments: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, segments.findIndex((s) => s.key === value));
  const segWidth = width > 0 ? (width - PAD * 2) / segments.length : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    x.set(withTiming(index * segWidth, { duration: motion.standard }));
  }, [index, segWidth, x]);

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={styles.track} accessibilityRole="tablist" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {segWidth > 0 && <Animated.View style={[styles.thumb, { width: segWidth }, thumb]} />}
      {segments.map((s) => {
        const selected = s.key === value;
        return (
          <Pressable
            key={s.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(s.key)}
            style={styles.segment}>
            <Text style={[styles.label, selected && styles.selected]}>{s.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: PAD,
    borderRadius: radius.pill,
    backgroundColor: colors.warmTrack,
    boxShadow: 'inset 0px 1px 2px rgba(20,33,61,0.08)',
  },
  thumb: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    boxShadow: shadow.card,
  },
  segment: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted, fontVariant: ['tabular-nums'] },
  selected: { color: colors.ink },
});
