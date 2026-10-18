import { api } from "@/api/endpoints";

/** Set once the first account analysis has run on this device. */
export const ANALYSIS_KEY = "finni.analysis.v1";

/** The first-run analysis, in order. The last task resolves to how many savings nudges it found. */
export const analysisTasks: (() => Promise<unknown>)[] = [
  () => api.transactions({ days: 90 }),
  async () =>
    (await api.bills()).bills.filter((bill) => bill.status === "recurring"),
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
