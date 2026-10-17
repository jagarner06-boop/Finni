import * as fallback from '@/components/finn/FinnRiveFallback';
import type * as native from '@/components/finn/FinnRiveImpl';

export type { FinnRiveHandle } from '@/components/finn/FinnRiveFallback';

// The Rive runtime needs the NitroModules native module. Dev builds have it; Expo Go doesn't, and
// there loading the runtime throws. Try the real thing once and fall back to static PNG Finn.
function load(): typeof fallback {
  try {
    return require('@/components/finn/FinnRiveImpl') as typeof native;
  } catch (err) {
    if (__DEV__) console.warn('Rive unavailable (Expo Go?); using static Finn.', (err as Error).message.split('\n')[0]);
    return fallback;
  }
}

const finnRive = load();

export const FinnRiveHead = finnRive.FinnRiveHead;
export const FinnRiveBody = finnRive.FinnRiveBody;
