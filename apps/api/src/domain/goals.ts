import type { GoalCadence } from "@finni/shared";

export const cadenceLabel = (c: GoalCadence): "weekly" | "every 2 weeks" | "monthly" => (c === "weekly" ? "weekly" : c === "biweekly" ? "every 2 weeks" : "monthly");
