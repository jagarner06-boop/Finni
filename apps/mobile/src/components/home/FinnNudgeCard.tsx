import type { Mood } from '@finni/shared';
import { StyleSheet, Text, View } from 'react-native';

import { FINN_POSE_FOR_MOOD } from '@/components/finn/assets';
import { FinnPose } from '@/components/finn/FinnPose';
import { Button } from '@/components/ui/Button';
import { colors, fonts, radius, shadow } from '@/theme/tokens';

const TINT = `linear-gradient(180deg, ${colors.chipGradient[0]}, ${colors.chipGradient[1]})`;

/** Home's expressive element: Finn's pose, one sentence with its key number set apart, one action. */
export function FinnNudgeCard({
  text,
  highlight,
  cta,
  onPress,
  mood = 'celebrating',
}: {
  text: string;
  highlight?: string;
  cta: string;
  onPress: () => void;
  mood?: Mood;
}) {
  const at = highlight ? text.indexOf(highlight) : -1;
  const sentence =
    at < 0 ? (
      text
    ) : (
      <>
        {text.slice(0, at)}
        <Text style={styles.highlight}>{highlight}</Text>
        {text.slice(at + highlight!.length)}
      </>
    );

  return (
    <View style={styles.card}>
      <FinnPose pose={FINN_POSE_FOR_MOOD[mood]} size={72} />
      <View style={styles.body}>
        <Text style={styles.text}>{sentence}</Text>
        <View style={styles.cta}>
          <Button label={cta} size="sm" onPress={onPress} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.card,
    experimental_backgroundImage: TINT,
    boxShadow: shadow.chip,
  },
  body: { flex: 1, gap: 10 },
  text: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.ink },
  highlight: { fontFamily: fonts.bold, color: colors.accentPressed, fontVariant: ['tabular-nums'] },
  cta: { alignSelf: 'flex-start' },
});
