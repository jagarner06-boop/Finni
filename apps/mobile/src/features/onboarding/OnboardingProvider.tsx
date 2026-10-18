import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { OnboardingProfile } from "./content";
import {
  billsMaximum,
  initialProfile,
  loadOnboarding,
  saveOnboarding,
  setPlanPending,
} from "./state";

interface OnboardingState {
  profile: OnboardingProfile;
  ready: boolean;
  complete: boolean;
  /** True from the end of onboarding until the plan-building screen finishes. */
  planPending: boolean;
  saving: boolean;
  error: string | null;
  loadFailed: boolean;
  update: (patch: Partial<OnboardingProfile>) => void;
  finish: () => Promise<boolean>;
  finishPlan: () => Promise<void>;
  retry: () => void;
}
const Context = createContext<OnboardingState | null>(null);
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState(initialProfile);
  const [ready, setReady] = useState(false),
    [complete, setComplete] = useState(false),
    [planPending, setPending] = useState(false);
  const [saving, setSaving] = useState(false),
    [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    let alive = true;
    loadOnboarding(AsyncStorage)
      .then((result) => {
        if (!alive) return;
        setProfile(result.profile);
        setComplete(result.complete);
        setPending(result.planPending);
        setReady(true);
        setError(null);
        setLoadFailed(false);
      })
      .catch(() => {
        if (alive) {
          setError("Could not read your setup. Please try again.");
          setLoadFailed(true);
          setReady(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [attempt]);
  const update = useCallback(
    (patch: Partial<OnboardingProfile>) =>
      setProfile((old) => {
        const next = { ...old, ...patch };
        return {
          ...next,
          monthlyBills: Math.min(
            next.monthlyBills,
            billsMaximum(next.monthlyIncome),
          ),
        };
      }),
    [],
  );
  const finish = useCallback(async () => {
    if (pending.current) return false;
    pending.current = true;
    setSaving(true);
    setError(null);
    try {
      // Pending first, so a crash between the writes still plays the plan screen.
      await setPlanPending(AsyncStorage, true);
      await saveOnboarding(AsyncStorage, profile);
      setPending(true);
      setComplete(true);
      return true;
    } catch {
      setError("Could not save your setup. Please try again.");
      return false;
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }, [profile]);
  const finishPlan = useCallback(async () => {
    // A failed write only means the plan screen plays again next launch.
    await setPlanPending(AsyncStorage, false).catch(() => {});
    setPending(false);
  }, []);
  const retry = useCallback(() => {
    setReady(false);
    setAttempt((n) => n + 1);
  }, []);
  const value = useMemo(
    () => ({
      profile,
      ready,
      complete,
      planPending,
      saving,
      error,
      loadFailed,
      update,
      finish,
      finishPlan,
      retry,
    }),
    [
      profile,
      ready,
      complete,
      planPending,
      saving,
      error,
      loadFailed,
      update,
      finish,
      finishPlan,
      retry,
    ],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useOnboarding() {
  const value = useContext(Context);
  if (!value) throw new Error("OnboardingProvider is required");
  return value;
}
