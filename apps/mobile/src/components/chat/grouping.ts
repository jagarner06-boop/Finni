import type { ChatMessage } from '@finni/shared';

export type BubblePosition = 'first' | 'middle' | 'last' | 'solo';

/** Where each bubble sits in its run of same-speaker messages (drives radii, spacing, and the avatar). */
export function groupPositions(messages: Pick<ChatMessage, 'role'>[]): BubblePosition[] {
  return messages.map((m, i) => {
    const samePrev = messages[i - 1]?.role === m.role;
    const sameNext = messages[i + 1]?.role === m.role;
    if (samePrev && sameNext) return 'middle';
    if (samePrev) return 'last';
    if (sameNext) return 'first';
    return 'solo';
  });
}
