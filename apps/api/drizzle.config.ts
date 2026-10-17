import { defineConfig } from "drizzle-kit";

process.loadEnvFile?.(".env");

export default defineConfig({
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  // drizzle-kit uses the postgres-js driver here; sslmode=require = TLS without CA verification (Supabase pooler).
  dbCredentials: { url: `${process.env.DATABASE_URL}${process.env.DATABASE_URL?.includes("?") ? "&" : "?"}sslmode=require` },
});
