import { useEffect, type ReactNode } from 'react';
import { AccessibilityInfo, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ProgressSegments } from '@/components/ui/ProgressSegments';
import { MotionView } from '@/components/ui/MotionView';
import { deckColor } from '@/theme/palette';
import { colors, fonts, shadow } from '@/theme/tokens';

export function DeckShell({ deck, step, count, title, transitionKey, onBack, onNext, cta = 'Continue', disabled = false, loading = false, children }: {
  deck: keyof typeof deckColor; step: number; count: number; title: string; transitionKey?: string;
  onBack?: () => void; onNext: () => void; cta?: string; disabled?: boolean; loading?: boolean; children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const number = ['basics', 'income', 'personality', 'connect'].indexOf(deck) + 1;
  useEffect(() => { AccessibilityInfo.announceForAccessibility(title); }, [title]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { onBack?.(); return true; });
    return () => subscription.remove();
  }, [onBack]);
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: colors.canvas, paddingTop: insets.top }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4, paddingHorizontal: 16, paddingBottom: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" accessibilityState={{ disabled: !onBack }} disabled={!onBack} onPress={onBack} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: onBack ? 1 : .35 }}><View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.secondaryBorder, backgroundColor: colors.surface, boxShadow: shadow.secondary, alignItems: 'center', justifyContent: 'center' }}><Svg width={18} height={18} viewBox="0 0 20 20"><Path d="M12 4l-6 6 6 6" stroke={colors.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg></View></Pressable>
      <ProgressSegments count={count} index={step} deck={number} color={deckColor[deck]} />
      <Text style={{ width: 40, textAlign: 'right', fontFamily: fonts.semibold, fontSize: 12, color: colors.muted }}>{number} of 4</Text>
    </View>
    <ScrollView key={transitionKey ?? step} keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingVertical: 12, paddingHorizontal: 20 }}>
      <MotionView effect="rise" style={{ flex: 1, gap: 20 }}>{children}</MotionView>
    </ScrollView>
    <View style={{ paddingTop: 12, paddingHorizontal: 20, paddingBottom: 30 + insets.bottom }}><PrimaryButton label={cta} onPress={onNext} disabled={disabled} loading={loading} /></View>
  </KeyboardAvoidingView>;
}
