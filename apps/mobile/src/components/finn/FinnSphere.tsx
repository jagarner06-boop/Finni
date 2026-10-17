import { useId } from 'react';
import { Image, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { palette, type PaletteKey } from '@/theme/palette';
import { colors, shadow } from '@/theme/tokens';
import { ONBOARDING_HEAD } from './assets';

export type FinnHead = keyof typeof ONBOARDING_HEAD;
export function FinnSphere({ size = 48, head = 'happy', ring }: { size?: number; head?: FinnHead; ring?: PaletteKey }) {
  const gradient = useId();
  return <View accessibilityRole="image" accessibilityLabel={`Finn looks ${head}`} style={{ width: size, height: size, borderRadius: size / 2, boxShadow: shadow.sphere }}>
    {ring && <View style={{ position: 'absolute', inset: -6, borderRadius: size, borderWidth: 3, borderColor: palette[ring].base }} />}
    <View style={{ flex: 1, borderRadius: size / 2, overflow: 'hidden', backgroundColor: colors.belly }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}><Defs><RadialGradient id={gradient} cx="34%" cy="26%" rx="75%" ry="75%"><Stop offset="0" stopColor={colors.bellySphere[0]} /><Stop offset={0.42} stopColor={colors.bellySphere[1]} /><Stop offset="1" stopColor={colors.bellySphere[2]} /></RadialGradient></Defs><Rect width={size} height={size} fill={`url(#${gradient})`} /></Svg>
      <Image accessible={false} source={ONBOARDING_HEAD[head]} style={{ width: size * 1.2, height: size * 1.2, position: 'absolute', top: -size * .1, left: -size * .1 }} />
    </View>
  </View>;
}
