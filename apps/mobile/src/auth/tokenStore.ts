import * as SecureStore from 'expo-secure-store';

// Native: Keychain / Keystore. Web uses tokenStore.web.ts.
export const tokenStore = {
  get: (key: string) => SecureStore.getItemAsync(key),
  set: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  remove: (key: string) => SecureStore.deleteItemAsync(key),
};
