import { formatCents, type Cents } from '@finni/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { splitMoney } from '@/lib/format';
import { colors, fonts, radius, shadow } from '@/theme/tokens';

// The only decorative gradient in the app: a top-right sheen over navy → cobalt.
const HERO = `radial-gradient(120% 90% at 90% -20%, rgba(255,255,255,0.24), transparent 55%), linear-gradient(135deg, ${colors.heroFrom}, ${colors.heroTo})`;

export function AccountHeroCard({
  name,
  mask,
  balanceCents,
  hidden = false,
  onPress,
}: {
  name: string;
  mask: string;
  balanceCents: Cents;
  hidden?: boolean;
  onPress?: () => void;
}) {
  const { whole, cents } = splitMoney(balanceCents);
  const label = `${name} ending ${mask}, balance ${hidden ? 'hidden' : formatCents(balanceCents)}`;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'summary'}
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.top}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.mask}>•••• {mask}</Text>
      </View>
      <Text style={styles.micro}>CURRENT BALANCE</Text>
      {hidden ? (
        <Text style={styles.whole}>••••••</Text>
      ) : (
        <Text style={styles.amount}>
          <Text style={styles.whole}>{whole}</Text>
          <Text style={styles.cents}>{cents}</Text>
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, padding: 20, gap: 6, experimental_backgroundImage: HERO, boxShadow: shadow.hero, marginBottom: 3 },
  pressed: { transform: [{ translateY: 2 }] },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  name: { fontFamily: fonts.bold, fontSize: 16, color: colors.surface },
  mask: { fontFamily: fonts.medium, fontSize: 14, color: colors.surface, opacity: 0.8, fontVariant: ['tabular-nums'] },
  micro: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.5, color: colors.surface, opacity: 0.75 },
  amount: { color: colors.surface },
  whole: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 36, color: colors.surface, fontVariant: ['tabular-nums'] },
  cents: { fontFamily: fonts.regular, fontSize: 22, color: colors.surface, fontVariant: ['tabular-nums'] },
});
