import { randomUUID } from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

import { secureRead, secureWrite } from './tokenStore';

const KEY = 'finni.demoDevice';

let pending: Promise<string> | null = null;

/** Anonymous demo identity: a device id made once and kept in secure storage. */
export function getDemoToken(): Promise<string> {
  pending ??= (async () => {
    let id = await secureRead(KEY);
    if (!id) {
      id = randomUUID();
      await secureWrite(KEY, id);
    }
    return `demo.${id}`;
  })().finally(() => {
    pending = null;
  });
  return pending;
}

/** Sign out: the next launch gets a new device id, so a new user with a fresh persona. */
export async function clearDemoDevice(): Promise<void> {
  await secureWrite(KEY, null);
}

/** Face ID / passcode check. Passes where there is nothing to check (web, no hardware, none enrolled). */
export async function confirmWithDevice(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  if (!(await LocalAuthentication.hasHardwareAsync())) return true;
  if (!(await LocalAuthentication.isEnrolledAsync())) return true;
  const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Confirm it's you" });
  return result.success;
}
