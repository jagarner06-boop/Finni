import type { ChatMessage } from '@finni/shared';
import { StyleSheet, Text, View } from 'react-native';

import { CardRenderer } from '@/components/cards/CardRenderer';
import { FinnAvatar } from '@/components/finn/FinnAvatar';
import { colors, radius, shadow } from '@/theme/tokens';

export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <View style={[styles.bubble, styles.user]}>
        <Text style={styles.userText}>{message.text}</Text>
      </View>
    );
  }
  return (
    <View style={styles.finnRow}>
      <FinnAvatar mood={message.mood ?? 'happy'} size={32} />
      <View style={styles.finnColumn}>
        <View style={[styles.bubble, styles.finn]}>
          <Text style={styles.finnText}>{message.text}</Text>
        </View>
        {message.cards.map((card, i) => (
          <CardRenderer key={i} card={card} />
        ))}
      </View>
    </View>
  );
}

export function TypingBubble() {
  return (
    <View style={styles.finnRow}>
      <FinnAvatar mood="thinking" size={32} />
      <View style={[styles.bubble, styles.finn]}>
        <Text style={[styles.finnText, { color: colors.muted }]}>Finn is thinking…</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.bubble, maxWidth: '85%' },
  user: { alignSelf: 'flex-end', backgroundColor: colors.ocean, borderBottomRightRadius: 6 },
  userText: { color: '#FFFFFF', fontSize: 16 },
  finnRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '92%' },
  finnColumn: { flexShrink: 1, gap: 8 },
  finn: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderBottomLeftRadius: 6, ...shadow },
  finnText: { color: colors.deep, fontSize: 16, lineHeight: 22 },
});
