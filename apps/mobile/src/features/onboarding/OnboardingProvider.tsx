import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { OnboardingProfile } from './content';
import { billsMaximum, initialProfile, loadOnboarding, saveOnboarding } from './state';

interface OnboardingState {
  profile: OnboardingProfile; ready: boolean; complete: boolean; saving: boolean; error: string | null;
  update: (patch: Partial<OnboardingProfile>) => void; finish: () => Promise<boolean>; retry: () => void;
}
const Context = createContext<OnboardingState | null>(null);
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState(initialProfile);
  const [ready, setReady] = useState(false), [complete, setComplete] = useState(false);
  const [saving, setSaving] = useState(false), [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const pending = useRef(false);
  useEffect(() => {
    let alive = true;
    loadOnboarding(AsyncStorage).then(result => {
      if (!alive) return;
      setProfile(result.profile); setComplete(result.complete); setReady(true); setError(null);
    }).catch(() => { if (alive) { setError('Could not read your setup. Please try again.'); setReady(true); } });
    return () => { alive = false; };
  }, [attempt]);
  const update = useCallback((patch: Partial<OnboardingProfile>) => setProfile(old => {
    const next = { ...old, ...patch };
    return { ...next, monthlyBills: Math.min(next.monthlyBills, billsMaximum(next.monthlyIncome)) };
  }), []);
  const finish = useCallback(async () => {
    if (pending.current) return false;
    pending.current = true; setSaving(true); setError(null);
    try { await saveOnboarding(AsyncStorage, profile); setComplete(true); return true; }
    catch { setError('Could not save your setup. Please try again.'); return false; }
    finally { pending.current = false; setSaving(false); }
  }, [profile]);
  const retry = useCallback(() => { setReady(false); setAttempt(n => n + 1); }, []);
  const value = useMemo(() => ({ profile, ready, complete, saving, error, update, finish, retry }), [profile, ready, complete, saving, error, update, finish, retry]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useOnboarding() {
  const value = useContext(Context);
  if (!value) throw new Error('OnboardingProvider is required');
  return value;
}
