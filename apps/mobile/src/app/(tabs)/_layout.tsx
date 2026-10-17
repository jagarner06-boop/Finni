import { Tabs } from 'expo-router';

import { SessionGate } from '@/components/session/SessionGate';
import { useNudgeNotifier } from '@/lib/useNudgeNotifier';
import { colors, fonts } from '@/theme/tokens';

export default function TabsLayout() {
  return (
    <SessionGate>
      <SignedInTabs />
    </SessionGate>
  );
}

function SignedInTabs() {
  const unread = useNudgeNotifier();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.bold },
        // Icons TBD in the design pass; labels only for now.
        tabBarIconStyle: { display: 'none' },
        sceneStyle: { backgroundColor: colors.canvas },
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
          tabBarBadgeStyle: { backgroundColor: colors.accent },
        }}
      />
    </Tabs>
  );
}
