import { Image, StyleSheet, View } from 'react-native';

import { FINN_POSE } from '@/components/finn/assets';

export type FinnPoseName = keyof typeof FINN_POSE;

const LABEL: Record<FinnPoseName, string> = {
  thumbsup: 'Finn gives a thumbs up',
  laptop: 'Finn is thinking',
  alert: 'Finn looks worried',
  laughCard: 'Finn is celebrating',
  wave: 'Finn waves',
};

export function FinnPose({ pose, size = 72 }: { pose: FinnPoseName; size?: number }) {
  return (
    // Multiply on the wrapper hides the placeholder art's light background.
    <View style={styles.blend}>
      <Image
        testID="finn-pose"
        accessibilityRole="image"
        accessibilityLabel={LABEL[pose]}
        source={FINN_POSE[pose]}
        style={{ width: size, height: size }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blend: { mixBlendMode: 'multiply' },
});
