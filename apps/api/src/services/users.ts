import type { FinnProfile } from "@finni/shared";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import type { User } from "../db/schema.js";
import { nessie } from "../nessie/client.js";
import { isoDay } from "../lib/dates.js";
import { alexPlan, openingCard, openingChecking, type PersonaPlan } from "../seed/personas/alex.js";
import { seedPersona } from "./seed.js";

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

/** A new Nessie customer with Checking, Savings and the Closer Card, opened so the persona's history lands on its target balances. */
export async function createPersonaCustomer(firstName: string, plan: PersonaPlan) {
  const customer = await nessie.createCustomer({
    first_name: firstName,
    last_name: "Finni",
    address: { street_number: "1", street_name: "University Ave", city: "Gainesville", state: "FL", zip: "32601" },
  });
  // Nessie balances are fixed at creation; the opening balance is chosen so history lands on the persona's target.
  const checking = await nessie.createAccount(customer._id, { type: "Checking", nickname: "Everyday", rewards: 0, balance: openingChecking(plan) });
  const savings = await nessie.createAccount(customer._id, { type: "Savings", nickname: "Rainy Day", rewards: 0, balance: plan.savingsTarget });
  const card = await nessie.createAccount(customer._id, { type: "Credit Card", nickname: plan.card.nickname, rewards: 0, balance: openingCard(plan) });
  return {
    nessieCustomerId: customer._id,
    checkingAccountId: checking._id,
    savingsAccountId: savings._id,
    creditAccountId: card._id,
    creditLimitCents: plan.card.limit * 100,
    statementDay: Number(isoDay(plan.card.statementInDays).slice(8)),
  };
}

/** Idempotent first-login setup: one Nessie customer + Checking + Savings per Auth0 user, then persona seeding in the background. */
export async function bootstrapUser(sub: string, profile: { firstName?: string; email?: string }): Promise<{ user: User; created: boolean }> {
  const existing = await findUserBySub(sub);
  if (existing) return { user: existing, created: false };

  const plan = alexPlan();
  const firstName = profile.firstName?.trim() || "Friend";
  const nessieIds = await createPersonaCustomer(firstName, plan);

  // A concurrent bootstrap may have won the race; keep the first row.
  const [row] = await db
    .insert(schema.users)
    .values({
      auth0Sub: sub,
      email: profile.email ?? null,
      firstName,
      ...nessieIds,
      personaTemplate: "alex",
    })
    .onConflictDoNothing({ target: schema.users.auth0Sub })
    .returning();
  if (!row) return { user: await requireUser(sub), created: false };

  // Not awaited: the app polls GET /me until `seeded` flips (seedPersona always sets seededAt).
  void seedPersona(row, plan);
  return { user: row, created: true };
}

export async function saveProfile(userId: string, profile: FinnProfile, firstName?: string): Promise<User> {
  const name = firstName?.trim();
  const [user] = await db.update(schema.users).set({ profile, ...(name ? { firstName: name } : {}) }).where(eq(schema.users.id, userId)).returning();
  if (!user) throw new HttpError(404, "not_found");
  return user;
}
