import type { Mood } from '@finni/shared';
import { useImperativeHandle, type ReactNode, type Ref } from 'react';

import type { FinnHeadTrigger } from '@/components/finn/rive';

// Static FinnRive: used on web (the Rive runtime's Nitro views are native-only) and in Expo Go,
// which doesn't ship the NitroModules native module. Shows the PNG fallback and ignores triggers.

export type FinnRiveHandle = { fire: (name: FinnHeadTrigger) => void };

export function FinnRiveHead({ fallback, ref }: { mood: Mood; size: number; fallback: ReactNode; ref?: Ref<FinnRiveHandle> }) {
  useImperativeHandle(ref, () => ({ fire: () => {} }), []);
  return <>{fallback}</>;
}

export function FinnRiveBody({ fallback }: { size: number; fallback: ReactNode; waveKey: number }) {
  return <>{fallback}</>;
}
