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
export async function secureRead(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

export async function secureWrite(key: string, value: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (value === null) globalThis.localStorage?.removeItem(key);
    else globalThis.localStorage?.setItem(key, value);
    return;
  }
  if (value === null) await SecureStore.deleteItemAsync(key);
  else await SecureStore.setItemAsync(key, value);
}

const read = () => secureRead(KEY);
const write = (value: string | null) => secureWrite(KEY, value);

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
