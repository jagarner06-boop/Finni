import { formatCents } from '@finni/shared';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { useGoals } from '@/api/queries';
import { GoalCard } from '@/components/goals/GoalCard';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { SafeAreaView } from '@/components/ui/SafeAreaView';
import { Surface } from '@/components/ui/Surface';
import { colors, fonts } from '@/theme/tokens';

// Goals, pushed from Home. Expressive element: the tide fill.
export default function GoalsScreen() {
  const { data, isLoading } = useGoals();
  const goals = data?.goals.filter((g) => g.status !== 'archived') ?? [];
  const saved = goals.reduce((sum, g) => sum + g.currentCents, 0);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackHeader
          onBack={() => router.back()}
          right={<Button label="+ New goal" size="sm" variant="secondary" onPress={() => router.push('/goal/new')} />}
        />
        <Text style={styles.title} accessibilityRole="header">
          Goals
        </Text>
        <Surface style={styles.summary}>
          <Text style={styles.summaryLabel}>
            Saved across {goals.length} {goals.length === 1 ? 'goal' : 'goals'}
          </Text>
          <Text style={styles.summaryAmount}>{formatCents(saved)}</Text>
        </Surface>
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} onPress={() => router.push(`/goal/${g.id}`)} />
        ))}
        {!isLoading && goals.length === 0 && <Text style={styles.empty}>No goals yet. Start one with New goal.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 14 },
  title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, color: colors.ink },
  summary: { gap: 4 },
  summaryLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  summaryAmount: { fontFamily: fonts.bold, fontSize: 28, color: colors.ink, fontVariant: ['tabular-nums'] },
  empty: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 24 },
});
