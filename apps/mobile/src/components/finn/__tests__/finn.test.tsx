import { render, screen } from '@testing-library/react-native';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { FINN_HEAD, FINN_HEAD_RARE, FINN_POSE } from '@/components/finn/assets';
import { FinnAvatar } from '@/components/finn/FinnAvatar';
import { FinnPose } from '@/components/finn/FinnPose';
import { FinnTicks } from '@/components/finn/FinnTicks';
import { FinnTyping } from '@/components/finn/FinnTyping';
import { colors } from '@/theme/tokens';

const flat = (style: unknown): ViewStyle => StyleSheet.flatten(style as StyleProp<ViewStyle>) ?? {};

describe('FinnAvatar', () => {
  it('labels and draws the head for its mood', async () => {
    await render(<FinnAvatar mood="worried" />);
    expect(screen.getByLabelText('Finn looks worried')).toBeTruthy();
    expect(screen.getByTestId('finn-head').props.source).toBe(FINN_HEAD.worried);
  });

  it('draws an accent mood ring for thinking', async () => {
    await render(<FinnAvatar mood="thinking" ring />);
    expect(flat(screen.getByTestId('finn-ring').props.style).borderColor).toBe(colors.accent);
  });

  it('draws no ring for happy even when asked', async () => {
    await render(<FinnAvatar mood="happy" ring />);
    expect(screen.queryByTestId('finn-ring')).toBeNull();
  });

  it('lets a rare head override the art but keeps the mood label', async () => {
    await render(<FinnAvatar mood="celebrating" head="love" />);
    expect(screen.getByTestId('finn-head').props.source).toBe(FINN_HEAD_RARE.love);
    expect(screen.getByLabelText('Finn is celebrating')).toBeTruthy();
  });
});

describe('FinnPose', () => {
  it('draws the requested pose', async () => {
    await render(<FinnPose pose="wave" />);
    expect(screen.getByTestId('finn-pose').props.source).toBe(FINN_POSE.wave);
  });
});

describe('FinnTicks', () => {
  it('is hidden from screen readers', async () => {
    await render(<FinnTicks />);
    const root = screen.getByTestId('finn-ticks', { includeHiddenElements: true });
    expect(root.props.accessibilityElementsHidden).toBe(true);
    expect(root.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('draws two strokes by default and three on request', async () => {
    const { rerender } = await render(<FinnTicks />);
    expect(screen.getAllByTestId('finn-tick', { includeHiddenElements: true })).toHaveLength(2);
    await rerender(<FinnTicks count={3} />);
    expect(screen.getAllByTestId('finn-tick', { includeHiddenElements: true })).toHaveLength(3);
  });
});

describe('FinnTyping', () => {
  it('announces politely that Finn is typing', async () => {
    await render(<FinnTyping />);
    expect(screen.getByLabelText('Finn is typing').props.accessibilityLiveRegion).toBe('polite');
  });

  it('colors the first dot accent and the others muted', async () => {
    await render(<FinnTyping />);
    const dots = screen.getAllByTestId('typing-dot', { includeHiddenElements: true }).map((d) => flat(d.props.style).backgroundColor);
    expect(dots).toEqual([colors.accent, colors.typingDot, colors.typingDot]);
  });
});
