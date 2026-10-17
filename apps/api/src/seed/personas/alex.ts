import type { GoalCadence, GoalIcon } from "@finni/shared";
import { isoDay } from "../../lib/dates.js";
import type { MerchantKey } from "../merchants.js";

const HULU_DAYS_AGO = 5;
const dayOfMonth = (days: number) => Number(isoDay(days).slice(8));

// "Alex — UF junior" (Seed plan). All dates are day offsets from today so the demo always looks current.
// Whole dollars only: Nessie truncates cents.

export type PersonaAccount = "checking" | "card";

export interface PersonaPurchase {
  merchant: MerchantKey;
  amount: number;
  daysAgo: number;
  account: PersonaAccount;
}
export interface PersonaMovement {
  amount: number;
  daysAgo: number;
  description: string;
}
export interface PersonaBill {
  payee: string;
  nickname: string;
  amount: number;
  /** Pending bills: due this many days from today. */
  dueInDays?: number;
  /** Recurring bills: day of month. */
  recurringDay?: number;
  /** Which account the bill is charged to (default checking). */
  account?: PersonaAccount;
}
export interface PersonaGoal {
  name: string;
  icon: GoalIcon;
  targetDollars: number;
  currentDollars: number;
  targetInDays: number;
  milestonesHit: number[];
  cadence?: GoalCadence;
  contributionDollars?: number;
  /** Next contribution this many days from today. */
  nextInDays?: number;
}

export interface PersonaCard {
  nickname: string;
  limit: number;
  /** Amount owed after seeding. */
  target: number;
  statementInDays: number;
}

export interface PersonaPlan {
  /** Live balances we want the user to see after seeding. */
  checkingTarget: number;
  savingsTarget: number;
  card: PersonaCard;
  deposits: PersonaMovement[];
  withdrawals: PersonaMovement[];
  purchases: PersonaPurchase[];
  bills: PersonaBill[];
  goals: PersonaGoal[];
}

// Deterministic PRNG so every seeded user gets the same, natural-looking amounts.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function alexPlan(): PersonaPlan {
  const rand = mulberry32(42);
  const between = (min: number, max: number) => Math.round(min + rand() * (max - min));
  const purchases: PersonaPurchase[] = [];
  const buy = (account: PersonaAccount, merchant: MerchantKey, days: number[], min: number, max = min) => {
    for (const daysAgo of days) purchases.push({ merchant, daysAgo, account, amount: between(min, max) });
  };

  // Groceries, gas and school on the debit card; everything else on the Closer Card.
  buy("checking", "publix", [3, 10, 17, 24, 31, 38, 45, 52, 59], 40, 75);
  buy("checking", "wawa", [5, 20, 34, 48], 30, 40);
  buy("checking", "ufBookstore", [48], 120);
  buy("card", "starbucks", [1, 4, 6, 8, 11, 13, 15, 18, 20, 22, 25, 27, 29, 32, 36, 39, 43, 46, 50, 53, 57], 5, 7);
  // Spotify billed twice 3 days ago (trips the duplicate_charge nudge).
  buy("card", "spotify", [33, 3, 3], 15);
  buy("card", "netflix", [9, 39], 15);
  // Hulu's free trial converted 5 days ago: its first and only charge (trips trial_converted).
  buy("card", "hulu", [HULU_DAYS_AGO], 18);
  buy("card", "chipotle", [7, 21, 35, 49], 11, 14);
  buy("card", "amc", [26], 16);
  buy("card", "target", [12, 41], 25, 60);
  buy("card", "uber", [19, 33], 12, 18);
  // DoorDash spike: ~weekly before, then 4 orders in the last 7 days (trips the spending_spike nudge).
  buy("card", "doordash", [16, 23, 30, 37, 44, 51, 58], 18, 26);
  buy("card", "doordash", [1, 2, 4, 6], 22, 32);

  return {
    checkingTarget: 2140,
    savingsTarget: 400,
    card: { nickname: "Closer Card", limit: 2000, target: 1364, statementInDays: 6 },
    deposits: [
      ...[2, 16, 30, 44, 58].map((daysAgo) => ({ amount: 620, daysAgo, description: "Campus job" })),
      ...[5, 35].map((daysAgo) => ({ amount: 250, daysAgo, description: "From Mom" })),
    ],
    withdrawals: [15, 43].map((daysAgo) => ({ amount: 750, daysAgo, description: "Rent · Gainesville Place" })),
    purchases,
    bills: [
      { payee: "Gainesville Place", nickname: "Rent", amount: 750, recurringDay: 1 },
      { payee: "Visible", nickname: "Phone", amount: 45, dueInDays: 2 },
      { payee: "GRU", nickname: "Electric", amount: 82, dueInDays: 12 },
      { payee: "Lemonade", nickname: "Renter's insurance", amount: 14, recurringDay: 15 },
      { payee: "Hulu", nickname: "Hulu", amount: 18, recurringDay: dayOfMonth(-HULU_DAYS_AGO), account: "card" },
    ],
    goals: [
      { name: "Hawaii Fund", icon: "sun", targetDollars: 2400, currentDollars: 1488, targetInDays: 150, milestonesHit: [25, 50], cadence: "weekly", contributionDollars: 50, nextInDays: 3 },
      // Behind: $40 every 2 weeks can't reach $1,500 in 45 days. Its contribution is due today.
      { name: "Car repair", icon: "tool", targetDollars: 1500, currentDollars: 420, targetInDays: 45, milestonesHit: [25], cadence: "biweekly", contributionDollars: 40, nextInDays: 0 },
      { name: "Emergency", icon: "shield", targetDollars: 1000, currentDollars: 1000, targetInDays: 0, milestonesHit: [25, 50, 75, 100] },
    ],
  };
}

/** Nessie balances are fixed at creation, so pick the opening balance that makes the live balance land on target. */
const sum = (xs: { amount: number }[]) => xs.reduce((s, x) => s + x.amount, 0);
const purchasesOn = (plan: PersonaPlan, account: PersonaAccount) => plan.purchases.filter((p) => p.account === account);

export function openingChecking(plan: PersonaPlan): number {
  return Math.max(0, plan.checkingTarget - sum(plan.deposits) + sum(plan.withdrawals) + sum(purchasesOn(plan, "checking")));
}

/** Card balances are amounts owed: opening + purchases lands on `card.target`. */
export function openingCard(plan: PersonaPlan): number {
  return Math.max(0, plan.card.target - sum(purchasesOn(plan, "card")));
}
