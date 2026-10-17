import { Pressable, Text, View } from 'react-native';
import { haptics } from '@/lib/haptics';
import { neutral, palette, type PaletteKey } from '@/theme/palette';
import { colors, fonts } from '@/theme/tokens';

export function Chip({ label, selected, onPress, disabled = false, color, multiple = false }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean; color?: PaletteKey; multiple?: boolean }) {
  const tint = color && palette[color];
  return <Pressable accessibilityRole={multiple ? 'checkbox' : 'radio'} accessibilityLabel={label} accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={() => { haptics.selection(); onPress(); }} style={{ minHeight: 44, justifyContent: 'center' }}>
    <View style={{ minHeight: 38, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: selected ? 1.5 : 1, borderColor: selected ? (tint ? tint.base : colors.accent) : neutral.border, backgroundColor: selected ? (tint ? tint.tint : colors.accent) : colors.surface, boxShadow: `0 2px 0 ${neutral.lip}`, opacity: disabled ? .5 : 1 }}>
      {multiple && <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: selected && tint ? tint.base : neutral.border }} />}
      <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: selected ? (tint ? tint.ink : colors.surface) : colors.ink }}>{label}</Text>
    </View>
  </Pressable>;
}
