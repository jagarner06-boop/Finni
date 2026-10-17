export const refreshDistance = (drag: number) => {
  "worklet";
  return Math.min(120, Math.max(0, drag * 0.55));
};
export const shouldRefresh = (pull: number, busy: boolean) => {
  "worklet";
  return pull >= 70 && !busy;
};
