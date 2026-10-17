import { boolean, date, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { Card } from "@finni/shared";

// Nessie is the source of truth for money; these tables hold only what Nessie can't.

export const moodEnum = pgEnum("mood", ["happy", "thinking", "worried", "celebrating"]);
export const goalStatusEnum = pgEnum("goal_status", ["active", "completed", "archived"]);
export const actionTypeEnum = pgEnum("action_type", ["transfer", "bill_payment", "create_goal"]);
export const actionStatusEnum = pgEnum("action_status", ["pending", "executing", "executed", "rejected", "expired", "failed"]);
export const actionSourceEnum = pgEnum("action_source", ["chat", "ui", "nudge"]);
export const roleEnum = pgEnum("chat_role", ["user", "finn"]);
export const nudgeRuleEnum = pgEnum("nudge_rule", ["bill_due", "spending_spike", "goal_milestone", "low_balance"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  auth0Sub: text("auth0_sub").notNull().unique(),
  email: text("email"),
  firstName: text("first_name"),
  nessieCustomerId: text("nessie_customer_id").notNull().unique(),
  checkingAccountId: text("checking_account_id").notNull(),
  savingsAccountId: text("savings_account_id").notNull(),
  personaTemplate: text("persona_template"),
  lastNudgeScanAt: timestamp("last_nudge_scan_at", { withTimezone: true }),
  seededAt: timestamp("seeded_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    emoji: text("emoji"),
    targetCents: integer("target_cents").notNull(),
    targetDate: date("target_date"),
    nessieAccountId: text("nessie_account_id").notNull().unique(),
    milestonesHit: integer("milestones_hit").array().notNull().default([]),
    status: goalStatusEnum("status").notNull().default("active"),
    createdAt: createdAt(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("goals_user_idx").on(t.userId)],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
    text: text("text").notNull(),
    mood: moodEnum("mood"),
    cards: jsonb("cards").$type<Card[]>().notNull().default([]),
    createdAt: createdAt(),
  },
  (t) => [index("chat_user_created_idx").on(t.userId, t.createdAt.desc())],
);

export type TransferPayload = { fromAccountId: string; toAccountId: string; reason?: string };
export type BillPaymentPayload = { billId: string; fromAccountId: string };
export type CreateGoalPayload = { name: string; emoji?: string; targetCents: number; targetDate?: string };
/** What the approval card shows; stored with the payload so cards render without re-fetching Nessie. */
export type ActionDisplay = { title: string; fromLabel?: string; toLabel?: string; reason?: string };
export type ActionPayload = (TransferPayload | BillPaymentPayload | CreateGoalPayload) & { display: ActionDisplay };

export const pendingActions = pgTable(
  "pending_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: actionTypeEnum("type").notNull(),
    payload: jsonb("payload").$type<ActionPayload>().notNull(),
    amountCents: integer("amount_cents"),
    requiresStepUp: boolean("requires_step_up").notNull(),
    status: actionStatusEnum("status").notNull().default("pending"),
    source: actionSourceEnum("source").notNull(),
    chatMessageId: uuid("chat_message_id").references(() => chatMessages.id, { onDelete: "set null" }),
    nessieRef: text("nessie_ref"),
    error: text("error"),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    executedAt: timestamp("executed_at", { withTimezone: true }),
  },
  (t) => [index("actions_user_status_idx").on(t.userId, t.status)],
);

export const nudges = pgTable(
  "nudges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    rule: nudgeRuleEnum("rule").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    mood: moodEnum("mood").notNull(),
    action: jsonb("action").$type<{ type: "propose_bill_payment"; billId: string } | null>(),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("nudges_user_dedupe_uq").on(t.userId, t.dedupeKey)],
);

export type User = typeof users.$inferSelect;
export type ActionRow = typeof pendingActions.$inferSelect;
