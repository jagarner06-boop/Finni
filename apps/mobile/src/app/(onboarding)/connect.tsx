import { router } from 'expo-router';
import ConnectDeck from '@/features/onboarding/ConnectDeck';
export default function Screen() { return <ConnectDeck onComplete={() => router.replace('/(tabs)')} />; }
