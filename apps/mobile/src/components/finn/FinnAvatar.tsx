import type { Mood } from '@finni/shared';
import { Image as AnimatedImage } from 'expo-image';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  FadeOut,
  Keyframe,
  LayoutAnimationConfig,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { FINN_HEAD, FINN_HEAD_RARE, FINN_LABEL } from '@/components/finn/assets';
import { FINN_REACTIONS, type ReactionName } from '@/components/finn/reactions';
import { ease } from '@/theme/motion';
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
  animated = false,
}: {
  mood?: Mood;
  size?: FinnAvatarSize;
  ring?: boolean;
  /** Explicit art for special moments (e.g. `love` on goal complete). The label still follows `mood`. */
  head?: keyof typeof FINN_HEAD_RARE;
  /** Hero Finns: play the reaction GIF for this mood/face once on arrival and on every change. */
  animated?: boolean;
}) {
  const source = head ? FINN_HEAD_RARE[head] : FINN_HEAD[mood];
  const ringColor = ring ? moodRing[mood] : null;
  const playing = useReaction(animated ? ((head ?? mood) as ReactionName) : null);
  const pop = usePop(playing);

  const sphere = (
    <View style={[styles.sphere, { width: size, height: size, borderRadius: size / 2 }]}>
      <Animated.View style={[styles.fill, pop]}>
        <LayoutAnimationConfig skipEntering>
          {playing ? (
            <Animated.View key={`reaction-${playing.name}-${playing.run}`} entering={headIn} exiting={reactionOut} style={styles.head}>
              <AnimatedImage
                testID="finn-reaction"
                source={playing.reaction.source}
                autoplay
                contentFit="cover"
                style={{ width: size, height: size }}
              />
            </Animated.View>
          ) : (
            <Animated.View key={String(source)} entering={headIn} exiting={headOut} style={styles.head}>
              <Image testID="finn-head" source={source} style={{ width: size, height: size }} />
            </Animated.View>
          )}
        </LayoutAnimationConfig>
      </Animated.View>
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

const reactionOut = FadeOut.duration(180);

/**
 * Plays the reaction for `name` once whenever it changes (and on mount), then returns null so the
 * static head comes back. Nothing plays under Reduce Motion or when no reaction file exists yet.
 */
function useReaction(name: ReactionName | null) {
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState<{ name: ReactionName; run: number; reaction: (typeof FINN_REACTIONS)[ReactionName] & {} } | null>(null);

  useEffect(() => {
    const reaction = name ? FINN_REACTIONS[name] : undefined;
    if (!name || !reaction || reduced) {
      setPlaying(null);
      return;
    }
    setPlaying((p) => ({ name, run: (p?.run ?? 0) + 1, reaction }));
    const timer = setTimeout(() => setPlaying(null), reaction.durationMs);
    return () => clearTimeout(timer);
  }, [name, reduced]);

  return playing;
}

/** Squishy pop when a reaction starts: dip to .92 and squash, then spring back with a little overshoot. */
function usePop(playing: { run: number } | null) {
  const reduced = useReducedMotion();
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);
  const run = playing?.run;

  useEffect(() => {
    if (!run || reduced) return;
    sx.value = withSequence(withTiming(0.96, { duration: 120, easing: ease.out }), withSpring(1, motion.finnSpring));
    sy.value = withSequence(withTiming(0.88, { duration: 120, easing: ease.out }), withSpring(1, motion.finnSpring));
  }, [run, reduced, sx, sy]);

  return useAnimatedStyle(() => ({ transformOrigin: '50% 100%', transform: [{ scaleX: sx.value }, { scaleY: sy.value }] }));
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill },
  sphere: { overflow: 'hidden', experimental_backgroundImage: SPHERE, boxShadow: shadow.sphere },
  // The art is transparent, so the head sits straight on the sphere.
  head: { ...StyleSheet.absoluteFill },
});
