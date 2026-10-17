import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { CONFETTI, createBurst, step, type Particle } from './sim';

type Options = { big?: boolean; originY?: number; colors: readonly string[] };
type Trail = { particle: Particle; x: number[]; y: number[]; rot: number[] };
const Context = createContext<(options: Options) => void>(() => {});
export const useConfetti = () => useContext(Context);
export function ConfettiProvider({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [burst, setBurst] = useState<{ id: number; trails: Trail[]; frames: number } | null>(null);
  const launch = useCallback((options: Options) => {
    if (reduced) return;
    const ps = createBurst({ ...options, width, height, originY: options.originY ?? .36 });
    const frames = (options.big ? CONFETTI.big : CONFETTI.small).frames;
    const trails = ps.map(p => ({ particle: { ...p }, x: [p.x], y: [p.y], rot: [p.rot] }));
    for (let frame = 1; frame <= frames; frame++) {
      step(ps, frame, options.big);
      ps.forEach((p, i) => { trails[i].x.push(p.x); trails[i].y.push(p.y); trails[i].rot.push(p.rot); });
    }
    setBurst(old => ({ id: (old?.id ?? 0) + 1, trails, frames }));
  }, [width, height, reduced]);
  return <Context.Provider value={launch}>{children}{burst && !reduced && <ConfettiOverlay key={burst.id} trails={burst.trails} frames={burst.frames} />}</Context.Provider>;
}
function ConfettiOverlay({ trails, frames }: { trails: Trail[]; frames: number }) {
  const clock = useSharedValue(0);
  useEffect(() => { clock.value = withTiming(frames, { duration: frames / 60 * 1000, easing: Easing.linear }); return () => cancelAnimation(clock); }, [clock, frames]);
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, { zIndex: 1000 }]}>{trails.map((trail, i) => <Piece key={i} trail={trail} clock={clock} frames={frames} />)}</View>;
}
function Piece({ trail, clock, frames }: { trail: Trail; clock: SharedValue<number>; frames: number }) {
  const p = trail.particle;
  const style = useAnimatedStyle(() => {
    const f = Math.min(frames, Math.floor(clock.value));
    return { opacity: Math.min(1, Math.max(0, (frames - f) / 30)), transform: [{ translateX: trail.x[f] }, { translateY: trail.y[f] }, { rotate: `${trail.rot[f]}rad` }, { scaleY: p.shape === 'rect' ? Math.abs(Math.cos(trail.rot[f] * 1.5)) + .08 : 1 }] };
  });
  return <Animated.View style={[{ position: 'absolute', width: p.w, height: p.h, borderRadius: p.shape === 'circle' ? p.w : 1, backgroundColor: p.shape === 'squiggle' ? 'transparent' : p.color }, style]}>{p.shape === 'squiggle' && <Svg width={12} height={8} viewBox="-5 -4 12 8"><Path d="M-4 0 Q-1.5 -3.5 1 0 Q3 3.5 5 0" fill="none" stroke={p.color} strokeWidth={2} strokeLinecap="round" /></Svg>}</Animated.View>;
}
