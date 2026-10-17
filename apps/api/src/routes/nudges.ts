import type { ActionResponse, NudgeScanResponse, NudgesResponse } from "@finni/shared";
import { Router, type Request } from "express";
import { getSub } from "../auth.js";
import { actOnNudge, listNudges, markNudge, scanNudges } from "../services/nudges.js";
import { requireUser } from "../services/users.js";

export const nudgesRouter = Router();

const user = (req: Request) => requireUser(getSub(req));

nudgesRouter.get("/nudges", async (req, res) => {
  const body: NudgesResponse = { nudges: await listNudges(await user(req)) };
  res.json(body);
});

// Demo trigger (long-press Finn): scan right now.
nudgesRouter.post("/nudges/scan", async (req, res) => {
  const u = await user(req);
  const { created } = await scanNudges(u);
  const body: NudgeScanResponse = { created, nudges: await listNudges({ ...u, lastNudgeScanAt: new Date() }) };
  res.json(body);
});

const marks = { read: "readAt", notified: "notifiedAt", dismiss: "dismissedAt" } as const;
for (const [path, field] of Object.entries(marks)) {
  nudgesRouter.post(`/nudges/:id/${path}`, async (req, res) => {
    await markNudge(await user(req), req.params.id as string, field);
    res.status(204).end();
  });
}

nudgesRouter.post("/nudges/:id/act", async (req, res) => {
  const body: ActionResponse = { action: await actOnNudge(await user(req), req.params.id) };
  res.json(body);
});
