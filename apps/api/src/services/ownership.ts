import type { Account, Bill } from "@finni/shared";
import type { User } from "../db/schema.js";
import { listAccounts } from "./accounts.js";
import { listBills } from "./bills.js";
import { HttpError } from "./users.js";

// Every ID that comes from the model or the client goes through these: a user can only touch their own things.

export async function ownedAccount(user: User, accountId: string, accounts?: Account[]): Promise<Account> {
  const account = (accounts ?? (await listAccounts(user))).find((a) => a.id === accountId);
  if (!account) throw new HttpError(404, "account_not_found", `No account ${accountId} for this user`);
  return account;
}

export async function ownedBill(user: User, billId: string): Promise<Bill> {
  const bill = (await listBills(user)).find((b) => b.id === billId);
  if (!bill) throw new HttpError(404, "bill_not_found", `No bill ${billId} for this user`);
  return bill;
}
