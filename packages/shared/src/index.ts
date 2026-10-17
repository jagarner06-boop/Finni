// Shared contract between apps/api and apps/mobile. Money is always integer cents.

export const MOODS = ["happy", "thinking", "worried", "celebrating"] as const;
export type Mood = (typeof MOODS)[number];

export const toCents = (dollars: number): number => Math.round(dollars * 100);
export const toDollars = (cents: number): number => cents / 100;
export const formatCents = (cents: number): string =>
  (cents < 0 ? "−" : "") +
  "$" +
  (Math.abs(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface LatLng {
  lat: number;
  lng: number;
}

// ---------- Domain ----------

export interface Account {
  id: string;
  nickname: string;
  type: "Checking" | "Savings" | "Credit Card";
  balanceCents: number;
  isGoal: boolean;
}

export interface Transaction {
  id: string;
  merchantName: string;
  category: string | null;
  amountCents: number;
  date: string; // YYYY-MM-DD
  description?: string;
}

export interface Bill {
  id: string;
  payee: string;
  nickname?: string;
  amountCents: number;
  dueDate: string | null;
  status: "pending" | "cancelled" | "completed" | "recurring";
}

export interface Goal {
  id: string;
  name: string;
  emoji: string | null;
  targetCents: number;
  currentCents: number;
  percent: number;
  targetDate: string | null;
  nessieAccountId: string;
  status: "active" | "completed" | "archived";
}

export interface Atm {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceMiles: number;
  hours: string[];
  address?: string;
}

export type PendingActionType = "transfer" | "bill_payment" | "create_goal";
export type PendingActionStatus = "pending" | "executing" | "executed" | "rejected" | "expired" | "failed";

export interface PendingAction {
  id: string;
  type: PendingActionType;
  title: string;
  amountCents: number | null;
  fromLabel?: string;
  toLabel?: string;
  reason?: string;
  requiresStepUp: boolean;
  status: PendingActionStatus;
  expiresAt: string;
}

export type NudgeRule = "bill_due" | "spending_spike" | "goal_milestone" | "low_balance";

export interface Nudge {
  id: string;
  rule: NudgeRule;
  title: string;
  body: string;
  mood: Mood;
  action: { type: "propose_bill_payment"; billId: string } | null;
  notifiedAt: string | null;
  readAt: string | null;
  createdAt: string;
}

// ---------- Cards rendered under Finn's messages ----------

export type Card =
  | { type: "account_list"; accounts: Account[] }
  | { type: "transaction_list"; title: string; transactions: Transaction[]; totalCents: number }
  | { type: "spending_breakdown"; days: number; groups: { label: string; totalCents: number }[] }
  | { type: "bill_list"; bills: Bill[] }
  | { type: "goal_progress"; goals: Goal[] }
  | { type: "atm_list"; atms: Atm[]; usedDemoLocation: boolean }
  | { type: "approval"; action: PendingAction };

// ---------- API ----------

export interface ChatMessage {
  id: string;
  role: "user" | "finn";
  text: string;
  mood: Mood | null;
  cards: Card[];
  createdAt: string;
}

export interface ChatRequest {
  message: string;
  location?: LatLng;
  useDemoLocation?: boolean;
}

export interface ChatResponse {
  reply: ChatMessage;
}

export interface MeResponse {
  firstName: string | null;
  email: string | null;
  seeded: boolean;
  accounts: Account[];
}

export interface ApiError {
  error: string;
  message?: string;
}
