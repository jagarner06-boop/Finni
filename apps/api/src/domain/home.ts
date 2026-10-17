import type { Account, CardSummary, Goal, HomeResponse, Nudge, Prefs } from "@finni/shared";

export interface HomeInput {
  firstName: string | null;
  card: CardSummary | null;
  checking: Account | null;
  /** In listNudges order (open first, by severity). */
  nudges: Nudge[];
  goals: Goal[];
  prefs: Prefs;
}

const ATTENTION_ROWS = 2;

/** Home: Finn's one suggestion for the nudge card, then what needs attention (warnings and worse). */
export function buildHome(i: HomeInput): HomeResponse {
  const open = i.nudges.filter((n) => !n.resolvedAt && !n.dismissedAt);
  const plan = open.find((n) => n.rule === "high_utilization" && n.action) ?? open.find((n) => n.action) ?? null;
  const warnings = open.filter((n) => n !== plan && (n.severity === "danger" || n.severity === "warning"));
  const goals = i.goals.filter((g) => g.status !== "archived");
  return {
    firstName: i.firstName,
    card: i.card,
    checking: i.checking,
    plan,
    attention: warnings.slice(0, ATTENTION_ROWS),
    attentionCount: warnings.length,
    goals: { count: goals.length, savedCents: goals.reduce((s, g) => s + g.currentCents, 0) },
    hideBalance: i.prefs.hideBalance,
  };
}
