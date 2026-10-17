import type { Mood } from '@finni/shared';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { FadeOut, Keyframe, LayoutAnimationConfig } from 'react-native-reanimated';

import { FINN_HEAD, FINN_HEAD_RARE, FINN_LABEL } from '@/components/finn/assets';
import { colors, moodRing, motion, shadow } from '@/theme/tokens';

export type FinnAvatarSize = 24 | 32 | 40 | 48 | 64 | 88 | 120;

const RING = 2;
const GAP = 2;

// Mood change: crossfade with the new head scaling .9 → 1.
const headIn = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.9 }] },
  100: { opacity: 1, transform: [{ scale: 1 }] },
}).duration(motion.micro);
const headOut = FadeOut.duration(motion.micro);

const SPHERE = `radial-gradient(circle at 34% 26%, ${colors.bellySphere[0]} 0%, ${colors.bellySphere[1]} 42%, ${colors.bellySphere[2]} 100%)`;

export function FinnAvatar({
  mood = 'happy',
  size = 40,
  ring = false,
  head,
}: {
  mood?: Mood;
  size?: FinnAvatarSize;
  ring?: boolean;
  /** Explicit art for special moments (e.g. `love` on goal complete). The label still follows `mood`. */
  head?: keyof typeof FINN_HEAD_RARE;
}) {
  const source = head ? FINN_HEAD_RARE[head] : FINN_HEAD[mood];
  const ringColor = ring ? moodRing[mood] : null;

  const sphere = (
    <View style={[styles.sphere, { width: size, height: size, borderRadius: size / 2 }]}>
      <LayoutAnimationConfig skipEntering>
        <Animated.View key={String(source)} entering={headIn} exiting={headOut} style={styles.head}>
          <Image testID="finn-head" source={source} style={{ width: size, height: size }} />
        </Animated.View>
      </LayoutAnimationConfig>
    </View>
  );

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={FINN_LABEL[mood]}>
      {ringColor ? (
        <View
          testID="finn-ring"
          style={{ borderWidth: RING, borderColor: ringColor, padding: GAP, borderRadius: size / 2 + RING + GAP }}>
          {sphere}
        </View>
      ) : (
        sphere
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sphere: { overflow: 'hidden', experimental_backgroundImage: SPHERE, boxShadow: shadow.sphere },
  // Multiply hides the placeholder art's light background against the sphere.
  head: { ...StyleSheet.absoluteFill, mixBlendMode: 'multiply' },
});
