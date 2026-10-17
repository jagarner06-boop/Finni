import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '@/auth/AuthProvider';
import { colors } from '@/theme/tokens';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

// Tabs (Chat · Goals · Money · Inbox) arrive with the slices; the skeleton is a single chat screen.
export default function RootLayout() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.foam } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="debug" options={{ headerShown: true, title: 'Auth debug' }} />
        </Stack>
      </QueryClientProvider>
    </AuthProvider>
  );
}
