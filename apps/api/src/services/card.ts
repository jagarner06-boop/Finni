import type { CardSummary } from "@finni/shared";
import type { User } from "../db/schema.js";
import { nextStatementClose, utilizationPct } from "../domain/card.js";
import { maskFor } from "../domain/mask.js";
import { daysUntil, isoDay } from "../lib/dates.js";
import { nessie } from "../nessie/client.js";
import { liveBalanceCents } from "./ledger.js";

/** The persona's Closer Card with live amount owed, utilization and statement close; null for users without one. */
export async function getCardSummary(user: User): Promise<CardSummary | null> {
  if (!user.creditAccountId) return null;
  const account = await nessie.getAccount(user.creditAccountId);
  const balanceCents = await liveBalanceCents(account);
  const limitCents = user.creditLimitCents ?? 0;
  const statementCloseDate = nextStatementClose(user.statementDay ?? 1, isoDay());
  return {
    accountId: account._id,
    nickname: account.nickname,
    mask: maskFor(account._id),
    balanceCents,
    limitCents,
    utilization: utilizationPct(balanceCents, limitCents),
    statementCloseDate,
    closesInDays: daysUntil(statementCloseDate),
  };
}
