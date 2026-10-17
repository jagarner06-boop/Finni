import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

type IconProps = { color: string; size: number };

// Tab bar icons, drawn from the design tab bar paths.
export function HomeIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill={color} />
    </Svg>
  );
}

export function FinnGlyph({ color, size }: IconProps) {
  return (
    <Svg width={(size * 26) / 24} height={size} viewBox="0 0 26 24">
      <Ellipse cx={4.5} cy={15} rx={3.5} ry={2.2} fill={color} transform="rotate(-25 4.5 15)" />
      <Ellipse cx={21.5} cy={15} rx={3.5} ry={2.2} fill={color} transform="rotate(25 21.5 15)" />
      <Ellipse cx={13} cy={13} rx={9} ry={8} fill={color} />
      <Path
        d="M7 15.2c0-2.6 2.2-4.3 5-4.3 1.3 0 2-.8 3-1.1 1.8-.5 3.6 1.8 3.6 4.7 0 2.7-2.8 4.3-5.9 4.3S7 17.6 7 15.2z"
        fill={colors.surface}
      />
      <Circle cx={10.6} cy={14.2} r={1.1} fill={color} />
      <Circle cx={16.4} cy={13.4} r={1.1} fill={color} />
    </Svg>
  );
}

export function ActivityIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={5} y={3} width={14} height={18} rx={3} />
      <Path d="M9 8h6M9 12h6M9 16h3" />
    </Svg>
  );
}

export function SettingsIcon({ color, size }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Circle cx={12} cy={12} r={3} />
      <Path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
    </Svg>
  );
}
