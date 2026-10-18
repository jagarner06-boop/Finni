import { router } from 'expo-router';

import { useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { PlanLoading } from '@/features/plan/PlanLoading';
import { usePlanBuild } from '@/features/plan/usePlanBuild';

/** Plays once after every onboarding, while Finni turns the answers into a plan. */
export default function Plan() {
  const { retry, ...build } = usePlanBuild();
  const { finishPlan } = useOnboarding();
  const leave = async () => {
    await finishPlan();
    router.replace('/');
  };
  return <PlanLoading {...build} onRetry={retry} onSkip={leave} onDone={leave} />;
}
