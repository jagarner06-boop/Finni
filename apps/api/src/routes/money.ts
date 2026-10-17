import type { AccountsResponse, ActionResponse, ActionsResponse, BillsResponse, GoalsResponse } from "@finni/shared";
import { Router } from "express";
import { z } from "zod";
import { getSub, requireStepUp } from "../auth.js";
import { listAccounts } from "../services/accounts.js";
import { approveAction, createAction, getActionRow, listActions, rejectAction, toPendingAction } from "../services/actions.js";
import { listBills } from "../services/bills.js";
import { listGoals } from "../services/goals.js";
import { requireUser } from "../services/users.js";
import { contributionLimit } from '../services/contributions.js';
import { ownedAccount } from '../services/ownership.js';

// REST routes behind the Goals / Money / Inbox tabs and approval sheets (see apps/mobile/src/api/endpoints.ts).
export const moneyRouter = Router();

// $1,000,000 cap: keeps ETA math and Nessie amounts sane.
const cents = z.number().int().positive().max(100_000_000);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const goalBody = z.object({
  name: z.string().trim().min(1).max(40),
  icon: z.enum(["sun", "tool", "shield", "home", "book", "gift"]).optional(),
  targetCents: cents,
  targetDate: isoDate.optional(),
  cadence: z.enum(["weekly", "biweekly", "monthly"]).optional(),
  contributionCents: cents.optional(),
  fromAccountId: z.string().optional(),
});
const actionBody = z.discriminatedUnion("type", [
  z.object({ type: z.literal("transfer"), fromAccountId: z.string(), toAccountId: z.string(), amountCents: cents, reason: z.string().max(120).optional() }),
  z.object({ type: z.literal("bill_payment"), billId: z.string(), fromAccountId: z.string().optional() }),
  z.object({ type: z.literal("card_payment"), amountCents: cents, fromAccountId: z.string().optional() }),
  z.object({ type: z.literal("dispute_charge"), purchaseId: z.string() }),
  z.object({ type: z.literal("cancel_subscription"), billId: z.string() }),
  goalBody.extend({ type: z.literal("create_goal") }),
]);
const actionsQuery = z.object({ status: z.enum(["pending", "executing", "executed", "rejected", "expired", "failed"]).optional() });

const user = (req: Parameters<typeof getSub>[0]) => requireUser(getSub(req));

moneyRouter.get("/accounts", async (req, res) => {
  const body: AccountsResponse = { accounts: await listAccounts(await user(req)) };
  res.json(body);
});

moneyRouter.get('/contribution-limit/:accountId', async (req, res) => {
  const current = await user(req);
  const from = await ownedAccount(current, String(req.params.accountId));
  res.json(await contributionLimit(current, from));
});

moneyRouter.get("/goals", async (req, res) => {
  const body: GoalsResponse = { goals: await listGoals(await user(req)) };
  res.json(body);
});

// Goals are created through an approval like everything else.
moneyRouter.post("/goals", async (req, res) => {
  const body: ActionResponse = { action: await createAction(await user(req), { type: "create_goal", ...goalBody.parse(req.body) }, "ui") };
  res.json(body);
});

moneyRouter.get("/bills", async (req, res) => {
  const body: BillsResponse = { bills: await listBills(await user(req)) };
  res.json(body);
});

moneyRouter.get("/actions", async (req, res) => {
  const { status } = actionsQuery.parse(req.query);
  const body: ActionsResponse = { actions: await listActions(await user(req), status) };
  res.json(body);
});

moneyRouter.get("/actions/:id", async (req, res) => {
  const body: ActionResponse = { action: toPendingAction(await getActionRow(await user(req), req.params.id)) };
  res.json(body);
});

moneyRouter.post("/actions", async (req, res) => {
  const body: ActionResponse = { action: await createAction(await user(req), actionBody.parse(req.body), "ui") };
  res.json(body);
});

moneyRouter.post("/actions/:id/approve", async (req, res) => {
  const u = await user(req);
  const row = await getActionRow(u, req.params.id);
  // Checked before claiming, so a 403 leaves the action pending for the retry after re-login.
  if (row.requiresStepUp && row.status === "pending") await requireStepUp(req, u);
  const body: ActionResponse = { action: await approveAction(u, row.id) };
  res.json(body);
});

moneyRouter.post("/actions/:id/reject", async (req, res) => {
  const body: ActionResponse = { action: await rejectAction(await user(req), req.params.id) };
  res.json(body);
});
