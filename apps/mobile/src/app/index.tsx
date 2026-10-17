import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBootstrap, useChatHistory, useSendMessage } from '@/api/queries';
import { useAuth } from '@/auth/AuthProvider';
import { MessageBubble, TypingBubble } from '@/components/chat/MessageBubble';
import { FinnAvatar } from '@/components/finn/FinnAvatar';
import { colors, radius } from '@/theme/tokens';

export default function Home() {
  const { ready, accessToken } = useAuth();
  if (!ready) return <Centered><ActivityIndicator color={colors.ocean} /></Centered>;
  return accessToken ? <ChatScreen /> : <WelcomeScreen />;
}

function WelcomeScreen() {
  const { signIn, error } = useAuth();
  return (
    <Centered>
      <FinnAvatar size={120} />
      <Text style={styles.hero}>Hi! I&apos;m Finn</Text>
      <Text style={styles.sub}>Your money buddy. I keep an eye on your accounts and never move a dollar without your OK.</Text>
      <Pressable style={styles.primary} onPress={signIn}>
        <Text style={styles.primaryText}>Meet Finn</Text>
      </Pressable>
      {error && <Text style={styles.error}>{error}</Text>}
      <Link href="/debug" style={styles.debugLink}>auth debug</Link>
    </Centered>
  );
}

const QUICK_REPLIES = ['How much money do I have?', 'What can you do?'];

function ChatScreen() {
  const bootstrap = useBootstrap();
  const history = useChatHistory(bootstrap.isSuccess);
  const send = useSendMessage();
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList>(null);

  const messages = history.data ?? [];
  const lastFinnMood = [...messages].reverse().find((m) => m.role === 'finn')?.mood ?? 'happy';

  useEffect(() => {
    if (messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length, send.isPending]);

  const submit = (text: string) => {
    const message = text.trim();
    if (!message || send.isPending) return;
    setDraft('');
    send.mutate({ message });
  };

  if (bootstrap.isPending) {
    return (
      <Centered>
        <FinnAvatar mood="thinking" size={96} />
        <Text style={styles.sub}>Finn is setting up your tank…</Text>
      </Centered>
    );
  }
  if (bootstrap.isError) {
    return (
      <Centered>
        <FinnAvatar mood="worried" size={96} />
        <Text style={styles.sub}>Couldn&apos;t reach Finn: {(bootstrap.error as Error).message}</Text>
        <Pressable style={styles.primary} onPress={() => bootstrap.refetch()}>
          <Text style={styles.primaryText}>Try again</Text>
        </Pressable>
        <Link href="/debug" style={styles.debugLink}>auth debug</Link>
      </Centered>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <FinnAvatar mood={send.isPending ? 'thinking' : lastFinnMood} size={44} />
        <View>
          <Text style={styles.headerTitle}>Finn</Text>
          <Text style={styles.headerSub}>{send.isPending ? 'thinking…' : `Hi ${bootstrap.data.firstName ?? 'there'}!`}</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          style={styles.flex}
          contentContainerStyle={styles.list}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          ListEmptyComponent={
            history.isPending ? <ActivityIndicator color={colors.ocean} /> : <Text style={styles.empty}>Say hi to Finn 👋</Text>
          }
          ListFooterComponent={send.isPending ? <TypingBubble /> : null}
        />

        {send.isError && <Text style={styles.error}>Message failed: {(send.error as Error).message}</Text>}

        <View style={styles.chips}>
          {QUICK_REPLIES.map((q) => (
            <Pressable key={q} style={styles.chip} onPress={() => submit(q)}>
              <Text style={styles.chipText}>{q}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Message Finn…"
            placeholderTextColor={colors.muted}
            onSubmitEditing={() => submit(draft)}
            returnKeyType="send"
          />
          <Pressable style={[styles.send, (!draft.trim() || send.isPending) && styles.sendDisabled]} onPress={() => submit(draft)}>
            <Text style={styles.primaryText}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={[styles.safe, styles.centered]}>
      <View style={styles.centeredInner}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.foam },
  centered: { justifyContent: 'center' },
  centeredInner: { alignItems: 'center', gap: 16, paddingHorizontal: 24 },
  hero: { fontSize: 32, fontWeight: '800', color: colors.deep },
  sub: { fontSize: 17, color: colors.muted, textAlign: 'center', lineHeight: 24 },
  primary: { backgroundColor: colors.ocean, borderRadius: radius.pill, paddingVertical: 14, paddingHorizontal: 40, minHeight: 44 },
  primaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 17 },
  error: { color: colors.berry, textAlign: 'center', paddingHorizontal: 16 },
  debugLink: { color: colors.muted, fontSize: 13, marginTop: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.deep },
  headerSub: { fontSize: 14, color: colors.muted },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  chip: { borderWidth: 1, borderColor: colors.lagoon, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.surface },
  chipText: { color: colors.deep, fontSize: 14 },
  composer: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.deep,
  },
  send: { backgroundColor: colors.ocean, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.4 },
});
