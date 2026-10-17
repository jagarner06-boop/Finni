import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { AccountHeroCard } from '@/components/home/AccountHeroCard';
import { AttentionRow } from '@/components/home/AttentionRow';
import { FinnNudgeCard } from '@/components/home/FinnNudgeCard';
import { UtilizationCard, utilizationLevel } from '@/components/home/UtilizationCard';
import { colors } from '@/theme/tokens';

const flat = (style: unknown): ViewStyle => StyleSheet.flatten(style as StyleProp<ViewStyle>) ?? {};

describe('AccountHeroCard', () => {
  it('reads the full balance and shows cents apart', async () => {
    await render(<AccountHeroCard name="Closer Card" mask="4821" balanceCents={136420} />);
    expect(screen.getByLabelText('Closer Card ending 4821, balance $1,364.20')).toBeTruthy();
    expect(screen.getByText('$1,364')).toBeTruthy();
    expect(screen.getByText('.20')).toBeTruthy();
  });

  it('hides the amount when the balance is hidden', async () => {
    await render(<AccountHeroCard name="Closer Card" mask="4821" balanceCents={136420} hidden />);
    expect(screen.getByText('••••••')).toBeTruthy();
    expect(screen.queryByText('$1,364')).toBeNull();
  });
});

describe('utilization', () => {
  it('grades low, medium, and high', () => {
    expect(utilizationLevel(30)).toBe('low');
    expect(utilizationLevel(60)).toBe('medium');
    expect(utilizationLevel(61)).toBe('high');
  });

  it('labels the ring for screen readers', async () => {
    await render(<UtilizationCard percent={68} closesInDays={6} limitCents={200000} />);
    expect(screen.getByLabelText('Utilization 68 percent, high')).toBeTruthy();
  });
});

describe('FinnNudgeCard', () => {
  it('sets the key number apart and runs the call to action', async () => {
    const onPress = jest.fn();
    await render(
      <FinnNudgeCard text="I can drop your utilization to 9% before Oct 22." highlight="9%" cta="Review plan →" onPress={onPress} />,
    );
    expect(screen.getByText('9%')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Review plan →' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('AttentionRow', () => {
  it('shows its status as a colored dot', async () => {
    await render(<AttentionRow title="Duplicate charge" meta="Spotify · $14.99 · Oct 14" status="danger" />);
    expect(flat(screen.getByTestId('status-dot', { includeHiddenElements: true }).props.style).backgroundColor).toBe(colors.danger);
  });
});
