import type { ReactNode } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { haptics } from '@/lib/haptics';
import { neutral, palette } from '@/theme/palette';
import { colors, fonts, shadow } from '@/theme/tokens';
import { RadioDot } from './RadioDot';
import { CheckBadge } from './CheckBadge';

export function OptionCard({ label, sub, selected, onPress, children, grid = false, style, role = 'radio', suggested = false, inline = false }: { label: string; sub?: string; selected: boolean; onPress: () => void; children?: ReactNode; grid?: boolean; style?: StyleProp<ViewStyle>; role?: 'radio' | 'checkbox'; suggested?: boolean; inline?: boolean }) {
  return <Pressable accessibilityRole={role} accessibilityLabel={label} accessibilityState={{ checked: selected }} onPress={() => { haptics.selection(); onPress(); }} style={({ pressed }) => [{ minHeight: 54, padding: 14, gap: 10, borderRadius: grid ? 18 : 16, borderWidth: selected ? 1.5 : 1, borderColor: selected ? colors.accent : neutral.border, backgroundColor: selected ? neutral.selectedBg : colors.surface, boxShadow: selected ? `0 0 0 3px ${colors.accent}1F, 0 2px 0 ${neutral.selectedLip}` : shadow.secondary, transform: [{ translateY: pressed ? 2 : 0 }], flexDirection: grid ? 'column' : 'row', alignItems: grid ? 'flex-start' : 'center' }, style]}>
    {inline && <RadioDot selected={selected} />}{children}<View style={{ flex: grid ? undefined : 1, gap: 3 }}><Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.ink }}>{label}</Text>{suggested && <Text style={{ alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, backgroundColor: palette.lilac.tint, color: palette.lilac.ink, fontFamily: fonts.bold, fontSize: 11 }}>Suggested</Text>}{sub && !inline && <Text style={{ fontFamily: fonts.regular, fontSize: grid ? 12 : 13, color: colors.muted }}>{sub}</Text>}</View>
    {inline ? <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.muted }}>{sub}</Text> : grid ? selected && <View style={{ position: 'absolute', top: 12, right: 12 }}><CheckBadge /></View> : <RadioDot selected={selected} />}
  </Pressable>;
}
