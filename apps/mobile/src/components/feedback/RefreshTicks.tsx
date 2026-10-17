import Svg, { Path } from 'react-native-svg';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import { colors } from '@/theme/tokens';
const AnimatedPath = Animated.createAnimatedComponent(Path);
function Tick({ d, length, start, pull }: { d: string; length: number; start: number; pull: SharedValue<number> }) {
  const props = useAnimatedProps(() => {
    const p = Math.max(0, Math.min(1, pull.value / 70));
    return { strokeDashoffset: length * (1 - Math.max(0, (p - start) / (1 - start))) };
  });
  return <AnimatedPath d={d} stroke={colors.accent} strokeWidth={2.5} strokeLinecap="round" strokeDasharray={length} animatedProps={props} />;
}
export function RefreshTicks({ pull }: { pull: SharedValue<number> }) {
  return <Svg testID="refresh-ticks" pointerEvents="none" width={108} height={52} viewBox="0 0 108 52" style={{ position: 'absolute' }}>
    <Tick d="M4 18l8 5" length={10} start={0} pull={pull} />
    <Tick d="M5 34l7 -2" length={8} start={0.4} pull={pull} />
    <Tick d="M104 18l-8 5" length={10} start={0} pull={pull} />
    <Tick d="M103 34l-7 -2" length={8} start={0.4} pull={pull} />
  </Svg>;
}
