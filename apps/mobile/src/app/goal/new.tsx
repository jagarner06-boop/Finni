import { Feather } from '@expo/vector-icons';
import { formatCents, type GoalCadence, type GoalIcon } from '@finni/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAccounts, useCreateGoal } from '@/api/queries';
import { FinnAvatar } from '@/components/finn/FinnAvatar';
import { FinnTicks } from '@/components/finn/FinnTicks';
import { CADENCE_ORDER, CADENCES, etaLabel, FINN_LINES, GOAL_ICONS } from '@/components/goals/goalFlow';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { SafeAreaView } from '@/components/ui/SafeAreaView';
import { colors, fonts, radius, shadow } from '@/theme/tokens';

const PRESETS = [50_000, 100_000, 240_000, 500_000];
const REVIEW = 3;

// New goal: Finn asks three questions, then shows the plan. Creating it goes through the approval sheet.
export default function NewGoalScreen() {
  const accounts = useAccounts();
  const create = useCreateGoal();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<GoalIcon | null>(null);
  const [targetCents, setTargetCents] = useState(0);
  const [cadence, setCadence] = useState<GoalCadence>('weekly');

  const checking = accounts.data?.accounts.find((a) => a.type === 'Checking');
  const per = CADENCES[cadence].defaultCents;
  const today = new Date();
  const canNext = step === 0 ? name.trim().length > 0 : step === 1 ? targetCents > 0 : true;

  const back = () => (step === 0 ? router.back() : setStep(step - 1));
  const submit = () =>
    create.mutate(
      {
        name: name.trim(),
        ...(icon ? { icon } : {}),
        targetCents,
        cadence,
        contributionCents: per,
        ...(checking ? { fromAccountId: checking.id } : {}),
      },
      { onSuccess: (res) => router.replace(`/approve/${res.action.id}`) },
    );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <View style={styles.top}>
        <BackHeader onBack={back} />
        <View style={styles.dots} accessibilityLabel={`Step ${Math.min(step + 1, REVIEW)} of ${REVIEW}`}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive, (i < step || step === REVIEW) && styles.dotDone]} />
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.finnRow}>
          <View>
            <FinnAvatar mood={step === REVIEW ? 'celebrating' : 'thinking'} size={64} />
            {step === REVIEW && (
              <View style={styles.ticks}>
                <FinnTicks count={3} animated size={22} />
              </View>
            )}
          </View>
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{FINN_LINES[step]}</Text>
          </View>
        </View>

        {step === 0 && (
          <>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Hawaii trip"
              placeholderTextColor={colors.placeholder}
              accessibilityLabel="Goal name"
              autoFocus
              maxLength={40}
            />
            <View style={styles.icons}>
              {GOAL_ICONS.map((i) => {
                const selected = icon === i.key;
                return (
                  <Pressable
                    key={i.key}
                    accessibilityRole="button"
                    accessibilityLabel={i.label}
                    accessibilityState={{ selected }}
                    onPress={() => setIcon(i.key)}
                    style={[styles.icon, selected && styles.selected]}>
                    <Feather name={i.feather} size={22} color={selected ? colors.accentPressed : colors.ink} />
                    <Text style={styles.iconLabel}>{i.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.amount} accessibilityLiveRegion="polite">
              {formatCents(targetCents)}
            </Text>
            <View style={styles.presets}>
              {PRESETS.map((c) => (
                <Pressable
                  key={c}
                  accessibilityRole="button"
                  accessibilityState={{ selected: targetCents === c }}
                  onPress={() => setTargetCents(c)}
                  style={[styles.preset, targetCents === c && styles.selected]}>
                  <Text style={styles.presetText}>{formatCents(c).replace(/\.00$/, '')}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="Other amount, in dollars"
              placeholderTextColor={colors.placeholder}
              accessibilityLabel="Other amount"
              onChangeText={(t) => setTargetCents(Math.min(1_000_000, Number(t.replace(/\D/g, '')) || 0) * 100)}
            />
          </>
        )}

        {step === 2 &&
          CADENCE_ORDER.map((c) => {
            const { label, defaultCents } = CADENCES[c];
            const eta = etaLabel(targetCents, c, defaultCents, today);
            const selected = cadence === c;
            return (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityLabel={`${label}, ${formatCents(defaultCents)}, done by ${eta}`}
                accessibilityState={{ selected }}
                onPress={() => setCadence(c)}
                style={[styles.option, selected && styles.selected]}>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>{label}</Text>
                  <Text style={styles.optionMeta}>{eta}</Text>
                </View>
                <Text style={styles.optionAmount}>{formatCents(defaultCents)}</Text>
              </Pressable>
            );
          })}

        {step === REVIEW && (
          <View style={styles.table}>
            <Row label="Goal" value={name.trim()} />
            <Row label="Target" value={formatCents(targetCents)} />
            <Row label="Plan" value={`${formatCents(per)} ${CADENCES[cadence].label.toLowerCase()}`} />
            <Row label="From" value={checking?.nickname ?? 'Checking'} />
            <Row label="Done by" value={etaLabel(targetCents, cadence, per, today)} last />
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step === REVIEW ? (
          <Button label="Create goal" onPress={submit} loading={create.isPending} />
        ) : (
          <Button label="Next" onPress={() => setStep(step + 1)} disabled={!canNext} />
        )}
        {create.isError && <Text style={styles.error}>Couldn&apos;t create the goal. Try again.</Text>}
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowLine]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  top: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.disabledBg },
  dotActive: { width: 20, backgroundColor: colors.accent },
  dotDone: { backgroundColor: colors.accent },
  content: { paddingHorizontal: 20, paddingBottom: 24, gap: 16 },
  finnRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 },
  ticks: { position: 'absolute', top: -12, right: -14 },
  bubble: {
    flex: 1,
    padding: 14,
    borderRadius: radius.bubble,
    borderBottomLeftRadius: radius.bubbleTail,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    boxShadow: shadow.card,
  },
  bubbleText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.ink },
  input: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    fontFamily: fonts.regular,
    fontSize: 17,
    color: colors.ink,
  },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  icon: {
    width: '31%',
    flexGrow: 1,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  iconLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  selected: { borderColor: colors.accent, backgroundColor: colors.accentTint },
  amount: { fontFamily: fonts.bold, fontSize: 48, lineHeight: 56, color: colors.ink, textAlign: 'center', fontVariant: ['tabular-nums'] },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  preset: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  presetText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, fontVariant: ['tabular-nums'] },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  optionText: { flex: 1, gap: 2 },
  optionTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  optionMeta: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  optionAmount: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, fontVariant: ['tabular-nums'] },
  table: { borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surface, paddingHorizontal: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, gap: 12 },
  rowLine: { borderBottomWidth: 1, borderColor: colors.hairline },
  rowLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  rowValue: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, fontVariant: ['tabular-nums'], textAlign: 'right' },
  footer: { paddingHorizontal: 20, paddingTop: 8, gap: 8 },
  error: { fontFamily: fonts.semibold, fontSize: 12, color: colors.dangerInk, textAlign: 'center' },
});
