import { formatCents, type Cents } from '@finni/shared';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Surface } from '@/components/ui/Surface';
import { colors, fonts, utilizationColor } from '@/theme/tokens';

export type UtilizationLevel = 'low' | 'medium' | 'high';

export const utilizationLevel = (pct: number): UtilizationLevel => (pct <= 30 ? 'low' : pct <= 60 ? 'medium' : 'high');

const SIZE = 92;
const STROKE = 9;

export function UtilizationCard({
  percent,
  closesInDays,
  limitCents,
  closeDate,
}: {
  percent: number;
  closesInDays: number;
  limitCents: Cents;
  /** Short statement close date, e.g. "Oct 22". */
  closeDate?: string;
}) {
  const r = (SIZE - STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <Surface style={styles.card}>
      <View accessible accessibilityRole="image" accessibilityLabel={`Utilization ${percent} percent, ${utilizationLevel(percent)}`} style={styles.ring}>
        <Svg width={SIZE} height={SIZE} style={styles.svg}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={r} stroke={colors.warmTrack} strokeWidth={STROKE} fill="none" />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={r}
            stroke={utilizationColor(percent)}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - clamped / 100)}
          />
        </Svg>
        <Text style={styles.pct}>{percent}%</Text>
        <Text style={styles.ringLabel}>Utilization</Text>
      </View>
      <View style={styles.facts}>
        <View>
          <Text style={styles.factLabel}>Statement closes in</Text>
          <Text style={styles.factValue}>{closesInDays === 1 ? '1 day' : `${closesInDays} days`}</Text>
          {closeDate && <Text style={styles.factLabel}>{closeDate}</Text>}
        </View>
        <View>
          <Text style={styles.factLabel}>Limit</Text>
          <Text style={styles.factValue}>{formatCents(limitCents)}</Text>
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  ring: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  // Start the arc at 12 o'clock.
  svg: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
  pct: { fontFamily: fonts.bold, fontSize: 20, color: colors.ink, fontVariant: ['tabular-nums'] },
  ringLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  facts: { flex: 1, gap: 12 },
  factLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  factValue: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink, fontVariant: ['tabular-nums'] },
});
