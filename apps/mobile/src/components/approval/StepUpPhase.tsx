import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { FinnAvatar } from '@/components/finn/FinnAvatar';
import { Button } from '@/components/ui/Button';
import { colors, fonts } from '@/theme/tokens';

/** Face ID check before a large move (both auth modes, for now). */
export function StepUpPhase({ onContinue, onCancel, busy = false }: { onContinue: () => void; onCancel: () => void; busy?: boolean }) {
  return (
    <View style={styles.phase}>
      <View>
        <FinnAvatar mood="happy" size={88} animated />
        <View style={styles.badge}>
          <Feather name="shield" size={16} color={colors.surface} />
        </View>
      </View>
      <Text style={styles.title}>Quick check it&apos;s you.</Text>
      <Text style={styles.body}>Moves over $100 need Face ID. After that, Finn sends the request to Capital One.</Text>
      <View style={styles.buttons}>
        <Button label="Continue with Face ID" onPress={onContinue} loading={busy} />
        <Button label="Cancel" variant="ghost" onPress={onCancel} disabled={busy} />
      </View>
      <View style={styles.foot}>
        <Feather name="lock" size={12} color={colors.muted} />
        <Text style={styles.footText}>Secured on this device</Text>
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
