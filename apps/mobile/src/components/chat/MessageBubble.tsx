import type { ChatMessage } from '@finni/shared';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { Easing, Keyframe, FadeIn, useReducedMotion } from 'react-native-reanimated';

import { CardRenderer } from '@/components/cards/CardRenderer';
import type { BubblePosition } from '@/components/chat/grouping';
import { FinnAvatar } from '@/components/finn/FinnAvatar';
import { FinnTyping } from '@/components/finn/FinnTyping';
import { colors, fonts, motion, radius, shadow } from '@/theme/tokens';

const AVATAR = 32;
const GROUPED_GAP = 4;
const GROUP_GAP = 12;

// User bubble lifts from the composer: fade in, rise 8pt.
const userIn = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 8 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }], easing: Easing.out(Easing.cubic) },
}).duration(motion.standard);

// Finn's reply pops: rise and grow, overshoot slightly, settle.
const finnIn = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 8 }, { scale: 0.94 }] },
  60: { opacity: 1, transform: [{ translateY: -2 }, { scale: 1.01 }], easing: Easing.out(Easing.cubic) },
  100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
}).duration(320);

const grouped = (p: BubblePosition) => p === 'middle' || p === 'last';

export function MessageBubble({
  message,
  position = 'solo',
  onRetry,
}: {
  message: ChatMessage;
  position?: BubblePosition;
  /** Set on a user message that didn't send; shows "Not sent · Retry". */
  onRetry?: () => void;
}) {
  const reduced = useReducedMotion();
  const spacing = { marginTop: grouped(position) ? GROUPED_GAP : GROUP_GAP };

  if (message.role === 'user') {
    return (
      <Animated.View entering={reduced ? FadeIn.duration(150) : userIn} style={[styles.userColumn, spacing]}>
        <View style={[styles.bubble, styles.user, userCorners(position)]}>
          <Text style={styles.text}>{message.text}</Text>
        </View>
        {onRetry && (
          <Pressable accessibilityRole="button" hitSlop={10} onPress={onRetry}>
            <Text style={styles.failed}>Not sent · Retry</Text>
          </Pressable>
        )}
      </Animated.View>
    );
  }

  const showAvatar = !grouped(position);
  return (
    <Animated.View entering={reduced ? FadeIn.duration(150) : finnIn} style={[styles.finnRow, spacing]}>
      <View style={styles.avatarSlot}>{showAvatar && <FinnAvatar mood={message.mood ?? 'happy'} size={AVATAR} />}</View>
      <View style={styles.finnColumn}>
        <View style={[styles.bubble, styles.finn, finnCorners(position)]}>
          <Text style={styles.text}>{message.text}</Text>
        </View>
        {message.cards.map((card, i) => (
          <CardRenderer key={i} card={card} />
        ))}
      </View>
    </Animated.View>
  );
}

export function TypingBubble() {
  return (
    <View style={[styles.finnRow, { marginTop: GROUP_GAP }]}>
      <View style={styles.avatarSlot}>
        <FinnAvatar mood="thinking" size={AVATAR} />
      </View>
      <View style={[styles.bubble, styles.finn, finnCorners('solo')]}>
        <FinnTyping />
      </View>
    </View>
  );
}

// The 6pt corner points at the speaker; grouped bubbles tuck in on the speaker's side.
function finnCorners(p: BubblePosition): ViewStyle {
  return grouped(p) ? { borderTopLeftRadius: radius.bubbleTail, borderBottomLeftRadius: radius.bubbleTail } : { borderBottomLeftRadius: radius.bubbleTail };
}

function userCorners(p: BubblePosition): ViewStyle {
  return grouped(p) ? { borderTopRightRadius: radius.bubbleTail, borderBottomRightRadius: radius.bubbleTail } : { borderBottomRightRadius: radius.bubbleTail };
}

const styles = StyleSheet.create({
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.bubble },
  userColumn: { alignSelf: 'flex-end', alignItems: 'flex-end', gap: 4, maxWidth: '78%' },
  user: { backgroundColor: colors.accentTint },
  failed: { fontFamily: fonts.semibold, fontSize: 12, color: colors.dangerInk },
  finn: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline, boxShadow: shadow.card },
  text: { color: colors.ink, fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  finnRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, maxWidth: '92%' },
  avatarSlot: { width: AVATAR },
  finnColumn: { flexShrink: 1, gap: 8 },
});
