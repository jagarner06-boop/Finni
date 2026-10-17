// Apply only the two cashflow additions; preserve unrelated database columns and rows.
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const sql = postgres(databaseUrl, { ssl: "require", max: 1, connect_timeout: 5 });
try {
  await sql.begin(async (tx) => {
    await tx`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile jsonb`;
    await tx`ALTER TYPE public.nudge_rule ADD VALUE IF NOT EXISTS 'cash_short'`;
  });
  console.log("Cashflow schema additions applied. Existing columns and rows preserved.");
} catch (error) {
  const e = error as { code?: string };
  console.error(`Cashflow migration failed (${e.code ?? "unknown error"}). No destructive schema operations were requested.`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 1 });
}
