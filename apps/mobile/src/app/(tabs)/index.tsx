import type { ChatMessage } from '@finni/shared';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LayoutAnimationConfig } from 'react-native-reanimated';

import { useChatHistory, useSendChat } from '@/api/queries';
import { AgentHeader } from '@/components/chat/AgentHeader';
import { groupPositions } from '@/components/chat/grouping';
import { MessageBubble, TypingBubble } from '@/components/chat/MessageBubble';
import { Button } from '@/components/ui/Button';
import { SafeAreaView } from '@/components/ui/SafeAreaView';
import { colors, fonts, radius } from '@/theme/tokens';

// Agent: chat with Finn. Expressive element: the 64pt Finn header. Composer redesign comes later.
export default function ChatScreen() {
  const history = useChatHistory();
  const send = useSendChat();
  const [draft, setDraft] = useState('');
  const scroll = useRef<ScrollView>(null);

  const messages = history.data?.messages ?? [];
  // Show the user's message right away while Finn thinks.
  const pending: ChatMessage | null = send.isPending
    ? { id: 'pending', role: 'user', text: send.variables ?? '', mood: null, cards: [], createdAt: new Date().toISOString() }
    : null;
  const shown = pending ? [...messages, pending] : messages;
  const positions = groupPositions(shown);
  const replyMood = messages.findLast((m) => m.role === 'finn')?.mood ?? 'happy';

  const submit = () => {
    const text = draft.trim();
    if (!text || send.isPending) return;
    setDraft('');
    send.mutate(text);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <AgentHeader sending={send.isPending} replyMood={replyMood} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scroll}
          style={styles.flex}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {shown.length === 0 && (
            <Text style={styles.empty}>{history.isLoading ? 'Loading…' : 'Say hi to Finn. Try “How much money do I have?”'}</Text>
          )}
          {/* History renders in place; only messages that arrive later animate in. */}
          <LayoutAnimationConfig skipEntering>
            {shown.map((m, i) => (
              <MessageBubble key={m.id} message={m} position={positions[i]} />
            ))}
          </LayoutAnimationConfig>
          {send.isPending && <TypingBubble />}
          {send.isError && <Text style={styles.error}>Couldn’t reach Finn. Try again?</Text>}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask Finn"
            placeholderTextColor={colors.placeholder}
            onSubmitEditing={submit}
            returnKeyType="send"
            editable={!send.isPending}
          />
          <Button label="Send" size="sm" onPress={submit} disabled={!draft.trim() || send.isPending} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 4 },
  empty: { textAlign: 'center', color: colors.muted, fontFamily: fonts.regular, fontSize: 14, marginTop: 40 },
  error: { textAlign: 'center', color: colors.dangerInk, fontFamily: fonts.semibold, fontSize: 12, marginTop: 8 },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    borderRadius: radius.bubble,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.canvas,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.ink,
  },
});
