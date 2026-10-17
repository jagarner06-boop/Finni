import type { PendingActionStatus, PendingActionType } from '@finni/shared';

import { ApiError } from '@/api/client';

export type Phase = 'review' | 'stepUp' | 'executing' | 'executed' | 'failed' | 'expired' | 'declined';

/**
 * Which sheet to show. The in-flight request wins over the stored status. A 403 step_up_required
 * (or a second sign-in still running, `steppingUp`) shows the step-up phase instead of failed.
 */
export function phaseFor(
  status: PendingActionStatus,
  mutation: { isPending: boolean; isError: boolean; error?: unknown },
  steppingUp = false,
): Phase {
  if (mutation.isPending) return 'executing';
  if (steppingUp) return 'stepUp';
  if (mutation.isError) return mutation.error instanceof ApiError && mutation.error.isStepUpRequired ? 'stepUp' : 'failed';
  switch (status) {
    case 'pending':
      return 'review';
    case 'rejected':
      return 'declined';
    default:
      return status;
  }
}

export const AMOUNT_LABEL: Record<PendingActionType, string> = {
  transfer: 'AMOUNT',
  bill_payment: 'PAYMENT',
  create_goal: 'TARGET',
  card_payment: 'PAYMENT',
  dispute_charge: 'REFUND',
  cancel_subscription: '',
};
