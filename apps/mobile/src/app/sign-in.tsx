import { router } from 'expo-router';

import { SignIn } from '@/features/signin/SignIn';

/** After onboarding: sign in to keep the plan, then it builds. */
export default function SignInScreen() {
  return <SignIn onContinue={() => router.replace('/plan')} />;
}
