import { Stack } from 'expo-router';
import { colors } from '@/theme/tokens';
export const unstable_settings = { initialRouteName: 'basics' };
export default function OnboardingLayout() { return <Stack screenOptions={{ headerShown: false, gestureEnabled: false, animation: 'fade', contentStyle: { backgroundColor: colors.canvas } }} />; }
