import { formatCents, type PendingActionType } from "@finni/shared";
import { shortDate } from "../lib/buckets.js";
import { digitsFor } from "./mask.js";

// What the approval sheet says once an action ran. Plain words, what happened, no jokes.

const PREFIX: Record<PendingActionType, string> = {
  transfer: "TR",
  bill_payment: "BP",
  create_goal: "GL",
  card_payment: "CP",
  dispute_charge: "DC",
  cancel_subscription: "CS",
};

/** Confirmation number, e.g. "#CP-48120". */
export const reference = (type: PendingActionType, id: string): string => `#${PREFIX[type]}-${digitsFor(id, 5)}`;

export type ResultInput =
  | { type: "transfer"; amountCents: number; to: string; from: string; fromBalanceCents: number }
  | { type: "bill_payment"; amountCents: number; payee: string }
  | { type: "card_payment"; amountCents: number; to: string }
  | { type: "dispute_charge"; amountCents: number; merchant: string; card: string }
  | { type: "cancel_subscription"; payee: string }
  | { type: "create_goal"; goal: string; contributionCents?: number; firstDate?: string };

export function resultLineFor(r: ResultInput): string {
  switch (r.type) {
    case "transfer":
      return `${formatCents(r.amountCents)} is in ${r.to}. ${r.from} has ${formatCents(r.fromBalanceCents)} left.`;
    case "bill_payment":
      return `Paid ${formatCents(r.amountCents)} to ${r.payee}.`;
    case "card_payment":
      return `Paid ${formatCents(r.amountCents)} to ${r.to}. Utilization will update when the statement closes.`;
    case "dispute_charge":
      return `${formatCents(r.amountCents)} from ${r.merchant} is back on your ${r.card}.`;
    case "cancel_subscription":
      return `${r.payee} is cancelled. No more charges.`;
    case "create_goal":
      return r.contributionCents && r.firstDate
        ? `${r.goal} is open. The first ${formatCents(r.contributionCents)} is ready ${shortDate(r.firstDate)}.`
        : `${r.goal} is open.`;
  }
}
