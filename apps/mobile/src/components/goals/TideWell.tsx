import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { tideHeight } from '@/components/goals/tide';
import { ease } from '@/theme/motion';
import { colors, fonts, motion, shadow } from '@/theme/tokens';

const W = 64;
const H = 84;
const WAVE = 28; // one wavelength
const DRIFT = 14;
const CREST_W = W + WAVE; // wide enough to drift without showing an edge
const CREST_H = 8;

// Gentle sine crest across the crest width.
const CREST_PATH = (() => {
  let d = `M0 ${CREST_H / 2}`;
  for (let x = 0; x < CREST_W; x += WAVE / 2) d += ` Q${x + WAVE / 4} ${x % WAVE === 0 ? 0 : CREST_H} ${x + WAVE / 2} ${CREST_H / 2}`;
  return `${d} L${CREST_W} ${CREST_H} L0 ${CREST_H} Z`;
})();

const WATER = `linear-gradient(180deg, ${colors.tideWater[0]}, ${colors.tideWater[1]})`;

/** Tide fill: water rises with the goal; on a rise the crest drifts one half-wavelength and back. */
export function TideWell({ percent }: { percent: number }) {
  const reduced = useReducedMotion();
  const level = useSharedValue(tideHeight(percent, H));
  const drift = useSharedValue(0);
  const prev = useRef(percent);

  useEffect(() => {
    if (percent === prev.current) return;
    const rose = percent > prev.current;
    prev.current = percent;
    const target = tideHeight(percent, H);
    if (reduced) {
      level.set(withTiming(target, { duration: motion.micro }));
      return;
    }
    level.set(withTiming(target, { duration: 600, easing: ease.overshoot }));
    if (rose) drift.set(withSequence(withTiming(-DRIFT, { duration: 400, easing: ease.inOut }), withTiming(0, { duration: 400, easing: ease.inOut })));
  }, [percent, reduced, level, drift]);

  const waterStyle = useAnimatedStyle(() => ({ height: level.value }));
  const crestStyle = useAnimatedStyle(() => ({ transform: [{ translateX: drift.value - WAVE / 2 }] }));
  const pct = Math.round(Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0)));

  return (
    <View style={styles.well} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Animated.View style={[styles.water, waterStyle]}>
        {pct > 0 && pct < 100 && (
          <Animated.View style={[styles.crest, crestStyle]}>
            <Svg width={CREST_W} height={CREST_H}>
              <Path d={CREST_PATH} fill={colors.tideWater[0]} />
            </Svg>
          </Animated.View>
        )}
      </Animated.View>
      <Text style={styles.label}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  well: {
    width: W,
    height: H,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.tideWellBorder,
    backgroundColor: colors.tideWell,
    boxShadow: shadow.well,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  water: { position: 'absolute', left: 0, right: 0, bottom: 0, experimental_backgroundImage: WATER },
  crest: { position: 'absolute', top: -CREST_H + 1, left: 0 },
  label: { fontFamily: fonts.bold, fontSize: 15, color: colors.heroInk, fontVariant: ['tabular-nums'] },
});
