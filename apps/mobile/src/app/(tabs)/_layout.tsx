import { Tabs } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useSession } from '@/auth/useSession';
import { useNudgeNotifier } from '@/lib/useNudgeNotifier';
import { colors, fonts } from '@/theme/tokens';

export default function TabsLayout() {
  const session = useSession();

  if (session.phase !== 'ready') return <SessionLoading phase={session.phase} onRetry={session.retry} />;
  return <SignedInTabs />;
}

function SignedInTabs() {
  const unread = useNudgeNotifier();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.lagoon,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.bold },
        // Icons TBD in the design pass; labels only for now.
        tabBarIconStyle: { display: 'none' },
        sceneStyle: { backgroundColor: colors.foam },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Chat' }} />
      <Tabs.Screen name="goals" options={{ title: 'Goals' }} />
      <Tabs.Screen name="money" options={{ title: 'Money' }} />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.coral },
        }}
      />
    </Tabs>
  );
}

// Placeholder for "Finn is setting up your tank…" (design pass).
function SessionLoading({ phase, onRetry }: { phase: string; onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-foam px-6">
      {phase === 'error' ? (
        <>
          <Text className="font-bold text-lg text-deep">Glub… couldn't reach Finn's tank.</Text>
          <Pressable onPress={onRetry} className="rounded-full bg-ocean px-6 py-3">
            <Text className="font-bold text-white">Try again</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.lagoon} />
          <Text className="font-body text-muted">Finn is setting up your tank…</Text>
        </>
      )}
    </View>
  );
}
