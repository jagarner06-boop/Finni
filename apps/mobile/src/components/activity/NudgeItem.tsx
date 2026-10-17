import type { Nudge } from '@finni/shared';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type AccessibilityActionEvent } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { FinnAvatar } from '@/components/finn/FinnAvatar';
import { FinnTicks } from '@/components/finn/FinnTicks';
import { Button } from '@/components/ui/Button';
import { formatRelativeDay, formatTime } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { colors, fonts, radius, shadow } from '@/theme/tokens';

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

/** One nudge from Finn. Swipe left past 40% to dismiss; tap to mark read. */
export function NudgeItem({
  nudge,
  onDismiss,
  onAct,
  onRead,
  acting = false,
}: {
  nudge: Nudge;
  onDismiss: () => void;
  onAct: () => void;
  onRead: () => void;
  acting?: boolean;
}) {
  const swipe = useRef<SwipeableMethods>(null);
  const [width, setWidth] = useState(0);
  const unread = !nudge.readAt;
  const resolved = !!nudge.resolvedAt;
  const action = resolved ? null : nudge.action;
  const time = isToday(nudge.createdAt) ? formatTime(nudge.createdAt) : formatRelativeDay(nudge.createdAt);

  const actions = [{ name: 'dismiss', label: 'Dismiss' }, ...(action ? [{ name: 'act', label: action.label }] : [])];
  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'dismiss') onDismiss();
    if (e.nativeEvent.actionName === 'act') onAct();
  };

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <ReanimatedSwipeable
        ref={swipe}
        friction={1.5}
        rightThreshold={width > 0 ? width * 0.4 : 120}
        overshootRight={false}
        renderRightActions={() => (
          <View style={styles.dismiss}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </View>
        )}
        onSwipeableWillOpen={() => haptics.light()}
        onSwipeableOpen={onDismiss}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${unread ? 'Unread. ' : ''}${nudge.title}. ${nudge.body}`}
          accessibilityActions={actions}
          onAccessibilityAction={onAccessibilityAction}
          onPress={() => unread && onRead()}
          style={styles.item}>
          <FinnAvatar mood={nudge.mood} head={nudge.face ?? undefined} size={40} />
          <View style={styles.text}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, !unread && styles.readTitle]}>{nudge.title}</Text>
              {unread && <FinnTicks size={18} />}
              <Text style={styles.time}>{time}</Text>
            </View>
            <Text style={styles.body}>{nudge.body}</Text>
            {resolved && <Text style={styles.done}>Done</Text>}
            {action && (
              <View style={styles.action}>
                <Button label={action.label} size="sm" loading={acting} onPress={onAct} />
              </View>
            )}
          </View>
        </Pressable>
      </ReanimatedSwipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    boxShadow: shadow.card,
  },
  text: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  readTitle: { color: colors.muted },
  time: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.muted },
  done: { fontFamily: fonts.semibold, fontSize: 13, color: colors.successInk },
  action: { alignSelf: 'flex-start', marginTop: 6 },
  dismiss: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 20,
    borderRadius: radius.card,
    backgroundColor: colors.dangerTint,
  },
  dismissText: { fontFamily: fonts.bold, fontSize: 14, color: colors.dangerInk },
});
