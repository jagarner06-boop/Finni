import { eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import type { User } from "../db/schema.js";
import { alexPlan } from "../seed/personas/alex.js";
import { seedPersona } from "./seed.js";
import { createPersonaCustomer } from "./users.js";

/**
 * Gives a user a fresh, fully seeded persona: new Nessie customer, cleared chat, actions, nudges and goals.
 * Never touches Nessie's global data (merchants stay). Seeding runs in the background unless `wait`.
 */
export async function resetPersona(user: User, opts: { firstName?: string; wait?: boolean } = {}): Promise<User> {
  const firstName = opts.firstName ?? user.firstName ?? "Friend";
  const plan = alexPlan();
  const nessieIds = await createPersonaCustomer(firstName, plan);
  const [fresh] = await db.transaction(async (tx) => {
    for (const table of [schema.chatMessages, schema.pendingActions, schema.nudges, schema.goals]) await tx.delete(table).where(eq(table.userId, user.id));
    return tx
      .update(schema.users)
      .set({ ...nessieIds, firstName, personaTemplate: "alex", seededAt: null, lastNudgeScanAt: null, stepUpAt: null })
      .where(eq(schema.users.id, user.id))
      .returning();
  });
  const seeding = seedPersona(fresh, plan);
  if (opts.wait) await seeding;
  else void seeding;
  return fresh;
}
