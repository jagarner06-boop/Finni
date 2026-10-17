import { BillRow } from '@/components/feedback/BillRow';
import { router } from 'expo-router';
import { formatCents, type Card } from '@finni/shared';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ApprovalCard } from '@/components/cards/ApprovalCard';
import { ChartCard } from '@/components/cards/ChartCard';
import { RichRow } from '@/components/cards/RichRow';
import { SpendingBars } from '@/components/cards/SpendingBars';
import { Surface } from '@/components/ui/Surface';
import { formatRelativeDay, formatShortDate, formatTime } from '@/lib/format';
import { colors, fonts, radius } from '@/theme/tokens';

/** Data cards in chat older than this get an "As of" line: they're snapshots, the tabs are live. */
const SNAPSHOT_AFTER_MS = 10 * 60_000;

/**
 * Rich cards under Finn's bubbles. `onRowPress` gets the tapped item's id (source transactions, later).
 * `asOf` is when the card was made (the chat message's time); older data cards say so, so a paid bill
 * still listed in an old answer doesn't read as current. Approval cards stay live and never get it.
 */
export function CardRenderer({ card, onRowPress, asOf }: { card: Card; onRowPress?: (id: string) => void; asOf?: string }) {
  const body = <CardBody card={card} onRowPress={onRowPress} />;
  if (!asOf || card.type === 'approval' || Date.now() - Date.parse(asOf) < SNAPSHOT_AFTER_MS) return body;
  // Local calendar day (the ISO string's own date is UTC, a day ahead in the evening).
  const at = new Date(asOf);
  const day = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`;
  const when = formatRelativeDay(day) === 'today' ? formatTime(asOf) : `${formatShortDate(day)}, ${formatTime(asOf)}`;
  return (
    <View style={styles.snapshot}>
      {body}
      <Text style={styles.asOf}>As of {when}</Text>
    </View>
  );
}

function CardBody({ card, onRowPress }: { card: Card; onRowPress?: (id: string) => void }) {
  const tap = (id: string) => (onRowPress ? () => onRowPress(id) : undefined);

  switch (card.type) {
    case 'account_list':
      return (
        <Shell empty={card.accounts.length === 0 && 'No accounts to show.'}>
          {card.accounts.map((a) => (
            <RichRow
              key={a.id}
              icon={a.type === 'Credit Card' ? 'credit-card' : 'briefcase'}
              title={a.nickname}
              meta={a.isGoal ? 'Savings goal' : a.type}
              amount={formatCents(a.balanceCents)}
              onPress={tap(a.id)}
            />
          ))}
        </Shell>
      );
    case 'transaction_list':
      return (
        <Shell header={card.title} empty={card.transactions.length === 0 && 'No transactions in this range.'}>
          {card.transactions.map((t) => (
            <RichRow
              key={t.id}
              icon="shopping-bag"
              title={t.merchantName}
              meta={[t.category, formatRelativeDay(t.date)].filter(Boolean).join(' · ')}
              amount={`−${formatCents(t.amountCents)}`}
              onPress={tap(t.id)}
            />
          ))}
        </Shell>
      );
    case 'spending_breakdown':
      return (
        <Shell header={`Last ${card.days} days · ${formatCents(card.totalCents)}`} empty={card.items.length === 0 && 'No spending in this range.'}>
          <SpendingBars items={card.items} onPress={onRowPress} />
        </Shell>
      );
    case 'bill_list':
      return (
        <Shell empty={card.bills.length === 0 && 'No bills due.'}>
          {card.bills.map((b) => (
            <BillRow key={b.id} bill={b} onPress={tap(b.id) ?? (() => router.push({ pathname: '/finn', params: { q: `Help me review ${b.nickname ?? b.payee}` } }))} />
          ))}
        </Shell>
      );
    case 'goal_progress':
      return (
        <Shell empty={card.goals.length === 0 && 'No goals yet.'}>
          {card.goals.map((g) => (
            <RichRow
              key={g.id}
              icon="target"
              title={g.name}
              meta={`${g.percent}% of ${formatCents(g.targetCents)}`}
              chip={<Progress percent={g.percent} />}
              amount={formatCents(g.currentCents)}
              onPress={tap(g.id)}
            />
          ))}
        </Shell>
      );
    case 'atm_list':
      return (
        <Shell header={card.note} empty={card.atms.length === 0 && 'No ATMs nearby.'}>
          {card.atms.map((a) => (
            <RichRow
              key={a.id}
              icon="map-pin"
              title={a.name}
              meta={a.address}
              amount={a.distanceMiles != null ? `${a.distanceMiles} mi` : undefined}
              onPress={tap(a.id)}
            />
          ))}
        </Shell>
      );
    case 'approval':
      return <ApprovalCard card={card} />;
    case 'chart':
      return <ChartCard card={card} />;
    default:
      // Newer API card types render nothing instead of breaking the chat.
      return null;
  }
}

function Shell({ header, empty, children }: { header?: string; empty?: string | false; children: ReactNode }) {
  return (
    <Surface style={styles.card}>
      {header ? <Text style={styles.header}>{header}</Text> : null}
      {empty ? <Text style={styles.empty}>{empty}</Text> : children}
    </Surface>
  );
}

function Progress({ percent }: { percent: number }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, percent))}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 14 },
  snapshot: { gap: 4 },
  asOf: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginLeft: 4 },
  header: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  empty: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  track: { height: 6, borderRadius: radius.pill, backgroundColor: colors.warmTrack, overflow: 'hidden', marginTop: 4 },
  fill: { height: 6, borderRadius: radius.pill, backgroundColor: colors.accent },
});
