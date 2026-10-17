import { boolean, date, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { Card, FinnProfile, NudgeAction, Prefs } from "@finni/shared";

// Nessie is the source of truth for money; these tables hold only what Nessie can't.

export const moodEnum = pgEnum("mood", ["happy", "thinking", "worried", "celebrating"]);
export const goalStatusEnum = pgEnum("goal_status", ["active", "completed", "archived"]);
export const goalCadenceEnum = pgEnum("goal_cadence", ["weekly", "biweekly", "monthly"]);
export const actionTypeEnum = pgEnum("action_type", ["transfer", "bill_payment", "create_goal", "card_payment", "dispute_charge", "cancel_subscription"]);
export const actionStatusEnum = pgEnum("action_status", ["pending", "executing", "executed", "rejected", "expired", "failed"]);
export const actionSourceEnum = pgEnum("action_source", ["chat", "ui", "nudge"]);
export const roleEnum = pgEnum("chat_role", ["user", "finn"]);
export const nudgeRuleEnum = pgEnum("nudge_rule", [
  "bill_due",
  "spending_spike",
  "goal_milestone",
  "low_balance",
  "duplicate_charge",
  "trial_converted",
  "high_utilization",
  "goal_contribution",
]);
export const nudgeSeverityEnum = pgEnum("nudge_severity", ["danger", "warning", "info"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  auth0Sub: text("auth0_sub").notNull().unique(),
  email: text("email"),
  firstName: text("first_name"),
  nessieCustomerId: text("nessie_customer_id").notNull().unique(),
  checkingAccountId: text("checking_account_id").notNull(),
  savingsAccountId: text("savings_account_id").notNull(),
  // The persona's credit card (null for users created before the card existed).
  creditAccountId: text("credit_account_id"),
  creditLimitCents: integer("credit_limit_cents"),
  /** Day of month the card statement closes. */
  statementDay: integer("statement_day"),
  profile: jsonb("profile").$type<FinnProfile | null>(),
  prefs: jsonb("prefs").$type<Prefs>().notNull().default({ notifications: true, hideBalance: false }),
  /** Demo auth: last on-device confirmation (Face ID) for large approvals. */
  stepUpAt: timestamp("step_up_at", { withTimezone: true }),
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
    // Holds a GoalIcon key ("sun", "tool", ...); the column predates icons.
    emoji: text("emoji"),
    targetCents: integer("target_cents").notNull(),
    targetDate: date("target_date"),
    nessieAccountId: text("nessie_account_id").notNull().unique(),
    milestonesHit: integer("milestones_hit").array().notNull().default([]),
    status: goalStatusEnum("status").notNull().default("active"),
    cadence: goalCadenceEnum("cadence"),
    contributionCents: integer("contribution_cents"),
    fromAccountId: text("from_account_id"),
    nextContributionOn: date("next_contribution_on"),
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
    chips: text("chips").array().notNull().default([]),
    createdAt: createdAt(),
  },
  (t) => [index("chat_user_created_idx").on(t.userId, t.createdAt.desc())],
);

export type TransferPayload = { fromAccountId: string; toAccountId: string; reason?: string };
export type BillPaymentPayload = { billId: string; fromAccountId: string };
export type CreateGoalPayload = {
  name: string;
  icon?: string;
  targetCents: number;
  targetDate?: string;
  cadence?: "weekly" | "biweekly" | "monthly";
  contributionCents?: number;
  fromAccountId?: string;
};
export type CardPaymentPayload = { fromAccountId: string; toAccountId: string };
export type DisputePayload = { purchaseId: string; accountId: string; merchant: string };
export type CancelSubscriptionPayload = { billId: string };
/** What the approval card shows; stored with the payload so cards render without re-fetching Nessie. */
export type ActionDisplay = { title: string; fromLabel?: string; toLabel?: string; fromDetail?: string; toDetail?: string; reason?: string };
export type ActionPayload = (TransferPayload | BillPaymentPayload | CreateGoalPayload | CardPaymentPayload | DisputePayload | CancelSubscriptionPayload) & {
  display: ActionDisplay;
};

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
    nudgeId: uuid("nudge_id").references((): AnyPgColumn => nudges.id, { onDelete: "set null" }),
    resultLine: text("result_line"),
    nessieRef: text("nessie_ref"),
    error: text("error"),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    executedAt: timestamp("executed_at", { withTimezone: true }),
  },
  (t) => [
    index("actions_user_status_idx").on(t.userId, t.status),
    // One refund per purchase: a second dispute can't be claimed while one is executing or done.
    uniqueIndex("actions_one_refund_per_purchase_uq")
      .on(sql`(${t.payload}->>'purchaseId')`)
      .where(sql`${t.type} = 'dispute_charge' and ${t.status} in ('executing', 'executed')`),
  ],
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
    severity: nudgeSeverityEnum("severity").notNull().default("info"),
    face: text("face"),
    meta: text("meta").notNull().default(""),
    highlight: text("highlight"),
    action: jsonb("action").$type<NudgeAction | null>(),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("nudges_user_dedupe_uq").on(t.userId, t.dedupeKey)],
);

export type User = typeof users.$inferSelect;
export type ActionRow = typeof pendingActions.$inferSelect;
export type NudgeRow = typeof nudges.$inferSelect;
