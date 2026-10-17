import { eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import type { User } from "../db/schema.js";
import { nessie } from "../nessie/client.js";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export async function findUserBySub(sub: string): Promise<User | undefined> {
  return db.query.users.findFirst({ where: eq(schema.users.auth0Sub, sub) });
}

export async function requireUser(sub: string): Promise<User> {
  const user = await findUserBySub(sub);
  if (!user) throw new HttpError(409, "not_bootstrapped", "Call POST /me/bootstrap first");
  return user;
}

// Opening balances. Nessie can't change a balance after creation, so these are the ledger's starting point.
const OPENING_CHECKING = 1240;
const OPENING_SAVINGS = 400;

/** Idempotent first-login setup: one Nessie customer + Checking + Savings per Auth0 user. */
export async function bootstrapUser(sub: string, profile: { firstName?: string; email?: string }): Promise<User> {
  const existing = await findUserBySub(sub);
  if (existing) return existing;

  const firstName = profile.firstName?.trim() || "Friend";
  const customer = await nessie.createCustomer({
    first_name: firstName,
    last_name: "Finni",
    address: { street_number: "1", street_name: "University Ave", city: "Gainesville", state: "FL", zip: "32601" },
  });
  const checking = await nessie.createAccount(customer._id, { type: "Checking", nickname: "Everyday", rewards: 0, balance: OPENING_CHECKING });
  const savings = await nessie.createAccount(customer._id, { type: "Savings", nickname: "Rainy Day", rewards: 0, balance: OPENING_SAVINGS });

  // A concurrent bootstrap may have won the race; keep the first row.
  const [row] = await db
    .insert(schema.users)
    .values({
      auth0Sub: sub,
      email: profile.email ?? null,
      firstName,
      nessieCustomerId: customer._id,
      checkingAccountId: checking._id,
      savingsAccountId: savings._id,
      personaTemplate: "skeleton",
      // Persona history seeding (Seed plan) will set this when it finishes; skeleton has no history to seed.
      seededAt: new Date(),
    })
    .onConflictDoNothing({ target: schema.users.auth0Sub })
    .returning();
  return row ?? (await requireUser(sub));
}
