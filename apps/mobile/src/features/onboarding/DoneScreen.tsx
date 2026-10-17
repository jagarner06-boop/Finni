import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { FinnSphere } from '@/components/finn/FinnSphere';
import { TickBurst } from '@/components/finn/TickBurst';
import { MotionView } from '@/components/ui/MotionView';
import { useConfetti } from '@/components/confetti/ConfettiOverlay';
import { haptics } from '@/lib/haptics';
import { confettiColors, palette, type PaletteKey } from '@/theme/palette';
import { colors, fonts } from '@/theme/tokens';

export function SummaryChip({ text, color }: { text: string; color: PaletteKey }) {
  return <View style={{ minHeight: 32, justifyContent: 'center', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: palette[color].tint }}><Text style={{ fontFamily: fonts.bold, fontSize: 14, color: palette[color].ink }}>{text}</Text></View>;
}
export function DoneScreen({ title, chips, next, color }: { title: string; chips: string[]; next: string; color: PaletteKey }) {
  const burst = useConfetti();
  useEffect(() => { burst({ colors: confettiColors(palette[color].base) }); haptics.success(); }, [burst, color]);
  return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
    <MotionView effect="hop" delay={100} style={{ marginBottom: 8, transformOrigin: 'bottom' }}><FinnSphere size={104} head="excited" ring={color} /><View style={{ position: 'absolute', right: -30, top: -10 }}><TickBurst color={color} /></View></MotionView>
    <Text style={{ fontFamily: fonts.bold, fontSize: 26, color: colors.ink, textAlign: 'center' }}>{title}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>{chips.map((text, i) => <SummaryChip key={i} text={text} color={color} />)}</View>
    <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.muted, textAlign: 'center' }}>{next}</Text>
  </View>;
}
