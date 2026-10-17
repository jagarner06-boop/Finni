import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/api/endpoints";
import { FinnAnalyzing } from "@/components/feedback/FinnAnalyzing";

const KEY = "finni.analysis.v1";
export function FirstAnalysisGate({ children }: { children: ReactNode }) {
  const [done, setDone] = useState(false),
    [completed, setCompleted] = useState(0),
    [found, setFound] = useState(0);
  const [attempt, setAttempt] = useState(0),
    [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const pause = () =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          timers.delete(timer);
          resolve();
        }, 1100);
        timers.add(timer);
      });
    const run = async () => {
      if ((await AsyncStorage.getItem(KEY)) === "true") {
        if (alive) setDone(true);
        return;
      }
      if (!alive) return;
      setCompleted(0);
      setError(null);
      const tasks = [
        () => api.transactions({ days: 90 }),
        async () =>
          (await api.bills()).bills.filter(
            (bill) => bill.status === "recurring",
          ),
        () => api.bills(),
        async () => {
          await api.scanNudges();
          const { nudges } = await api.nudges();
          return nudges.filter(
            (n) =>
              !n.resolvedAt &&
              (n.rule === "trial_converted" ||
                n.rule === "goal_contribution" ||
                n.rule === "high_utilization"),
          ).length;
        },
      ];
      for (let i = 0; i < tasks.length; i++) {
        if (!alive) return;
        const [result] = await Promise.all([tasks[i](), pause()]);
        if (!alive) return;
        if (i === 3 && typeof result === "number") setFound(result);
        setCompleted(i + 1);
      }
      await AsyncStorage.setItem(KEY, "true");
      await pause();
      if (alive) setDone(true);
    };
    run().catch(() => {
      if (alive)
        setError("Could not finish checking your accounts. Please try again.");
    });
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [attempt]);
  return done ? (
    <>{children}</>
  ) : (
    <FinnAnalyzing
      completed={completed}
      found={found}
      error={error}
      onRetry={() => setAttempt((n) => n + 1)}
    />
  );
}
