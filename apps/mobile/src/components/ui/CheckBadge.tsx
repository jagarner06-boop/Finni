import Svg, { Path } from 'react-native-svg';
import { colors } from '@/theme/tokens';
import { MotionView } from './MotionView';
export function CheckBadge() {
  return <MotionView accessible={false} style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}><Svg width={14} height={14} viewBox="0 0 20 20"><Path d="M4 10l4 4 8-8" fill="none" stroke={colors.surface} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" /></Svg></MotionView>;
}
