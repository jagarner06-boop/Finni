/** Water height for a goal's percent, clamped to the well so it never overflows or goes negative. */
export function tideHeight(percent: number, wellHeight: number): number {
  if (!Number.isFinite(percent)) return 0;
  return (Math.max(0, Math.min(100, percent)) / 100) * wellHeight;
}
