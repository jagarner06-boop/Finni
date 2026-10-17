import { router } from 'expo-router';
import PersonalityDeck from '@/features/onboarding/PersonalityDeck';
export default function Screen() { return <PersonalityDeck onComplete={() => router.push('/(onboarding)/connect')} />; }
