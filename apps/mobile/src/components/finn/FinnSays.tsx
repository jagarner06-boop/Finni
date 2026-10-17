import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { colors, fonts } from '@/theme/tokens';
import { MotionView } from '@/components/ui/MotionView';
import { FinnSphere, type FinnHead } from './FinnSphere';
export function FinnSays({ children, head = 'curious', small = false }: { children: ReactNode; head?: FinnHead; small?: boolean }) {
  return <MotionView style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}><FinnSphere size={small ? 32 : 48} head={head} /><View style={{ flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, borderRadius: 22, borderBottomLeftRadius: 6, paddingVertical: 12, paddingHorizontal: 16 }}><Text style={{ fontFamily: fonts.regular, fontSize: small ? 15 : 17, lineHeight: small ? 21 : 24, color: colors.ink }}>{children}</Text></View></MotionView>;
}
