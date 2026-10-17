import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAccounts, useMe } from '@/api/queries';
import { AccountHeroCard } from '@/components/home/AccountHeroCard';
import { AttentionRow } from '@/components/home/AttentionRow';
import { HOME_DEMO } from '@/components/home/demo';
import { FinnNudgeCard } from '@/components/home/FinnNudgeCard';
import { UtilizationCard } from '@/components/home/UtilizationCard';
import { SafeAreaView } from '@/components/ui/SafeAreaView';
import { timeOfDay } from '@/lib/format';
import { colors, fonts } from '@/theme/tokens';

// Home. Expressive element: Finn in the nudge card.
export default function MoneyScreen() {
  const me = useMe();
  const accounts = useAccounts();
  const name = me.data?.firstName ?? HOME_DEMO.name;

  // The hero is the credit card; fall back to the mockup card until a real one exists.
  const card = accounts.data?.accounts.find((a) => a.type === 'Credit Card');
  const hero = card ? { name: card.nickname, mask: card.id.slice(-4), balanceCents: card.balanceCents } : HOME_DEMO.hero;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting} accessibilityRole="header">
            Good <Text style={styles.bold}>{timeOfDay(new Date().getHours())},</Text> <Text style={styles.bold}>{name}</Text>
          </Text>
          <View style={styles.profile} accessibilityLabel="Profile">
            <Text style={styles.initial}>{name.slice(0, 1)}</Text>
          </View>
        </View>

        <AccountHeroCard {...hero} />
        <UtilizationCard {...HOME_DEMO.utilization} />
        <FinnNudgeCard {...HOME_DEMO.nudge} onPress={() => router.push('/finn')} />

        <View style={styles.sectionHeader}>
          <Text style={styles.section} accessibilityRole="header">
            Needs attention
          </Text>
          <Pressable accessibilityRole="button" hitSlop={12}>
            <Text style={styles.link}>See all ›</Text>
          </Pressable>
        </View>
        {HOME_DEMO.attention.map((a) => (
          <AttentionRow key={a.id} title={a.title} meta={a.meta} status={a.status} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  greeting: { flex: 1, fontFamily: fonts.regular, fontSize: 28, lineHeight: 34, color: colors.ink },
  bold: { fontFamily: fonts.bold },
  profile: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.bold, fontSize: 17, color: colors.accentPressed },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 },
  section: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 24, color: colors.ink },
  link: { fontFamily: fonts.semibold, fontSize: 14, color: colors.accent },
});
