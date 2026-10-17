import { toCents, type Bill, type BillStatus } from "@finni/shared";
import type { User } from "../db/schema.js";
import { nessie } from "../nessie/client.js";

const ORDER: Record<BillStatus, number> = { pending: 0, recurring: 1, completed: 2, cancelled: 3 };

/** The user's bills: unpaid first (soonest due first), then recurring, then paid. Cancelled bills are hidden. */
export async function listBills(user: User, status?: BillStatus): Promise<Bill[]> {
  const raw = await nessie.getCustomerBills(user.nessieCustomerId);
  return raw
    .map(
      (b): Bill => ({
        id: b._id,
        accountId: b.account_id,
        payee: b.payee,
        nickname: b.nickname || undefined,
        amountCents: toCents(b.payment_amount),
        dueDate: b.upcoming_payment_date ?? b.payment_date ?? null,
        recurringDate: b.status === "recurring" ? (b.recurring_date ?? null) : null,
        status: b.status,
      }),
    )
    .filter((b) => (status ? b.status === status : b.status !== "cancelled"))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9"));
}
