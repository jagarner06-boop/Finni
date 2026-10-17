export function crossedGoalMilestone(
  before: number,
  after: number,
): number | null {
  return [100, 75, 50, 25].find((p) => before < p && after >= p) ?? null;
}
