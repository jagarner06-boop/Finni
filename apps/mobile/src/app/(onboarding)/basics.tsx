import { router } from 'expo-router';
import BasicsDeck from '@/features/onboarding/BasicsDeck';
export default function Screen() { return <BasicsDeck onComplete={() => router.push('/(onboarding)/income')} />; }
