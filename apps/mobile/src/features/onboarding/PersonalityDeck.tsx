import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { FinnSays } from '@/components/finn/FinnSays';
import { MotionView } from '@/components/ui/MotionView';
import { OptionCard } from '@/components/ui/OptionCard';
import { useConfetti } from '@/components/confetti/ConfettiOverlay';
import { haptics } from '@/lib/haptics';
import { confettiColors, palette, onboardingVisual } from '@/theme/palette';
import { colors, fonts, shadow } from '@/theme/tokens';
import { DeckShell } from './DeckShell';
import { DoneScreen } from './DoneScreen';
import { useOnboarding } from './OnboardingProvider';
import { COPY, HABITS, HANDS_ON, HANDS_ON_NOTE } from './content';
import { canContinue, personalityFor } from './logic';
import { IconTile, layout } from './presentation';

export default function PersonalityDeck({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const { profile: p, update } = useOnboarding();
  const burst = useConfetti();
  const personality = personalityFor(p.habits);
  const titles = [COPY.personality.askHabits, personality.name, COPY.personality.askHands, COPY.personality.doneTitle];
  const next = () => {
    if (!canContinue('personality', step, p)) return;
    if (step === 0) burst({ colors: confettiColors(palette.lilac.base) });
    if (step < 3) setStep(step + 1); else onComplete();
  };
  return <DeckShell deck="personality" step={step} count={4} title={titles[step]} onBack={step ? () => setStep(step - 1) : undefined} onNext={next} disabled={!canContinue('personality', step, p)} cta={step === 0 ? COPY.cta.seeStyle : COPY.cta.continue}>
    {step === 0 && <><FinnSays>{titles[0]}</FinnSays>{HABITS.map((question, i) => <View key={question.q} style={{ gap: 10 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{question.q}</Text><View style={{ flexDirection: 'row', gap: 8 }}>{(['a', 'b'] as const).map(answer => <Pressable key={answer} accessibilityRole="radio" accessibilityLabel={`${question.q} ${question[answer]}`} accessibilityState={{ checked: p.habits[i] === answer }} onPress={() => { const habits = [...p.habits] as typeof p.habits; habits[i] = answer; update({ habits }); haptics.selection(); }} style={{ flex: 1, minHeight: 56, padding: 12, borderRadius: 16, justifyContent: 'center', borderWidth: 1, borderColor: p.habits[i] === answer ? palette.lilac.base : colors.secondaryBorder, backgroundColor: p.habits[i] === answer ? palette.lilac.base : colors.surface, boxShadow: p.habits[i] === answer ? onboardingVisual.selectedHabitShadow : shadow.secondary }}><Text style={{ fontFamily: fonts.bold, fontSize: 14, textAlign: 'center', color: p.habits[i] === answer ? colors.surface : colors.ink }}>{question[answer]}</Text></Pressable>)}</View></View>)}</>}
    {step === 1 && <><MotionView effect="pop" style={{ borderRadius: 24, paddingVertical: 24, paddingHorizontal: 20, gap: 12, overflow: 'hidden', backgroundColor: palette.lilac.base, experimental_backgroundImage: onboardingVisual.personalityGradient, boxShadow: onboardingVisual.personalityShadow }}><View style={{ position: 'absolute', width: 140, height: 140, borderRadius: 70, right: -30, top: -30, backgroundColor: colors.surface, opacity: .12 }} /><View style={{ position: 'absolute', width: 90, height: 90, borderRadius: 45, right: 30, bottom: -40, backgroundColor: colors.surface, opacity: .1 }} /><Text style={{ fontFamily: fonts.semibold, fontSize: 12, textTransform: 'uppercase', letterSpacing: .48, color: colors.surface, opacity: .9 }}>{COPY.personality.resultEyebrow}</Text><Text style={{ fontFamily: fonts.bold, fontSize: 30, color: colors.surface }}>{personality.name}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.surface }}>{personality.desc}</Text></MotionView><FinnSays head="excited">{personality.finn}</FinnSays>{personality.traits.map(trait => <View key={trait} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><IconTile path="M5 12l4 4L19 6" size={26} color="lilac" /><Text style={[layout.body, { flex: 1, color: colors.ink, fontSize: 15 }]}>{trait}</Text></View>)}</>}
    {step === 2 && <><FinnSays head="confident">{titles[2]}</FinnSays>{HANDS_ON.map(option => <OptionCard suggested={option.id === 'suggest'} key={option.id} label={option.label} sub={option.sub} selected={p.handsOn === option.id} onPress={() => update({ handsOn: option.id })}><IconTile path={option.icon} color="lilac" /></OptionCard>)}<View style={{ padding: 14, borderRadius: 16, backgroundColor: colors.warmTrack, boxShadow: shadow.well }}><Text style={{ fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, color: colors.ink }}>{HANDS_ON_NOTE}</Text></View></>}
    {step === 3 && <DoneScreen color="lilac" title={COPY.personality.doneTitle} chips={[personality.name, HANDS_ON.find(o => o.id === p.handsOn)!.label]} next={COPY.personality.doneNext} />}
  </DeckShell>;
}
