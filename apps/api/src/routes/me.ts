import type { BootstrapResponse, Me } from "@finni/shared";
import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { fetchUserInfo, getSub } from "../auth.js";
import { db, schema } from "../db/client.js";
import { env } from "../env.js";
import { resetPersona } from "../services/reset.js";
import type { User } from "../db/schema.js";
import { listAccounts } from "../services/accounts.js";
import { bootstrapUser, findUserBySub, HttpError, requireUser, saveProfile } from "../services/users.js";

import { finnProfileSchema } from "../domain/profile.js";

export const meRouter = Router();

const bootstrapBody = z.object({ firstName: z.string().max(60).optional(), email: z.string().email().optional(), profile: finnProfileSchema.optional() });

const toMe = async (user: User): Promise<Me> => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  seeded: !!user.seededAt,
  accounts: await listAccounts(user),
});

meRouter.post("/me/bootstrap", async (req, res) => {
  const body = bootstrapBody.parse(req.body ?? {});
  const sub = getSub(req);
  // Fill identity from Auth0 only on the first call.
  const isNew = !(await findUserBySub(sub));
  const fromAuth0 = isNew && !body.firstName && env.AUTH_MODE === "auth0" ? await fetchUserInfo(req) : {};
  let { user, created } = await bootstrapUser(sub, { ...fromAuth0, firstName: body.firstName ?? fromAuth0.firstName, email: body.email ?? fromAuth0.email });
  if (body.profile) user = await saveProfile(user.id, body.profile, body.firstName);
  const response: BootstrapResponse = { me: await toMe(user), created };
  res.json(response);
});

// The app confirmed with Face ID on the device; large approvals pass for 5 minutes.
meRouter.post("/me/step-up", async (req, res) => {
  const user = await requireUser(getSub(req));
  await db.update(schema.users).set({ stepUpAt: new Date() }).where(eq(schema.users.id, user.id));
  res.status(204).end();
});

// Settings → Reset demo data: fresh persona; the app polls GET /me until seeded.
meRouter.post("/me/reset", async (req, res) => {
  const user = await resetPersona(await requireUser(getSub(req)));
  const body: BootstrapResponse = { me: await toMe(user), created: false };
  res.json(body);
});

meRouter.get("/me", async (req, res) => {
  const user = await requireUser(getSub(req));
  const body: Me = await toMe(user);
  res.json(body);
});
