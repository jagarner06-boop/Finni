import type { TransactionsResponse } from "@finni/shared";
import { Router } from "express";
import { z } from "zod";
import { getSub } from "../auth.js";
import { listLedger } from "../services/activity.js";
import { requireUser } from "../services/users.js";

export const activityRouter = Router();

const query = z.object({ days: z.coerce.number().int().min(1).max(90).default(30), accountId: z.string().optional() });

activityRouter.get("/transactions", async (req, res) => {
  const q = query.parse(req.query);
  const body: TransactionsResponse = { entries: await listLedger(await requireUser(getSub(req)), q) };
  res.json(body);
});
