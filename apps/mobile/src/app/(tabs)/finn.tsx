import { FinnTyping as TypingBubble } from '@/components/feedback/FinnTyping';
import type { ChatMessage } from '@finni/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, type TextInput } from 'react-native';
import { LayoutAnimationConfig } from 'react-native-reanimated';

import { useChatHistory, useMe, useScanNudges, useSendChat } from '@/api/queries';
import { AgentHeader } from '@/components/chat/AgentHeader';
import { Composer } from '@/components/chat/Composer';
import { groupPositions } from '@/components/chat/grouping';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { SuggestionChips } from '@/components/chat/SuggestionChips';
import { SafeAreaView } from '@/components/ui/SafeAreaView';
import { showToast } from '@/lib/toast';
import { colors, fonts } from '@/theme/tokens';

/** Mirrors the server's DEFAULT_CHIPS for the local greeting. */
const DEFAULT_CHIPS = ['What’s due?', 'Check charges', 'How’s my card?'];

const local = (id: string, role: ChatMessage['role'], text: string, chips: string[] = []): ChatMessage => ({
  id,
  role,
  text,
  mood: role === 'finn' ? 'happy' : null,
  cards: [],
  chips,
  createdAt: new Date().toISOString(),
});

// Finn: chat with your money buddy. Expressive element: the 64pt Finn header.
export default function FinnScreen() {
  const params = useLocalSearchParams<{ focus?: string; q?: string }>();
  const history = useChatHistory();
  const me = useMe();
  const send = useSendChat();
  const scan = useScanNudges();
  const [draft, setDraft] = useState(params.q?.trim() ?? '');
  const scroll = useRef<ScrollView>(null);
  const input = useRef<TextInput>(null);

  const messages = history.data?.messages ?? [];
  const greeting =
    history.isSuccess && messages.length === 0
      ? local('greeting', 'finn', `Hi ${me.data?.firstName ?? 'there'}. Ask me about your card, bills, or goals.`, DEFAULT_CHIPS)
      : null;
  // The user's message shows right away while Finn thinks, and stays (marked) if it didn't send.
  const outgoing = (send.isPending || send.isError) && send.variables ? local('outgoing', 'user', send.variables) : null;
  const shown = [...(greeting ? [greeting] : []), ...messages, ...(outgoing ? [outgoing] : [])];
  const positions = groupPositions(shown);
  const lastFinn = [...(greeting ? [greeting] : []), ...messages].findLast((m) => m.role === 'finn');
  const replyMood = lastFinn?.mood ?? 'happy';

  const sendText = (text: string) => {
    const message = text.trim();
    if (!message || send.isPending) return;
    send.mutate(message);
  };

  const submit = () => {
    if (!draft.trim() || send.isPending) return;
    sendText(draft);
    setDraft('');
  };

  // ?focus=1 puts the keyboard up. Params are cleared so returning to the tab doesn't repeat them.
  useEffect(() => {
    if (params.focus !== '1') return;
    input.current?.focus();
    router.setParams({ focus: undefined });
  }, [params.focus]);

  // A link can set ?q=, so it only fills the composer; the person still presses Send.
  const q = params.q?.trim() || undefined;
  const [seenQ, setSeenQ] = useState(q);
  if (q !== seenQ) {
    setSeenQ(q);
    if (q) setDraft(q);
  }
  useEffect(() => {
    if (!q) return;
    input.current?.focus();
    router.setParams({ q: undefined });
  }, [q]);

  // Demo trigger: long-press Finn to run the nudge scan.
  const checkAccounts = () =>
    scan.mutate(undefined, { onSuccess: () => showToast('Finn checked your accounts.') });

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <Pressable onLongPress={checkAccounts} accessibilityHint="Long press to have Finn check your accounts">
        <AgentHeader sending={send.isPending} replyMood={replyMood} />
      </Pressable>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scroll}
          style={styles.flex}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
          // Drag the chat down to put the keyboard away (iOS follows the finger, like Messages).
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled">
          {history.isLoading && <Text style={styles.empty}>Loading…</Text>}
          {/* History renders in place; only messages that arrive later animate in. */}
          <LayoutAnimationConfig skipEntering>
            {shown.map((m, i) => (
              <MessageBubble
                key={m.id}
                message={m}
                position={positions[i]}
                onRetry={m.id === 'outgoing' && send.isError ? () => sendText(m.text) : undefined}
              />
            ))}
          </LayoutAnimationConfig>
          {send.isPending && <TypingBubble />}
        </ScrollView>

        <SuggestionChips chips={lastFinn?.chips ?? []} onPick={sendText} disabled={send.isPending} />
        <Composer ref={input} value={draft} onChange={setDraft} onSend={submit} sending={send.isPending} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 4 },
  empty: { textAlign: 'center', color: colors.muted, fontFamily: fonts.regular, fontSize: 14, marginTop: 40 },
});
