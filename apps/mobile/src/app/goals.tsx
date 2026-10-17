import { formatCents } from '@finni/shared';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { useGoals } from '@/api/queries';
import { GoalCard } from '@/components/goals/GoalCard';
import { SafeAreaView } from '@/components/ui/SafeAreaView';
import { Surface } from '@/components/ui/Surface';
import { formatShortDate } from '@/lib/format';
import { colors, fonts } from '@/theme/tokens';

// Goals. Expressive element: the tide fill. Becomes a pushed route from Home with the tab restructure.
export default function GoalsScreen() {
  const { data, isLoading } = useGoals();
  const goals = data?.goals.filter((g) => g.status !== 'archived') ?? [];
  const saved = goals.reduce((sum, g) => sum + g.currentCents, 0);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
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
          <GoalCard key={g.id} goal={g} eta={g.targetDate ? `Target ${formatShortDate(g.targetDate)}` : undefined} />
        ))}
        {!isLoading && goals.length === 0 && <Text style={styles.empty}>No goals yet. Ask Finn to start one.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 14 },
  title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, color: colors.ink, paddingTop: 8 },
  summary: { gap: 4 },
  summaryLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  summaryAmount: { fontFamily: fonts.bold, fontSize: 28, color: colors.ink, fontVariant: ['tabular-nums'] },
  empty: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 24 },
});
