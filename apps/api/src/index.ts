import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { authenticate, getSub } from "./auth.js";
import { env } from "./env.js";
import { activityRouter } from "./routes/activity.js";
import { chatRouter } from "./routes/chat.js";
import { meRouter } from "./routes/me.js";
import { moneyRouter } from "./routes/money.js";
import { homeRouter } from "./routes/home.js";
import { nudgesRouter } from "./routes/nudges.js";
import { settingsRouter } from "./routes/settings.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path} auth=${req.headers.authorization ? req.headers.authorization.slice(0, 15) + "…" : "none"}`);
  next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(authenticate);

// Foundation spike: proves the Expo login → JWT → API path works.
app.get("/whoami", (req, res) => {
  res.json({ sub: getSub(req), scope: req.auth?.payload.scope ?? null });
});

app.use(meRouter);
app.use(chatRouter);
app.use(moneyRouter);
app.use(activityRouter);
app.use(nudgesRouter);
app.use(homeRouter);
app.use(settingsRouter);

const onError: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "invalid_request", message: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
    return;
  }
  const status = typeof err.status === "number" ? err.status : 500;
  if (status >= 500) console.error(err);
  const fallback = status === 401 ? "unauthorized" : status === 403 ? "forbidden" : status < 500 ? "bad_request" : "internal_error";
  res.status(status).json({ error: err.code ?? fallback, message: err.message });
};
app.use(onError);

app.listen(env.PORT, () => {
  console.log(`Finni API on http://localhost:${env.PORT}`);
  if (env.AUTH_MODE === "demo") console.warn("AUTH_MODE=demo: any device can sign in. Do not deploy this.");
});
