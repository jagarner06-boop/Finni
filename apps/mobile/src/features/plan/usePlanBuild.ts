import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';

import { useSession } from '@/auth/useSession';
import { ANALYSIS_KEY, analysisTasks } from '@/components/session/analysis';

/**
 * The real work behind the four plan steps:
 * basics = bootstrap with the onboarding profile, paychecks = seeding + 90 days of transactions,
 * money style = bills, bank = the first nudge scan. Returns how many steps are finished (0–4).
 */
export function usePlanBuild() {
  const session = useSession();
  const ready = session.phase === 'ready';
  const [tasksDone, setTasksDone] = useState(0);
  const [taskError, setTaskError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const doneRef = useRef(0);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    (async () => {
      setTaskError(false);
      for (let i = doneRef.current; i < analysisTasks.length; i++) {
        await analysisTasks[i]();
        if (!alive) return;
        // The first-run analysis is this screen's work, so the tabs don't repeat it.
        if (i === analysisTasks.length - 1) await AsyncStorage.setItem(ANALYSIS_KEY, 'true');
        doneRef.current = i + 1;
        setTasksDone(i + 1);
      }
    })().catch(() => alive && setTaskError(true));
    return () => {
      alive = false;
    };
  }, [ready, attempt]);

  const completed =
    session.phase === 'bootstrapping' ? 0 : !ready || tasksDone < 1 ? 1 : tasksDone < 3 ? 2 : tasksDone < 4 ? 3 : 4;

  return {
    completed,
    error: session.phase === 'error' || taskError,
    /** The session is up, so the tabs work even if the first analysis is skipped. */
    canSkip: ready && taskError,
    retry: () => {
      if (session.phase === 'error') void session.retry();
      else setAttempt((n) => n + 1);
    },
  };
}
