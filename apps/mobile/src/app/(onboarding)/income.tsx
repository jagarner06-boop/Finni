import { router } from 'expo-router';
import IncomeDeck from '@/features/onboarding/IncomeDeck';
export default function Screen() { return <IncomeDeck onComplete={() => router.push('/(onboarding)/personality')} />; }
