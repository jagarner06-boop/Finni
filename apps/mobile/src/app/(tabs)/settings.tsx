import { StyleSheet, Text } from 'react-native';

import { SafeAreaView } from '@/components/ui/SafeAreaView';
import { colors, fonts } from '@/theme/tokens';

// Settings. Placeholder until the full screen lands.
export default function SettingsScreen() {
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <Text style={styles.title} accessibilityRole="header">
        Settings
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: 20 },
  title: { fontFamily: fonts.bold, fontSize: 32, color: colors.ink, marginTop: 16 },
});
