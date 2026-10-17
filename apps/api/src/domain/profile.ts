import type { FinnProfile } from "@finni/shared";
import { z } from "zod";

export const finnProfileSchema: z.ZodType<FinnProfile> = z.object({
  lifeStage: z.enum(["student", "start", "career", "family", "self", "retired"]).nullable(),
  paySchedule: z.enum(["weekly", "biweekly", "semi", "monthly", "irregular"]),
  nextPayday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  style: z.enum(["fresh_start", "free_spirit", "steady", "planner"]),
  handsOn: z.enum(["watch", "suggest", "prep"]),
});
