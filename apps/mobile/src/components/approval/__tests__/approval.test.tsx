import type { PendingAction } from '@finni/shared';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from 'react-native-reanimated';

import { ApiError } from '@/api/client';
import { ExecutedPhase, FailedPhase, ReviewPhase } from '@/components/approval/ApprovalPhases';
import { phaseFor } from '@/components/approval/copy';
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

const action = (over: Partial<PendingAction>): PendingAction => ({
  id: 'act_1',
  type: 'card_payment',
  title: 'Pay $1,184.00 toward your Closer Card',
  amountCents: 118_400,
  fromLabel: 'Everyday Checking',
  toLabel: 'Closer Card',
  fromDetail: '•••• 1093 · $2,140.00 available',
  toDetail: '•••• 4821 · $1,364.00 owed',
  reason: 'This brings you to 9% before the statement closes.',
  requiresStepUp: true,
  status: 'pending',
  source: 'nudge',
  createdAt: '2026-10-17T12:00:00.000Z',
  expiresAt: '2026-10-22T00:00:00.000Z',
  executedAt: null,
  error: null,
  resultLine: null,
  reference: null,
  ...over,
});

describe('phaseFor step-up', () => {
  it('is stepUp when the approval needs a second sign-in', () => {
    const error = new ApiError(403, 'step_up_required');
    expect(phaseFor('pending', { isPending: false, isError: true, error }, true)).toBe('stepUp');
  });

  it('stays on stepUp while the sign-in runs', () => {
    expect(phaseFor('pending', { isPending: false, isError: false }, true)).toBe('stepUp');
  });

  it('is still failed for other errors', () => {
    expect(phaseFor('pending', { isPending: false, isError: true, error: new ApiError(502, 'nessie_error') }, false)).toBe('failed');
  });
});

describe('ReviewPhase', () => {
  it('shows the From and To sub-lines and the payment label', async () => {
    await render(<ReviewPhase action={action({})} onApprove={jest.fn()} onNotNow={jest.fn()} />);
    expect(screen.getByText('•••• 1093 · $2,140.00 available')).toBeTruthy();
    expect(screen.getByText('•••• 4821 · $1,364.00 owed')).toBeTruthy();
    expect(screen.getByText('PAYMENT')).toBeTruthy();
  });

  it('has no amount block for a cancellation', async () => {
    await render(
      <ReviewPhase action={action({ type: 'cancel_subscription', title: 'Cancel Hulu', amountCents: 1_799 })} onApprove={jest.fn()} onNotNow={jest.fn()} />,
    );
    expect(screen.queryByText('$17')).toBeNull();
    expect(screen.queryByText('PAYMENT')).toBeNull();
  });
});

describe('ExecutedPhase', () => {
  it("shows the server's result line and confirmation", async () => {
    const onViewActivity = jest.fn();
    await render(
      <ExecutedPhase
        action={action({ status: 'executed', resultLine: 'Paid $1,184.00 to your Closer Card.', reference: '#CP-12345' })}
        onDone={jest.fn()}
        onViewActivity={onViewActivity}
      />,
    );
    expect(screen.getByText('Paid $1,184.00 to your Closer Card.')).toBeTruthy();
    expect(screen.getByText(/Confirmation #CP-12345/)).toBeTruthy();
    await fireEvent.press(screen.getByText('View in Activity'));
    expect(onViewActivity).toHaveBeenCalled();
  });
});

describe('FailedPhase', () => {
  it('says nothing was changed for a cancellation', async () => {
    await render(<FailedPhase type="cancel_subscription" onRetry={jest.fn()} onNotNow={jest.fn()} />);
    expect(screen.getByText('Nothing was changed.')).toBeTruthy();
  });

  it('says nothing was moved for money', async () => {
    await render(<FailedPhase type="card_payment" onRetry={jest.fn()} onNotNow={jest.fn()} />);
    expect(screen.getByText('Nothing was moved.')).toBeTruthy();
  });
});
