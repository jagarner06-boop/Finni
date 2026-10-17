import type { ChatMessage } from '@finni/shared';
import { render, screen } from '@testing-library/react-native';

import { MessageBubble } from '@/components/chat/MessageBubble';

const finn = (text: string): ChatMessage => ({ id: text, role: 'finn', text, mood: 'happy', cards: [], createdAt: '2026-10-17T12:00:00.000Z' });

describe('MessageBubble', () => {
  it.each(['first', 'solo'] as const)('shows Finn on a %s bubble', async (position) => {
    await render(<MessageBubble message={finn("You're at 68% utilization.")} position={position} />);
    expect(screen.getByLabelText('Finn looks happy')).toBeTruthy();
  });

  it.each(['middle', 'last'] as const)('hides Finn on a %s bubble', async (position) => {
    await render(<MessageBubble message={finn('I can fix that before Oct 22.')} position={position} />);
    expect(screen.queryByLabelText('Finn looks happy')).toBeNull();
    expect(screen.getByText('I can fix that before Oct 22.')).toBeTruthy();
  });
});
