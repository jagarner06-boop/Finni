import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors } from '@/theme/tokens';

const flat = <T extends ViewStyle | TextStyle>(style: unknown): T => (StyleSheet.flatten(style as StyleProp<T>) ?? {}) as T;

beforeEach(() => jest.clearAllMocks());

describe('Button', () => {
  it('calls onPress and gives a light haptic on press-in', async () => {
    const onPress = jest.fn();
    await render(<Button label="Approve" onPress={onPress} />);
    await fireEvent(screen.getByRole('button', { name: 'Approve' }), 'pressIn');
    await fireEvent.press(screen.getByRole('button', { name: 'Approve' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('ignores presses while disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Approve" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole('button', { name: 'Approve' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('ignores presses while loading and announces it', async () => {
    const onPress = jest.fn();
    await render(<Button label="Approve" onPress={onPress} loading />);
    const button = screen.getByLabelText('Loading');
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button.props.accessibilityState).toMatchObject({ busy: true });
  });

  it('uses dangerInk text for the destructive variant', async () => {
    await render(<Button label="Cancel payment" onPress={() => {}} variant="destructive" />);
    expect(flat<TextStyle>(screen.getByText('Cancel payment').props.style).color).toBe(colors.dangerInk);
  });

  it('keeps at least a 44pt target', async () => {
    await render(<Button label="Go" onPress={() => {}} size="sm" />);
    const button = screen.getByRole('button', { name: 'Go' });
    const height = flat<ViewStyle>(button.props.style).minHeight as number;
    const slop = (button.props.hitSlop?.top ?? 0) + (button.props.hitSlop?.bottom ?? 0);
    expect(height + slop).toBeGreaterThanOrEqual(44);
  });
});
