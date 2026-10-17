import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { FinnAvatar } from '@/components/finn/FinnAvatar';
import { Button } from '@/components/ui/Button';
import { config } from '@/config';
import { colors, fonts } from '@/theme/tokens';

/** Second sign-in before a large move. Demo mode confirms on this device; Auth0 mode signs in again. */
export function StepUpPhase({ onContinue, onCancel, busy = false }: { onContinue: () => void; onCancel: () => void; busy?: boolean }) {
  const demo = config.authMode === 'demo';

  return (
    <View style={styles.phase}>
      <View>
        <FinnAvatar mood="happy" size={88} animated />
        <View style={styles.badge}>
          <Feather name="shield" size={16} color={colors.surface} />
        </View>
      </View>
      <Text style={styles.title}>Quick check it&apos;s you.</Text>
      <Text style={styles.body}>Moves over $100 need a second sign-in. After that, Finn sends the request to Capital One.</Text>
      <View style={styles.buttons}>
        <Button label={demo ? 'Continue with Face ID' : 'Sign in again'} onPress={onContinue} loading={busy} />
        <Button label="Cancel" variant="ghost" onPress={onCancel} disabled={busy} />
      </View>
      <View style={styles.foot}>
        <Feather name="lock" size={12} color={colors.muted} />
        <Text style={styles.footText}>{demo ? 'Secured on this device' : 'Secured by Auth0'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  phase: { gap: 16, alignItems: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 24, color: colors.ink, textAlign: 'center' },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.muted, textAlign: 'center' },
  buttons: { alignSelf: 'stretch', gap: 8 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footText: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
