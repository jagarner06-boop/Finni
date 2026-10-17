import type { ReactNode } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';

import { useSession } from '@/auth/useSession';
import { FINN_PLUSH } from '@/components/finn/assets';
import { Button } from '@/components/ui/Button';
import { config } from '@/config';
import { colors } from '@/theme/tokens';

/** Holds the post-sign-in phases (bootstrap, seeding, error) until the session is ready. */
export function SessionGate({ children }: { children: ReactNode }) {
  const { phase, retry } = useSession();
  if (phase === 'ready') return <>{children}</>;

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-canvas px-6">
      {phase === 'error' ? (
        <>
          <Text className="font-bold text-lg text-ink text-center">{`Couldn't reach Finni at ${config.apiUrl}`}</Text>
          <Button label="Try again" onPress={retry} />
        </>
      ) : (
        <>
          {/* Hero moment: the one plush Finn on this screen. */}
          <Image
            accessibilityRole="image"
            accessibilityLabel="Finn waves"
            source={FINN_PLUSH.loading}
            style={{ width: 200, height: 200 }}
          />
          <ActivityIndicator color={colors.accent} />
          <Text className="font-regular text-muted">Finn is getting your accounts ready…</Text>
        </>
      )}
    </View>
  );
}
