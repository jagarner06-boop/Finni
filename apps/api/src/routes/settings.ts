import type { SettingsResponse } from "@finni/shared";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { getSub } from "../auth.js";
import { db, schema } from "../db/client.js";
import type { User } from "../db/schema.js";
import { env } from "../env.js";
import { listAccounts } from "../services/accounts.js";
import { requireUser } from "../services/users.js";

export const settingsRouter = Router();

const patchBody = z.object({
  firstName: z.string().trim().min(1).max(40).optional(),
  prefs: z.object({ notifications: z.boolean(), hideBalance: z.boolean(), monthlySavingsBudgetCents: z.number().int().min(0).max(100_000_000).multipleOf(100).nullable() }).partial().optional(),
});

const toSettings = async (user: User): Promise<SettingsResponse> => ({
  firstName: user.firstName,
  email: user.email,
  prefs: user.prefs,
  accounts: await listAccounts(user),
  stepUpThresholdCents: env.STEP_UP_THRESHOLD * 100,
  authMode: env.AUTH_MODE,
});

settingsRouter.get("/settings", async (req, res) => {
  res.json(await toSettings(await requireUser(getSub(req))));
});

settingsRouter.patch("/settings", async (req, res) => {
  const body = patchBody.parse(req.body ?? {});
  const user = await requireUser(getSub(req));
  const [updated] = await db
    .update(schema.users)
    .set({ ...(body.firstName ? { firstName: body.firstName } : {}), prefs: { ...user.prefs, ...body.prefs } })
    .where(eq(schema.users.id, user.id))
    .returning();
  res.json(await toSettings(updated));
});
