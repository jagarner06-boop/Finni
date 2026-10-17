import type { Goal } from '@finni/shared';
import { act, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { FINN_HEAD_RARE } from '@/components/finn/assets';
import { GoalCard } from '@/components/goals/GoalCard';
import { tideHeight } from '@/components/goals/tide';

const goal = (percent: number, over: Partial<Goal> = {}): Goal => ({
  id: 'goal_hawaii',
  name: 'Hawaii Fund',
  emoji: null,
  targetCents: 240_000,
  currentCents: Math.round((240_000 * percent) / 100),
  percent,
  targetDate: null,
  nessieAccountId: 'acc_goal',
  milestonesHit: [],
  status: percent >= 100 ? 'completed' : 'active',
  createdAt: '2026-09-01T00:00:00.000Z',
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

// Let the 500ms balance count-up run to the end.
const settle = () => act(async () => jest.advanceTimersByTime(1000));

describe('tideHeight', () => {
  it('fills the well in proportion', () => {
    expect(tideHeight(62, 84)).toBeCloseTo(52.08);
  });

  it('never overflows or goes negative', () => {
    expect(tideHeight(130, 84)).toBe(84);
    expect(tideHeight(-5, 84)).toBe(0);
    expect(tideHeight(NaN, 84)).toBe(0);
  });
});

describe('GoalCard', () => {
  it('reads progress in full', async () => {
    await render(<GoalCard goal={goal(62)} />);
    expect(screen.getByLabelText('Hawaii Fund, 62 percent, $1,488.00 of $2,400.00')).toBeTruthy();
  });

  it('celebrates a completed goal with the love head', async () => {
    await render(<GoalCard goal={goal(100)} />);
    expect(screen.getByText('Done. Nice work.')).toBeTruthy();
    expect(screen.getByTestId('finn-head', { includeHiddenElements: true }).props.source).toBe(FINN_HEAD_RARE.love);
  });

  it('stays quiet on first render', async () => {
    await render(<GoalCard goal={goal(50)} />);
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it('counts the balance up to the new amount', async () => {
    const { rerender } = await render(<GoalCard goal={goal(40)} />);
    expect(screen.getByText(/^\$960\.00 /)).toBeTruthy();
    await rerender(<GoalCard goal={goal(50)} />);
    await settle();
    expect(screen.getByText(/^\$1,200\.00 /)).toBeTruthy();
  });

  it('gives a light haptic when the tide rises', async () => {
    const { rerender } = await render(<GoalCard goal={goal(40)} />);
    await rerender(<GoalCard goal={goal(50)} />);
    await settle();
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it('gives a success haptic when the goal fills', async () => {
    const { rerender } = await render(<GoalCard goal={goal(90)} />);
    await rerender(<GoalCard goal={goal(100)} />);
    await settle();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
  });
});
