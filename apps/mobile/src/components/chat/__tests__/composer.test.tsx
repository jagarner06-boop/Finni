import { fireEvent, render, screen } from '@testing-library/react-native';

import { Composer } from '@/components/chat/Composer';
import { SuggestionChips } from '@/components/chat/SuggestionChips';

describe('Composer', () => {
  it('does not send an empty message', async () => {
    const onSend = jest.fn();
    await render(<Composer value="" onChange={jest.fn()} onSend={onSend} sending={false} />);
    await fireEvent.press(screen.getByLabelText('Send'));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('sends typed text', async () => {
    const onSend = jest.fn();
    await render(<Composer value="How's my card?" onChange={jest.fn()} onSend={onSend} sending={false} />);
    await fireEvent.press(screen.getByLabelText('Send'));
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('does not send while a message is in flight', async () => {
    const onSend = jest.fn();
    await render(<Composer value="Hi" onChange={jest.fn()} onSend={onSend} sending />);
    await fireEvent.press(screen.getByLabelText('Send'));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('labels the input', async () => {
    await render(<Composer value="" onChange={jest.fn()} onSend={jest.fn()} sending={false} />);
    expect(screen.getByLabelText('Ask Finn')).toBeTruthy();
  });
});

describe('SuggestionChips', () => {
  it('sends the picked chip', async () => {
    const onPick = jest.fn();
    await render(<SuggestionChips chips={['Why 9%?', 'Pay it down']} onPick={onPick} />);
    await fireEvent.press(screen.getByLabelText('Ask Finn: Why 9%?'));
    expect(onPick).toHaveBeenCalledWith('Why 9%?');
  });

  it('ignores presses when disabled', async () => {
    const onPick = jest.fn();
    await render(<SuggestionChips chips={['Why 9%?']} onPick={onPick} disabled />);
    await fireEvent.press(screen.getByLabelText('Ask Finn: Why 9%?'));
    expect(onPick).not.toHaveBeenCalled();
  });
});
