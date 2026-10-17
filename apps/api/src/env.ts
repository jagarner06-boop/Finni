import { authModeProblem } from "./domain/demoToken.js";
import { z } from "zod";

const schema = z.object({
  NESSIE_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().default("gemini-3.1-flash-lite"),
  // Tried once when the primary model is overloaded (503) or rate-limited (429).
  GEMINI_FALLBACK_MODEL: z.string().default("gemini-3.8-flash"),
  AUTH0_DOMAIN: z.string().min(1),
  AUTH0_AUDIENCE: z.string().min(1),
  // demo = any device signs in with `Bearer demo.<deviceId>` (Expo Go, hackathon demos). Never deploy it.
  AUTH_MODE: z.enum(["auth0", "demo"]).default("auth0"),
  // Public (not a secret): the ID token audience checked by step-up.
  AUTH0_CLIENT_ID: z.string().default("qQweRCxviMmTL4nsKygCt8Try2jLvQJL"),
  DATABASE_URL: z.string().url(),
  STEP_UP_THRESHOLD: z.coerce.number().default(100),
  PORT: z.coerce.number().default(4000),
  DEMO_LAT: z.coerce.number().default(38.8816),
  DEMO_LNG: z.coerce.number().default(-77.091),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const authProblem = authModeProblem(parsed.data.AUTH_MODE, process.env.NODE_ENV);
if (authProblem) {
  console.error(authProblem);
  process.exit(1);
}

export const env = parsed.data;
