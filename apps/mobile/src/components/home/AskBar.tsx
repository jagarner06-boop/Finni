import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FinnAvatar } from '@/components/finn/FinnAvatar';
import { colors, fonts, radius, shadow } from '@/theme/tokens';

const GRADIENT = `linear-gradient(180deg, ${colors.accentGradient[0]}, ${colors.accentGradient[2]})`;

/** Home's entry into chat: looks like a composer, opens the Finn tab with the keyboard up. */
export function AskBar({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ask your agent"
        onPress={onPress}
        style={({ pressed }) => [styles.bar, pressed && styles.pressed]}>
        <FinnAvatar mood="happy" size={32} />
        <Text style={styles.placeholder}>Ask your agent…</Text>
        <View style={styles.send}>
          <Feather name="arrow-up" size={18} color={colors.surface} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.canvas },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingLeft: 8,
    paddingRight: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.85 },
  placeholder: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.placeholder },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    experimental_backgroundImage: GRADIENT,
    boxShadow: shadow.primary,
  },
});
