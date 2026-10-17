import type { Goal, GoalsResponse, PendingAction } from "@finni/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api } from "@/api/endpoints";
import { qk } from "@/api/queries";
import { crossedGoalMilestone } from "./milestones";

export function useGoalMilestone(action: PendingAction | undefined) {
  const client = useQueryClient();
  const [before] = useState(() => client.getQueryData<GoalsResponse>(qk.goals));
  const checked = useRef(new Set<string>());
  const [result, setResult] = useState<{
    goal: Goal;
    milestone: number;
  } | null>(null);
  const id = action?.id, type = action?.type, status = action?.status;
  useEffect(() => {
    if (
      !id ||
      type !== "transfer" ||
      status !== "executed" ||
      checked.current.has(id) ||
      !before
    )
      return;
    checked.current.add(id);
    let alive = true;
    client
      .fetchQuery({ queryKey: qk.goals, queryFn: api.goals, staleTime: 0 })
      .then((after) => {
        if (!alive) return;
        for (const goal of after.goals) {
          const old = before.goals.find((g) => g.id === goal.id);
          const milestone = old
            ? crossedGoalMilestone(old.percent, goal.percent)
            : null;
          if (milestone) {
            setResult({ goal, milestone });
            break;
          }
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id, type, status, before, client]);
  return { result, dismiss: () => setResult(null) };
}
