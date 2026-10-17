import { View } from 'react-native';
import { neutral } from '@/theme/palette';
import { colors } from '@/theme/tokens';
export function RadioDot({ selected }: { selected: boolean }) {
  return <View accessible={false} style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selected ? colors.accent : neutral.radioOff, alignItems: 'center', justifyContent: 'center' }}>{selected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }} />}</View>;
}
