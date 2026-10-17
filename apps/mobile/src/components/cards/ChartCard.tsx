import { formatCents, type Card } from '@finni/shared';
import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { Surface } from '@/components/ui/Surface';
import { colors, fonts, radius } from '@/theme/tokens';

type ChartCardData = Extract<Card, { type: 'chart' }>;

const PLOT_HEIGHT = 150;
const DONUT_SIZE = 132;
const DONUT_STROKE = 20;
// Charts use the spending fills, never semantic colors (design system rule).
const fill = (i: number) => colors.barFills[i % colors.barFills.length];
// Axis ticks only: short whole-dollar labels. Every amount a person reads as a value uses formatCents.
const tick = (cents: number) => formatCents(cents).replace(/\.00$/, '');

/** Finn's charts (make_chart / make_custom_chart): donut, grouped bars or a line, drawn with react-native-svg. */
export function ChartCard({ card }: { card: ChartCardData }) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  const empty = card.series.every((s) => s.valuesCents.every((v) => v === 0));

  return (
    <Surface style={styles.card}>
      <View>
        <Text style={styles.title}>{card.title}</Text>
        {card.subtitle ? <Text style={styles.subtitle}>{card.subtitle}</Text> : null}
      </View>
      <View onLayout={onLayout} accessible accessibilityLabel={describe(card)}>
        {empty ? (
          <Text style={styles.subtitle}>Nothing to chart yet.</Text>
        ) : width === 0 ? null : card.kind === 'donut' ? (
          <Donut card={card} />
        ) : card.kind === 'line' ? (
          <Line card={card} width={width} />
        ) : (
          <Bars card={card} width={width} />
        )}
      </View>
    </Surface>
  );
}

function Donut({ card }: { card: ChartCardData }) {
  const values = card.series[0].valuesCents;
  const total = card.totalCents ?? values.reduce((s, v) => s + v, 0);
  const c = DONUT_SIZE / 2;
  const r = (DONUT_SIZE - DONUT_STROKE) / 2;
  const slices = donutSlices(values, total);

  return (
    <View style={styles.donutRow}>
      <View>
        <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
          <Circle cx={c} cy={c} r={r} stroke={colors.warmTrack} strokeWidth={DONUT_STROKE} fill="none" />
          {slices.map((s) =>
            // A single 100% slice can't be one arc (start = end), so draw it as a ring.
            s.end - s.start >= 2 * Math.PI - 1e-6 ? (
              <Circle key={card.labels[s.index]} cx={c} cy={c} r={r} stroke={fill(s.index)} strokeWidth={DONUT_STROKE} fill="none" />
            ) : (
              <Path key={card.labels[s.index]} d={arcPath(c, r, s.start, s.end)} stroke={fill(s.index)} strokeWidth={DONUT_STROKE} fill="none" />
            ),
          )}
        </Svg>
        <View style={styles.donutCenter} pointerEvents="none">
          <Text style={styles.donutTotal}>{formatCents(total)}</Text>
          <Text style={styles.axis}>total</Text>
        </View>
      </View>
      <View style={styles.legend}>
        {card.labels.map((label, i) => (
          <View key={label} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: fill(i) }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {label}
            </Text>
            <Text style={styles.legendValue}>{total > 0 ? `${Math.round((values[i] / total) * 100)}%` : ''}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const SLICE_GAP = 0.025; // radians between slices

/** Start/end angles per non-empty slice, clockwise from 12 o'clock. */
function donutSlices(values: number[], total: number) {
  const slices: { index: number; start: number; end: number }[] = [];
  if (total <= 0) return slices;
  const nonEmpty = values.filter((v) => v > 0).length;
  let angle = -Math.PI / 2;
  values.forEach((v, index) => {
    if (v <= 0) return;
    const sweep = (v / total) * 2 * Math.PI;
    const gap = nonEmpty > 1 ? Math.min(SLICE_GAP, sweep / 3) : 0;
    slices.push({ index, start: angle + gap / 2, end: angle + sweep - gap / 2 });
    angle += sweep;
  });
  return slices;
}

/** SVG arc along the circle (c, c, r) from angle a0 to a1. Plain path data, so it draws the same on web and native. */
function arcPath(c: number, r: number, a0: number, a1: number): string {
  const p = (a: number) => `${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)}`;
  const largeArc = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${p(a0)} A ${r} ${r} 0 ${largeArc} 1 ${p(a1)}`;
}

function Bars({ card, width }: { card: ChartCardData; width: number }) {
  const n = card.labels.length;
  const groups = card.series.length;
  const max = Math.max(1, ...card.series.flatMap((s) => s.valuesCents));
  const slot = width / n;
  const gap = Math.max(2, slot * 0.25);
  const barW = Math.max(3, (slot - gap) / groups);
  // Thin out x labels so they never collide (~44pt per label).
  const every = Math.max(1, Math.ceil((n * 44) / width));

  return (
    <View style={styles.plot}>
      <Text style={styles.axis}>{tick(max)}</Text>
      <Svg width={width} height={PLOT_HEIGHT}>
        <Rect x={0} y={PLOT_HEIGHT - 1} width={width} height={1} fill={colors.hairline} />
        {card.series.map((s, si) =>
          s.valuesCents.map((v, i) => {
            const h = Math.max(v > 0 ? 3 : 0, (v / max) * (PLOT_HEIGHT - 4));
            return (
              <Rect
                key={`${si}-${i}`}
                x={i * slot + gap / 2 + si * barW}
                y={PLOT_HEIGHT - 1 - h}
                width={barW - (groups > 1 ? 1 : 0)}
                height={h}
                rx={Math.min(4, barW / 2)}
                fill={fill(si)}
              />
            );
          }),
        )}
      </Svg>
      <View style={styles.xLabels}>
        {card.labels.map((label, i) => (
          <Text key={`${label}-${i}`} style={[styles.axis, styles.xLabel, { width: slot }]} numberOfLines={1}>
            {i % every === 0 ? label.replace(/^Wk /, '') : ''}
          </Text>
        ))}
      </View>
      {groups > 1 ? <SeriesLegend names={card.series.map((s) => s.name)} /> : null}
    </View>
  );
}

function Line({ card, width }: { card: ChartCardData; width: number }) {
  const values = card.series[0].valuesCents;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const pad = 6;
  const x = (i: number) => (values.length === 1 ? width / 2 : (i / (values.length - 1)) * width);
  const y = (v: number) => pad + (1 - (v - min) / span) * (PLOT_HEIGHT - pad * 2);
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(values.length - 1).toFixed(1)},${PLOT_HEIGHT} L${x(0).toFixed(1)},${PLOT_HEIGHT} Z`;
  const last = values.length - 1;

  return (
    <View style={styles.plot}>
      <View style={styles.lineHeader}>
        <Text style={styles.axis}>{tick(values[0])}</Text>
        <Text style={styles.lineNow}>{formatCents(values[last])}</Text>
      </View>
      <Svg width={width} height={PLOT_HEIGHT}>
        <Defs>
          <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.accent} stopOpacity={0.18} />
            <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#area)" />
        <Path d={line} stroke={colors.accent} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={x(0)} cy={y(values[0])} r={3.5} fill={colors.surface} stroke={colors.accent} strokeWidth={2} />
        <Circle cx={x(last)} cy={y(values[last])} r={4.5} fill={colors.accent} />
      </Svg>
      <View style={styles.lineHeader}>
        <Text style={styles.axis}>{card.labels[0]}</Text>
        <Text style={styles.axis}>low {tick(min)} · high {tick(max)}</Text>
        <Text style={styles.axis}>{card.labels[last]}</Text>
      </View>
    </View>
  );
}

function SeriesLegend({ names }: { names: string[] }) {
  return (
    <View style={styles.seriesLegend}>
      {names.map((name, i) => (
        <View key={name} style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: fill(i) }]} />
          <Text style={styles.legendLabel}>{name}</Text>
        </View>
      ))}
    </View>
  );
}

/** Screen-reader summary: the chart as a short list of values. */
function describe(card: ChartCardData): string {
  const points = card.labels.map((l, i) => `${l} ${card.series.map((s) => formatCents(s.valuesCents[i] ?? 0)).join(' and ')}`);
  return `${card.title}. ${points.slice(0, 12).join(', ')}`;
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 14 },
  title: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  axis: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted, fontVariant: ['tabular-nums'] },
  plot: { gap: 6 },
  xLabels: { flexDirection: 'row' },
  xLabel: { textAlign: 'center' },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  donutCenter: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  donutTotal: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink, fontVariant: ['tabular-nums'] },
  legend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: radius.pill },
  legendLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  legendValue: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink, fontVariant: ['tabular-nums'] },
  lineHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  lineNow: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, fontVariant: ['tabular-nums'] },
  seriesLegend: { flexDirection: 'row', gap: 16 },
});
