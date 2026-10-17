import type { Cents } from './money';

/** ISO-8601 timestamp string, e.g. "2026-10-17T14:03:00.000Z". */
export type ISODateTime = string;
/** Calendar date string, e.g. "2026-10-20". */
export type ISODate = string;

// ---------- Finn ----------

export const MOODS = ['happy', 'thinking', 'worried', 'celebrating'] as const;
export type Mood = (typeof MOODS)[number];

export interface LatLng {
  lat: number;
  lng: number;
}

// ---------- Money domain (read through Nessie, never stored by us) ----------

export type AccountType = 'Checking' | 'Savings' | 'Credit Card';

export interface Account {
  id: string; // Nessie account id
  nickname: string;
  type: AccountType;
  balanceCents: Cents;
  /** Four stable digits for "•••• 4821" (Nessie ids aren't card numbers). */
  mask: string;
  /** True when this account backs a savings goal. */
  isGoal: boolean;
  goalId?: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  merchantName: string;
  category?: string;
  amountCents: Cents;
  date: ISODate;
  description?: string;
}

export type BillStatus = 'pending' | 'recurring' | 'cancelled' | 'completed';

export interface Bill {
  id: string;
  accountId: string;
  payee: string;
  nickname?: string;
  amountCents: Cents;
  dueDate: ISODate | null;
  recurringDate?: number | null; // day of month
  status: BillStatus;
}

export interface Atm {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceMiles?: number;
  hours: string[];
  accessibility?: boolean;
}

// ---------- Our DB domain ----------

export type GoalStatus = 'active' | 'completed' | 'archived';
export type GoalIcon = 'sun' | 'tool' | 'shield' | 'home' | 'book' | 'gift';
export type GoalCadence = 'weekly' | 'biweekly' | 'monthly';

export interface Goal {
  id: string;
  name: string;
  icon: GoalIcon | null;
  targetCents: Cents;
  /** Live balance of the goal's Nessie account. */
  currentCents: Cents;
  /** 0–100, computed server-side. */
  percent: number;
  targetDate: ISODate | null;
  nessieAccountId: string;
  milestonesHit: number[];
  status: GoalStatus;
  createdAt: ISODateTime;
  cadence: GoalCadence | null;
  contributionCents: Cents | null;
  nextContributionOn: ISODate | null;
  /** When the plan reaches the target (server-derived); null without a plan. */
  eta: ISODate | null;
  /** True when the eta is after the target date. */
  behind: boolean;
}

export type PendingActionType =
  | 'transfer'
  | 'bill_payment'
  | 'create_goal'
  | 'card_payment'
  | 'dispute_charge'
  | 'cancel_subscription';
export type PendingActionStatus =
  | 'pending'
  | 'executing'
  | 'executed'
  | 'rejected'
  | 'expired'
  | 'failed';
export type PendingActionSource = 'chat' | 'ui' | 'nudge';

export interface PendingAction {
  id: string;
  type: PendingActionType;
  title: string;
  amountCents: Cents | null; // null for create_goal
  fromLabel?: string;
  toLabel?: string;
  /** Sub-lines under From / To in the approval sheet, e.g. "•••• 1093 · $2,140.00 available". */
  fromDetail?: string;
  toDetail?: string;
  reason?: string;
  requiresStepUp: boolean;
  status: PendingActionStatus;
  source: PendingActionSource;
  createdAt: ISODateTime;
  expiresAt: ISODateTime;
  executedAt: ISODateTime | null;
  error: string | null;
  /** What happened, in plain words, once executed. */
  resultLine: string | null;
  /** Confirmation number shown after execution, e.g. "#CP-48120". */
  reference: string | null;
}

export type NudgeRule =
  | 'bill_due'
  | 'spending_spike'
  | 'goal_milestone'
  | 'low_balance'
  | 'duplicate_charge'
  | 'trial_converted'
  | 'high_utilization'
  | 'goal_contribution';

export type NudgeSeverity = 'danger' | 'warning' | 'info';
/** Rare Finn heads some nudges use instead of the mood head. */
export type NudgeFace = 'surprised' | 'skeptical';

export type NudgeAction =
  | { type: 'propose_bill_payment'; billId: string; label: string }
  | { type: 'propose_card_payment'; amountCents: Cents; label: string }
  | { type: 'propose_dispute'; purchaseId: string; label: string }
  | { type: 'propose_cancel_subscription'; billId: string; label: string }
  | { type: 'propose_goal_contribution'; goalId: string; amountCents: Cents; label: string };

export interface Nudge {
  id: string;
  rule: NudgeRule;
  title: string;
  body: string;
  mood: Mood;
  severity: NudgeSeverity;
  face: NudgeFace | null;
  /** Short line for Home rows, e.g. "Spotify · $15.00 · Oct 14". */
  meta: string;
  /** Part of `body` set in bold (the key number). */
  highlight: string | null;
  action: NudgeAction | null;
  notifiedAt: ISODateTime | null;
  readAt: ISODateTime | null;
  dismissedAt: ISODateTime | null;
  /** Set when the condition is gone (bill paid, charge refunded). */
  resolvedAt: ISODateTime | null;
  createdAt: ISODateTime;
}

/** One money movement on any account, for Activity. */
export interface LedgerEntry {
  id: string;
  accountId: string;
  accountLabel: string;
  kind: 'purchase' | 'deposit' | 'withdrawal';
  title: string;
  category?: string;
  /** Signed: purchases and withdrawals are negative. */
  amountCents: Cents;
  date: ISODate;
}

export interface CardSummary {
  accountId: string;
  nickname: string;
  mask: string;
  /** Amount owed. */
  balanceCents: Cents;
  limitCents: Cents;
  /** Rounded percent of the limit in use. */
  utilization: number;
  statementCloseDate: ISODate;
  closesInDays: number;
}

export type LifeStage = 'student' | 'start' | 'career' | 'family' | 'self' | 'retired';
export type PaySchedule = 'weekly' | 'biweekly' | 'semi' | 'monthly' | 'irregular';
export type MoneyStyle = 'fresh_start' | 'free_spirit' | 'steady' | 'planner';
export type HandsOn = 'watch' | 'suggest' | 'prep';

export interface FinnProfile {
  lifeStage: LifeStage | null;
  paySchedule: PaySchedule;
  /** The payday picked in onboarding; null for Not sure. */
  nextPayday: ISODate | null;
  style: MoneyStyle;
  handsOn: HandsOn;
}

export interface Prefs {
  notifications: boolean;
  hideBalance: boolean;
  /** Total goal contributions per calendar month (UTC); null/absent means no budget. */
  monthlySavingsBudgetCents?: Cents | null;
}

// ---------- Chat cards (rendered under Finn's bubbles) ----------

export interface SpendingItem {
  label: string;
  amountCents: Cents;
  percent: number;
}

export type ChartKind = 'bar' | 'line' | 'donut';

export interface ChartSeries {
  name: string;
  /** One value per label. */
  valuesCents: Cents[];
}

export type Card =
  | { type: 'account_list'; accounts: Account[] }
  | { type: 'transaction_list'; title?: string; transactions: Transaction[] }
  | {
      type: 'spending_breakdown';
      days: number;
      groupBy: 'category' | 'merchant';
      totalCents: Cents;
      items: SpendingItem[];
    }
  | { type: 'bill_list'; bills: Bill[] }
  | { type: 'goal_progress'; goals: Goal[] }
  | {
      type: 'atm_list';
      atms: Atm[];
      /** True when results come from demo coords instead of the user's location. */
      usedFallback: boolean;
      note?: string;
    }
  | {
      type: 'approval';
      actionId: string;
      actionType: PendingActionType;
      title: string;
      amountCents: Cents | null;
      fromLabel?: string;
      toLabel?: string;
      requiresStepUp: boolean;
      status: PendingActionStatus;
      expiresAt: ISODateTime;
    }
  | {
      type: 'chart';
      kind: ChartKind;
      title: string;
      subtitle?: string;
      /** X-axis labels (bar/line) or slice labels (donut). */
      labels: string[];
      /** Donut and line use series[0]; bar may have 2 series (grouped). */
      series: ChartSeries[];
      totalCents?: Cents;
    };

export type CardType = Card['type'];

export interface ChatMessage {
  id: string;
  role: 'user' | 'finn';
  text: string;
  mood: Mood | null; // finn only
  cards: Card[];
  /** Suggested follow-ups (finn only). */
  chips: string[];
  createdAt: ISODateTime;
}

// ---------- User ----------

export interface Me {
  id: string;
  email: string | null;
  firstName: string | null;
  /** False until persona history seeding finishes after bootstrap. */
  seeded: boolean;
  accounts: Account[];
}
