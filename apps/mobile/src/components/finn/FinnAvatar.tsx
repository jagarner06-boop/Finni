import type { Mood } from '@finni/shared';
import { StyleSheet, Text, View } from 'react-native';

import { moodColor } from '@/theme/tokens';

// Placeholder until the Gemini-generated Finn art lands (Design plan fallback: emoji on a mood-colored circle).
const FACE: Record<Mood, string> = { happy: '🐟', thinking: '🐟', worried: '🐡', celebrating: '🐠' };

export function FinnAvatar({ mood = 'happy', size = 40 }: { mood?: Mood; size?: number }) {
  return (
    <View
      accessibilityLabel={`Finn looks ${mood}`}
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: moodColor[mood] }]}>
      <Text style={{ fontSize: size * 0.55 }}>{FACE[mood]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
});
