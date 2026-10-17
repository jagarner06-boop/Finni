import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface StoredTokens {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  /** Epoch seconds. */
  expiresAt: number;
}

const KEY = 'finni.tokens';

// SecureStore has no web implementation; fall back to localStorage there.
async function read(): Promise<string | null> {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(KEY) ?? null;
  return SecureStore.getItemAsync(KEY);
}

async function write(value: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (value === null) globalThis.localStorage?.removeItem(KEY);
    else globalThis.localStorage?.setItem(KEY, value);
    return;
  }
  if (value === null) await SecureStore.deleteItemAsync(KEY);
  else await SecureStore.setItemAsync(KEY, value);
}

export const tokenStore = {
  async get(): Promise<StoredTokens | null> {
    const raw = await read();
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredTokens;
    } catch {
      await write(null);
      return null;
    }
  },
  set: (tokens: StoredTokens) => write(JSON.stringify(tokens)),
  clear: () => write(null),
};
