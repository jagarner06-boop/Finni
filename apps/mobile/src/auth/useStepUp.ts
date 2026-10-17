import { useAuth } from './AuthProvider';

/**
 * Explicit MFA re-auth, for screens that want to step up *before* calling the API
 * (e.g. the approval sheet when `requiresStepUp` is true). The API client also
 * steps up automatically on a 403 `step_up_required`, so this is optional.
 */
export function useStepUp() {
  const { stepUp } = useAuth();
  return stepUp;
}
