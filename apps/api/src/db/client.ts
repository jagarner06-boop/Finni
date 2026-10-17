import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env.js";
import * as schema from "./schema.js";

// Supabase session pooler; its CA isn't in Node's trust store, so require TLS without verification.
const sql = postgres(env.DATABASE_URL, { ssl: "require", max: 5 });

export const db = drizzle(sql, { schema });
export { schema };
