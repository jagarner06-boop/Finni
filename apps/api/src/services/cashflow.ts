import { toCents, type CashflowForecast } from "@finni/shared";
import type { User } from "../db/schema.js";
import { forecastCashflow } from "../domain/cashflow.js";
import { isoDay } from "../lib/dates.js";
import { nessie } from "../nessie/client.js";
import { listAccounts } from "./accounts.js";
import { listBills } from "./bills.js";
import { listGoals } from "./goals.js";

export async function getCashflow(user: User): Promise<CashflowForecast | null> {
  const [accounts, bills, goals, deposits] = await Promise.all([
    listAccounts(user), listBills(user), listGoals(user), nessie.getDeposits(user.checkingAccountId),
  ]);
  return forecastCashflow({ today: isoDay(), checking: accounts.find((a) => a.id === user.checkingAccountId) ?? null,
    bills, goals, profile: user.profile ?? null,
    deposits: deposits.filter((d) => d.status !== "cancelled").map((d) => ({ date: d.transaction_date, amountCents: toCents(d.amount), description: d.description ?? "" })),
  });
}
