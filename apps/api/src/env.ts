import { z } from "zod";

const schema = z.object({
  NESSIE_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().default("gemini-3.8-flash"),
  AUTH0_DOMAIN: z.string().min(1),
  AUTH0_AUDIENCE: z.string().min(1),
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

export const env = parsed.data;
