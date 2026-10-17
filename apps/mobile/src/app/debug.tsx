import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_URL, apiFetch } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';

// Foundation spike screen: Auth0 login → access token → protected API call.
// Replaced by Welcome + Chat in Slice A.
export default function DebugScreen() {
  const { ready, user, accessToken, redirectUri, signIn, signOut, error } = useAuth();
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const callWhoami = async () => {
    setBusy(true);
    try {
      const data = await apiFetch<unknown>('/whoami', accessToken);
      setResult(JSON.stringify(data, null, 2));
    } catch (e) {
      const err = e as Error & { status?: number; body?: unknown };
      setResult(`Error ${err.status ?? ''}: ${JSON.stringify(err.body ?? err.message)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🐟 Finni — auth spike</Text>

        <Text style={styles.label}>Redirect URI (add to Auth0 Allowed Callback URLs)</Text>
        <Text selectable style={styles.code}>{redirectUri}</Text>

        <Text style={styles.label}>API</Text>
        <Text selectable style={styles.code}>{API_URL}</Text>

        {!ready ? (
          <ActivityIndicator />
        ) : user ? (
          <>
            <Text style={styles.label}>Signed in as</Text>
            <Text style={styles.code}>{user.name ?? user.email ?? user.sub}</Text>
            <Text style={styles.label}>Access token</Text>
            <Text selectable style={styles.code}>{describeToken(accessToken)}</Text>
            <Button label={busy ? 'Calling…' : 'Call /whoami'} onPress={callWhoami} />
            <Button label="Sign out" onPress={signOut} secondary />
          </>
        ) : (
          <Button label="Sign in with Auth0" onPress={signIn} />
        )}

        {error && <Text style={styles.error}>{error}</Text>}
        {result && <Text selectable style={styles.code}>{result}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

// Spike diagnostics: a JWT for our API has 3 parts and aud = https://api.finni.app; an opaque/encrypted token means the audience was ignored.
function describeToken(token: string | null): string {
  if (!token) return 'none (signed in but no access token stored)';
  const parts = token.split('.');
  if (parts.length !== 3) return `not a JWT (${parts.length} parts, ${token.length} chars) — audience probably not applied`;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')));
    return `JWT aud=${JSON.stringify(claims.aud)} exp=${new Date(claims.exp * 1000).toLocaleTimeString()}`;
  } catch {
    return `JWT but payload unreadable (${token.length} chars)`;
  }
}

function Button({ label, onPress, secondary }: { label: string; onPress: () => void; secondary?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.button, secondary && styles.buttonSecondary]}>
      <Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3FAFF' },
  container: { padding: 20, gap: 10 },
  title: { fontSize: 24, fontWeight: '800', color: '#0B2545', marginBottom: 8 },
  label: { fontSize: 13, color: '#5B6B82', marginTop: 8 },
  code: { fontFamily: 'monospace', fontSize: 13, color: '#0B2545', backgroundColor: '#FFFFFF', padding: 10, borderRadius: 10 },
  button: { backgroundColor: '#2563EB', borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#2563EB' },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  buttonTextSecondary: { color: '#2563EB' },
  error: { color: '#E5486A', marginTop: 8 },
});
