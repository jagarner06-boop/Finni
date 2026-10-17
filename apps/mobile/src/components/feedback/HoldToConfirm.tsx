import { formatCents } from "@finni/shared";
import { HoldToApprove } from "@/components/approval/HoldToApprove";
/** Uses the existing approval timer. Completion requests approval; it never marks a bill paid. */
export function HoldToConfirm({
  amountCents,
  onConfirm,
  disabled,
}: {
  amountCents: number;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  return (
    <HoldToApprove
      label={`Hold to pay ${formatCents(amountCents)}`}
      actionLabel="Pay"
      onApprove={onConfirm}
      disabled={disabled}
    />
  );
}
