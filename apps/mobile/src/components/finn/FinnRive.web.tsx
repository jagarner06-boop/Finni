import type { Mood } from '@finni/shared';
import { useImperativeHandle, type ReactNode, type Ref } from 'react';

import type { FinnHeadTrigger } from '@/components/finn/rive';

// Web build of FinnRive: the Rive runtime's Nitro views import native-only modules, so web
// always shows the PNG fallback and ignores triggers. Same API as FinnRive.tsx.

export type FinnRiveHandle = { fire: (name: FinnHeadTrigger) => void };

export function FinnRiveHead({ fallback, ref }: { mood: Mood; size: number; fallback: ReactNode; ref?: Ref<FinnRiveHandle> }) {
  useImperativeHandle(ref, () => ({ fire: () => {} }), []);
  return <>{fallback}</>;
}

export function FinnRiveBody({ fallback }: { size: number; fallback: ReactNode; waveKey: number }) {
  return <>{fallback}</>;
}
