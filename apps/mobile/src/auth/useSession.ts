import { useEffect, useRef } from 'react';

import { useBootstrap, useMe } from '@/api/queries';
import { useAuth } from './AuthProvider';

export type SessionPhase = 'bootstrapping' | 'seeding' | 'ready' | 'error';

/**
 * After sign-in: POST /me/bootstrap once (creates the Nessie customer on first
 * login, idempotent afterwards), then poll GET /me until persona seeding finishes.
 */
export function useSession() {
  const { status } = useAuth();
  const bootstrap = useBootstrap();
  const started = useRef(false);
  const signedIn = status === 'signedIn';

  useEffect(() => {
    if (!signedIn) {
      started.current = false;
      return;
    }
    if (started.current) return;
    started.current = true;
    bootstrap.mutate();
  }, [signedIn, bootstrap]);

  const me = useMe({ enabled: signedIn && bootstrap.isSuccess, pollUntilSeeded: true });

  let phase: SessionPhase;
  if (bootstrap.isError || me.isError) phase = 'error';
  else if (!bootstrap.isSuccess) phase = 'bootstrapping';
  else if (!me.data?.seeded) phase = 'seeding';
  else phase = 'ready';

  return {
    phase,
    me: me.data ?? null,
    error: bootstrap.error ?? me.error,
    retry: () => (bootstrap.isError ? bootstrap.mutate() : me.refetch()),
  };
}
