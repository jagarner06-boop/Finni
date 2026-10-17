import '../global.css';

import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  useFonts,
} from '@expo-google-fonts/figtree';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/api/queries';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { ToastHost } from '@/components/ui/ToastHost';
import { colors } from '@/theme/tokens';
import { OnboardingProvider, useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { ConfettiProvider } from '@/components/confetti/ConfettiOverlay';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <OnboardingProvider>
              <ConfettiProvider>
                <RootNavigator />
              </ConfettiProvider>
            </OnboardingProvider>
            <ToastHost />
            <StatusBar style="dark" />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { status } = useAuth();
  const onboarding = useOnboarding();
  const [fontsLoaded, fontError] = useFonts({ Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold });
  const ready = (fontsLoaded || !!fontError) && status !== 'loading' && onboarding.ready;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Never leak one user's cached data into the next session.
  useEffect(() => {
    if (status === 'signedOut') queryClient.clear();
  }, [status]);

  if (!ready) return null;
  if (onboarding.loadFailed) return <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 20, backgroundColor: colors.canvas }}><Text style={{ color: colors.ink }}>{onboarding.error}</Text><Button label="Try again" onPress={onboarding.retry} /></View>;

  const signedIn = status === 'signedIn';
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
      <Stack.Protected guard={signedIn && !onboarding.complete}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && onboarding.complete}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="approve/[id]"
          options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}
        />
        <Stack.Screen name="goals" />
        <Stack.Screen name="goal/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="goal/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="welcome" />
      </Stack.Protected>
    </Stack>
  );
}
