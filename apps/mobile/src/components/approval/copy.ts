import { formatCents, type PendingAction, type PendingActionStatus, type PendingActionType } from '@finni/shared';

export type Phase = 'review' | 'executing' | 'executed' | 'failed' | 'expired' | 'declined';

/** Which sheet to show. The in-flight request wins over the stored status; step-up happens inside apiFetch and reads as executing. */
export function phaseFor(status: PendingActionStatus, mutation: { isPending: boolean; isError: boolean }): Phase {
  if (mutation.isPending) return 'executing';
  if (mutation.isError) return 'failed';
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

/** The executed line: what happened, in plain words. */
export function successLine(action: PendingAction): string {
  const amount = action.amountCents != null ? formatCents(action.amountCents) : '';
  switch (action.type) {
    case 'transfer':
      return `${amount} is in ${action.toLabel ?? 'the account'}.`;
    case 'bill_payment':
      return `Paid ${amount} to ${action.toLabel ?? 'the payee'}.`;
    case 'create_goal':
      return `${action.title} is open.`;
    default:
      return action.resultLine ?? 'Done.';
  }
}
