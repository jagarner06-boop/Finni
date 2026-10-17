import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityIcon, FinnGlyph, HomeIcon, SettingsIcon } from '@/components/nav/TabIcons';
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
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.hairline,
          height: Math.max(76, 52 + insets.bottom),
          elevation: 0,
          shadowOpacity: 0,
        },
        sceneStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color, size }) => <HomeIcon color={String(color)} size={size} /> }}
      />
      <Tabs.Screen
        name="finn"
        options={{
          title: 'Finn',
          tabBarIcon: ({ color, size }) => <FinnGlyph color={String(color)} size={size} />,
          tabBarAccessibilityLabel: 'Finn, chat with your money buddy',
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, size }) => <ActivityIcon color={String(color)} size={size} />,
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.accent,
            color: colors.surface,
            fontFamily: fonts.bold,
            fontSize: 11,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <SettingsIcon color={String(color)} size={size} /> }}
      />
    </Tabs>
  );
}
