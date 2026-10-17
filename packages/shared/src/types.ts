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

export interface Goal {
  id: string;
  name: string;
  emoji: string | null;
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
}

export type PendingActionType = 'transfer' | 'bill_payment' | 'create_goal';
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
  reason?: string;
  requiresStepUp: boolean;
  status: PendingActionStatus;
  source: PendingActionSource;
  createdAt: ISODateTime;
  expiresAt: ISODateTime;
  executedAt: ISODateTime | null;
  error: string | null;
}

export type NudgeRule = 'bill_due' | 'spending_spike' | 'goal_milestone' | 'low_balance';

export type NudgeAction = { type: 'propose_bill_payment'; billId: string };

export interface Nudge {
  id: string;
  rule: NudgeRule;
  title: string;
  body: string;
  mood: Mood;
  action: NudgeAction | null;
  notifiedAt: ISODateTime | null;
  readAt: ISODateTime | null;
  createdAt: ISODateTime;
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
