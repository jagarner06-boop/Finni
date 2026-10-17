import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { subscribeToasts, type ToastMessage } from '@/lib/toast';

const DURATION_MS = 3500;

/** Minimal toast renderer (restyle with the design pass). Mounted once at the root. */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(
    () =>
      subscribeToasts((t) => {
        setToasts((prev) => [...prev, t]);
        setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), DURATION_MS);
      }),
    [],
  );

  if (toasts.length === 0) return null;
  return (
    <View pointerEvents="none" className="absolute inset-x-4 gap-2" style={{ top: insets.top + 8 }}>
      {toasts.map((t) => (
        <View key={t.id} className="rounded-card bg-surface px-4 py-3 shadow-md">
          <Text className="font-bold text-deep">{t.title}</Text>
          {t.body ? <Text className="font-body text-muted">{t.body}</Text> : null}
        </View>
      ))}
    </View>
  );
}
