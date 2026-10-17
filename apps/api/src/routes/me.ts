import type { BootstrapResponse, Me } from "@finni/shared";
import { Router } from "express";
import { z } from "zod";
import { getSub } from "../auth.js";
import type { User } from "../db/schema.js";
import { listAccounts } from "../services/accounts.js";
import { bootstrapUser, findUserBySub, requireUser } from "../services/users.js";

export const meRouter = Router();

const bootstrapBody = z.object({ firstName: z.string().max(60).optional(), email: z.string().email().optional() });

const toMe = async (user: User): Promise<Me> => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  seeded: !!user.seededAt,
  accounts: await listAccounts(user),
});

meRouter.post("/me/bootstrap", async (req, res) => {
  const profile = bootstrapBody.parse(req.body ?? {});
  const sub = getSub(req);
  const created = !(await findUserBySub(sub));
  const user = await bootstrapUser(sub, profile);
  const body: BootstrapResponse = { me: await toMe(user), created };
  res.json(body);
});

meRouter.get("/me", async (req, res) => {
  const user = await requireUser(getSub(req));
  const body: Me = await toMe(user);
  res.json(body);
});
