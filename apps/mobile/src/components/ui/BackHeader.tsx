import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, hitTarget } from '@/theme/tokens';

/** Back chevron row for pushed screens, with an optional trailing element. */
export function BackHeader({ onBack, right }: { onBack: () => void; right?: ReactNode }) {
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} hitSlop={8} style={styles.back}>
        <Feather name="chevron-left" size={26} color={colors.ink} />
      </Pressable>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: hitTarget },
  back: { width: hitTarget, height: hitTarget, justifyContent: 'center', marginLeft: -10 },
});
