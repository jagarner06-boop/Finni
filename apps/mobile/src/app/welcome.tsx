import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { api } from '@/api/endpoints';
import { useAuth, redirectUri } from '@/auth/AuthProvider';
import { config } from '@/config';
import { SafeAreaView } from '@/components/ui/SafeAreaView';

// Placeholder Welcome: real design (animated Finn, copy) comes in the UI pass.
export default function Welcome() {
  const { login, ready } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await login();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 items-center justify-center gap-6 bg-canvas px-6">
      <Text className="text-5xl">🐟</Text>
      <Text className="font-bold text-3xl text-ink">Meet Finn</Text>
      <Pressable
        onPress={onSignIn}
        disabled={!ready || busy}
        className="rounded-full bg-accent px-8 py-4 disabled:opacity-50"
      >
        <Text className="font-bold text-lg text-white">{busy ? 'Signing in…' : 'Sign in'}</Text>
      </Pressable>
      {error ? <Text className="font-regular text-danger-ink">{error}</Text> : null}
      {__DEV__ ? <DevPanel /> : null}
    </SafeAreaView>
  );
}

function DevPanel() {
  const [result, setResult] = useState<string>('');
  const ping = async () => {
    setResult('…');
    try {
      const res = await api.health();
      setResult(`✅ ${JSON.stringify(res)}`);
    } catch (e) {
      setResult(`❌ ${(e as Error).message}`);
    }
  };

  return (
    <View className="mt-8 w-full gap-2 rounded-card bg-surface p-4">
      <Text className="font-bold text-ink">Dev</Text>
      <Text className="font-regular text-xs text-muted" selectable>
        API: {config.apiUrl}
        {config.useMocks ? ' (mocks)' : ''}
        {'\n'}Auth0 callback: {redirectUri}
      </Text>
      <Pressable onPress={ping} className="self-start rounded-full bg-accent px-4 py-2">
        <Text className="font-bold text-white">Ping API</Text>
      </Pressable>
      {result ? (
        <Text className="font-regular text-xs text-ink" selectable>
          {result}
        </Text>
      ) : null}
    </View>
  );
}
