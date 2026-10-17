import type { HomeResponse } from "@finni/shared";
import { Router } from "express";
import { getSub } from "../auth.js";
import { buildHome } from "../domain/home.js";
import { listAccounts } from "../services/accounts.js";
import { getCardSummary } from "../services/card.js";
import { listGoals } from "../services/goals.js";
import { listNudges } from "../services/nudges.js";
import { requireUser } from "../services/users.js";

export const homeRouter = Router();

homeRouter.get("/home", async (req, res) => {
  const user = await requireUser(getSub(req));
  const [card, accounts, nudges, goals] = await Promise.all([getCardSummary(user), listAccounts(user), listNudges(user), listGoals(user)]);
  const body: HomeResponse = buildHome({
    firstName: user.firstName,
    card,
    checking: accounts.find((a) => a.id === user.checkingAccountId) ?? null,
    nudges,
    goals,
    prefs: user.prefs,
  });
  res.json(body);
});
