import { formatCents } from '@finni/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAccounts, useCreateAction, useGoals } from '@/api/queries';
import { FinnAvatar } from '@/components/finn/FinnAvatar';
import { CADENCES } from '@/components/goals/goalFlow';
import { etaCopy } from '@/components/goals/GoalCard';
import { TideWell } from '@/components/goals/TideWell';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { SafeAreaView } from '@/components/ui/SafeAreaView';
import { formatShortDate } from '@/lib/format';
import { colors, fonts, radius } from '@/theme/tokens';

const PRESETS = [2_500, 5_000, 10_000];

// One goal: its tide, its plan, and Add money (which goes through the approval sheet).
export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const goals = useGoals();
  const accounts = useAccounts();
  const add = useCreateAction();
  const [amountCents, setAmountCents] = useState(0);
  const [other, setOther] = useState(false);

  const goal = goals.data?.goals.find((g) => g.id === id);
  const checking = accounts.data?.accounts.find((a) => a.type === 'Checking');

  if (!goal) {
    return (
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.content}>
          <BackHeader onBack={() => router.back()} />
          {goals.isLoading ? null : <Text style={styles.muted}>This goal isn&apos;t here anymore.</Text>}
        </View>
      </SafeAreaView>
    );
  }

  const complete = goal.status === 'completed' || goal.percent >= 100;
  const plan =
    goal.cadence && goal.contributionCents
      ? `${formatCents(goal.contributionCents)} ${CADENCES[goal.cadence].label.toLowerCase()}${
          goal.nextContributionOn ? ` · next ${formatShortDate(goal.nextContributionOn)}` : ''
        }`
      : null;
  const eta = etaCopy(goal);

  const addMoney = () => {
    if (!checking || amountCents <= 0) return;
    add.mutate(
      { type: 'transfer', fromAccountId: checking.id, toAccountId: goal.nessieAccountId, amountCents, reason: 'Added from Goals' },
      { onSuccess: (res) => router.push(`/approve/${res.action.id}`) },
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BackHeader onBack={() => router.back()} />
        <Text style={styles.title} accessibilityRole="header">
          {goal.name}
        </Text>

        <View style={styles.hero}>
          <TideWell percent={goal.percent} scale={2} />
          <Text style={styles.amount}>
            {formatCents(goal.currentCents)} of {formatCents(goal.targetCents)}
          </Text>
          {plan && <Text style={styles.muted}>{plan}</Text>}
          {eta && !complete && <Text style={[styles.muted, goal.behind && styles.behind]}>{eta}</Text>}
        </View>

        {complete ? (
          <View style={styles.done}>
            <FinnAvatar mood="celebrating" head="love" size={64} animated />
            <Text style={styles.doneText}>Done. Nice work.</Text>
          </View>
        ) : (
          <>
            <Text style={styles.section}>Add to this goal</Text>
            <View style={styles.presets}>
              {PRESETS.map((c) => {
                const selected = !other && amountCents === c;
                return (
                  <Pressable
                    key={c}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setOther(false);
                      setAmountCents(c);
                    }}
                    style={[styles.preset, selected && styles.selected]}>
                    <Text style={styles.presetText}>{formatCents(c).replace(/\.00$/, '')}</Text>
                  </Pressable>
                );
              })}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: other }}
                onPress={() => {
                  setOther(true);
                  setAmountCents(0);
                }}
                style={[styles.preset, other && styles.selected]}>
                <Text style={styles.presetText}>Other</Text>
              </Pressable>
            </View>
            {other && (
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                placeholder="Amount in dollars"
                placeholderTextColor={colors.placeholder}
                accessibilityLabel="Amount in dollars"
                autoFocus
                onChangeText={(t) => setAmountCents(Math.min(1_000_000, Number(t.replace(/\D/g, '')) || 0) * 100)}
              />
            )}
          </>
        )}
      </ScrollView>
      {!complete && (
        <View style={styles.footer}>
          <Button label="Add money" onPress={addMoney} loading={add.isPending} disabled={amountCents <= 0 || !checking} />
          {add.isError && <Text style={styles.error}>Couldn&apos;t set that up. Try again.</Text>}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingBottom: 24, gap: 14 },
  title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, color: colors.ink },
  hero: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  amount: { fontFamily: fonts.bold, fontSize: 20, color: colors.ink, fontVariant: ['tabular-nums'] },
  muted: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'center', fontVariant: ['tabular-nums'] },
  behind: { color: colors.warningInk },
  section: { fontFamily: fonts.bold, fontSize: 20, color: colors.ink, marginTop: 8 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  selected: { borderColor: colors.accent, backgroundColor: colors.accentTint },
  presetText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, fontVariant: ['tabular-nums'] },
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
  done: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  doneText: { fontFamily: fonts.bold, fontSize: 18, color: colors.successInk },
  footer: { paddingHorizontal: 20, paddingTop: 8, gap: 8 },
  error: { fontFamily: fonts.semibold, fontSize: 12, color: colors.dangerInk, textAlign: 'center' },
});
