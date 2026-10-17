import type { ChatMessage } from '@finni/shared';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useChatHistory, useSendChat } from '@/api/queries';
import { MessageBubble, TypingBubble } from '@/components/chat/MessageBubble';
import { SafeAreaView } from '@/components/ui/SafeAreaView';
import { colors, fonts, radius } from '@/theme/tokens';

// Basic chat with Finn: history, optimistic user bubble, typing indicator. Design pass comes later.
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

  const submit = () => {
    const text = draft.trim();
    if (!text || send.isPending) return;
    setDraft('');
    send.mutate(text);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scroll}
          style={styles.flex}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 && !pending && (
            <Text style={styles.empty}>{history.isLoading ? 'Loading…' : 'Say hi to Finn! Try "How much money do I have?"'}</Text>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {pending && <MessageBubble message={pending} />}
          {send.isPending && <TypingBubble />}
          {send.isError && <Text style={styles.error}>Couldn't reach Finn. Try again?</Text>}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask Finn anything…"
            placeholderTextColor={colors.muted}
            onSubmitEditing={submit}
            returnKeyType="send"
            editable={!send.isPending}
          />
          <Pressable onPress={submit} disabled={!draft.trim() || send.isPending} style={[styles.send, (!draft.trim() || send.isPending) && styles.disabled]}>
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  list: { padding: 16, gap: 12 },
  empty: { textAlign: 'center', color: colors.muted, fontFamily: fonts.regular, marginTop: 40 },
  error: { textAlign: 'center', color: colors.dangerInk, fontFamily: fonts.regular },
  composer: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.muted, backgroundColor: colors.surface },
  input: { flex: 1, borderRadius: radius.bubble, backgroundColor: colors.canvas, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, fontFamily: fonts.regular, color: colors.ink },
  send: { borderRadius: radius.bubble, backgroundColor: colors.accent, paddingHorizontal: 18, justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  sendText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 16 },
});
