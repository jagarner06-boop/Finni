import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { ToastHost } from "@/components/ui/ToastHost";
import { showToast } from "@/lib/toast";
import { crossedGoalMilestone } from "../milestones";
import { refreshDistance, shouldRefresh } from "../refresh";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

it("keeps only three toasts and expires them at three seconds", async () => {
  jest.useFakeTimers();
  await render(<ToastHost />);
  await act(() => {
    ["One", "Two", "Three", "Four"].forEach((t) => showToast(t));
  });
  expect(screen.queryByText("One")).toBeNull();
  expect(screen.getByText("Four")).toBeTruthy();
  await act(() => jest.advanceTimersByTime(3000));
  expect(screen.queryByText("Four")).toBeNull();
  jest.useRealTimers();
});
it("dismisses an Undo toast and calls its action exactly once", async () => {
  const undo = jest.fn();
  await render(<ToastHost />);
  await act(() => showToast("Hidden", undefined, { onUndo: undo }));
  await fireEvent.press(screen.getByRole("button", { name: "Undo" }));
  expect(undo).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Hidden")).toBeNull();
});
it("celebrates the highest newly crossed milestone only", () => {
  expect(crossedGoalMilestone(20, 55)).toBe(50);
  expect(crossedGoalMilestone(50, 51)).toBe(null);
  expect(crossedGoalMilestone(90, 100)).toBe(100);
  expect(crossedGoalMilestone(100, 110)).toBe(null);
});
it("caps pull distance and refreshes only above the threshold at the top", () => {
  expect(refreshDistance(100)).toBeCloseTo(55);
  expect(refreshDistance(300)).toBe(120);
  expect(shouldRefresh(69, false)).toBe(false);
  expect(shouldRefresh(70, false)).toBe(true);
  expect(shouldRefresh(90, true)).toBe(false);
});
