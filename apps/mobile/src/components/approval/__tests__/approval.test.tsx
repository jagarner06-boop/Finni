import type { PendingAction } from '@finni/shared';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from 'react-native-reanimated';

import { phaseFor, successLine } from '@/components/approval/copy';
import { HoldToApprove } from '@/components/approval/HoldToApprove';
import { crossedMilestones } from '@/components/approval/useHoldTimer';

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => false),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

const advance = (ms: number) => act(async () => jest.advanceTimersByTime(ms));
const pill = () => screen.getByRole('button', { name: 'Hold to approve' });

describe('crossedMilestones', () => {
  it('lists the marks passed between two readings', () => {
    expect(crossedMilestones(0.2, 0.55)).toEqual([0.25, 0.5]);
  });

  it('lists nothing when progress did not move', () => {
    expect(crossedMilestones(0.5, 0.5)).toEqual([]);
  });
});

describe('HoldToApprove', () => {
  it('does not approve when released early', async () => {
    const onApprove = jest.fn();
    await render(<HoldToApprove onApprove={onApprove} />);
    await fireEvent(pill(), 'pressIn');
    await advance(450);
    await fireEvent(pill(), 'pressOut');
    await advance(1000);
    expect(onApprove).not.toHaveBeenCalled();
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(2);
  });

  it('approves after a full 600ms hold with light haptics at 25/50/75%', async () => {
    const onApprove = jest.fn();
    await render(<HoldToApprove onApprove={onApprove} />);
    await fireEvent(pill(), 'pressIn');
    await advance(650);
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(3);
  });

  it('asks the user to keep holding while pressed', async () => {
    await render(<HoldToApprove onApprove={() => {}} />);
    await fireEvent(pill(), 'pressIn');
    expect(screen.getAllByText('Keep holding…').length).toBeGreaterThan(0);
  });

  it('approves straight away from the accessibility action', async () => {
    const onApprove = jest.fn();
    await render(<HoldToApprove onApprove={onApprove} />);
    await fireEvent(pill(), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('never approves after unmounting mid-hold', async () => {
    const onApprove = jest.fn();
    const { unmount } = await render(<HoldToApprove onApprove={onApprove} />);
    await fireEvent(pill(), 'pressIn');
    await advance(200);
    await act(async () => unmount());
    await advance(1000);
    expect(onApprove).not.toHaveBeenCalled();
  });

  it('keeps haptics on under Reduce Motion', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const onApprove = jest.fn();
    await render(<HoldToApprove onApprove={onApprove} />);
    await fireEvent(pill(), 'pressIn');
    await advance(650);
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(3);
  });
});

describe('phaseFor', () => {
  const idle = { isPending: false, isError: false };

  it('is executing while the approval is in flight', () => {
    expect(phaseFor('pending', { isPending: true, isError: false })).toBe('executing');
  });

  it('is failed when the request errors', () => {
    expect(phaseFor('pending', { isPending: false, isError: true })).toBe('failed');
  });

  it('follows the action once it settles', () => {
    expect(phaseFor('pending', idle)).toBe('review');
    expect(phaseFor('executed', idle)).toBe('executed');
    expect(phaseFor('expired', idle)).toBe('expired');
    expect(phaseFor('rejected', idle)).toBe('declined');
  });
});

describe('successLine', () => {
  const action = (over: Partial<PendingAction>): PendingAction => ({
    id: 'act_1',
    type: 'bill_payment',
    title: 'Pay your Closer Card statement before Oct 22',
    amountCents: 118_420,
    fromLabel: 'Everyday Checking',
    toLabel: 'Closer Card',
    requiresStepUp: true,
    status: 'executed',
    source: 'chat',
    createdAt: '2026-10-17T12:00:00.000Z',
    expiresAt: '2026-10-22T00:00:00.000Z',
    executedAt: '2026-10-17T12:01:00.000Z',
    error: null,
    ...over,
  });

  it('says what was paid and to whom', () => {
    expect(successLine(action({}))).toBe('Paid $1,184.20 to Closer Card.');
  });

  it('says where a transfer landed', () => {
    expect(successLine(action({ type: 'transfer', amountCents: 20_000, toLabel: 'Hawaii Fund' }))).toBe('$200.00 is in Hawaii Fund.');
  });

  it('says a new goal is open', () => {
    expect(successLine(action({ type: 'create_goal', amountCents: null, title: 'Hawaii Fund' }))).toBe('Hawaii Fund is open.');
  });
});
