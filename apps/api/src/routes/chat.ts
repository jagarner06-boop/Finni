import type { ChatHistoryResponse, ChatMessage, ChatResponse } from "@finni/shared";
import { desc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { runAgent } from "../agent/loop.js";
import { getSub } from "../auth.js";
import { db, schema } from "../db/client.js";
import { linkActionsToMessage } from "../services/actions.js";
import { requireUser } from "../services/users.js";

export const chatRouter = Router();

const chatBody = z.object({
  message: z.string().trim().min(1).max(1000),
  // No location (denied / web) → tools use the demo location.
  location: z.object({ lat: z.number(), lng: z.number() }).optional(),
});

const historyQuery = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) });

type Row = typeof schema.chatMessages.$inferSelect;
const toMessage = (r: Row): ChatMessage => ({ id: r.id, role: r.role, text: r.text, mood: r.mood, cards: r.cards, createdAt: r.createdAt.toISOString() });

chatRouter.post("/chat", async (req, res) => {
  const { message, location } = chatBody.parse(req.body);
  const user = await requireUser(getSub(req));

  // Run the agent before saving the user's message so history replay doesn't include it twice.
  const reply = await runAgent(user, message, { location });

  await db.insert(schema.chatMessages).values({ userId: user.id, role: "user", text: message });
  const [finn] = await db
    .insert(schema.chatMessages)
    .values({ userId: user.id, role: "finn", text: reply.text, mood: reply.mood, cards: reply.cards })
    .returning();
  await linkActionsToMessage(reply.actionIds, finn.id);

  const finnMessage = toMessage(finn);
  const body: ChatResponse = { reply: finnMessage, cards: finnMessage.cards };
  res.json(body);
});

chatRouter.get("/chat/history", async (req, res) => {
  const { limit } = historyQuery.parse(req.query);
  const user = await requireUser(getSub(req));
  const rows = await db.select().from(schema.chatMessages).where(eq(schema.chatMessages.userId, user.id)).orderBy(desc(schema.chatMessages.createdAt)).limit(limit);
  const body: ChatHistoryResponse = { messages: rows.reverse().map(toMessage) };
  res.json(body);
});
