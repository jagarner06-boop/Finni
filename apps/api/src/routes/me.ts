import type { MeResponse } from "@finni/shared";
import { Router } from "express";
import { z } from "zod";
import { getSub } from "../auth.js";
import { listAccounts } from "../services/accounts.js";
import { bootstrapUser, requireUser } from "../services/users.js";

export const meRouter = Router();

const bootstrapBody = z.object({ firstName: z.string().max(60).optional(), email: z.string().email().optional() });

meRouter.post("/me/bootstrap", async (req, res) => {
  const profile = bootstrapBody.parse(req.body ?? {});
  const user = await bootstrapUser(getSub(req), profile);
  const body: MeResponse = { firstName: user.firstName, email: user.email, seeded: !!user.seededAt, accounts: await listAccounts(user) };
  res.json(body);
});

meRouter.get("/me", async (req, res) => {
  const user = await requireUser(getSub(req));
  const body: MeResponse = { firstName: user.firstName, email: user.email, seeded: !!user.seededAt, accounts: await listAccounts(user) };
  res.json(body);
});
