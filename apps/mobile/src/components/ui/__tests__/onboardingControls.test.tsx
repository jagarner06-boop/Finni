import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { OptionCard } from '../OptionCard';
import { Toggle } from '../Toggle';
import { Chip } from '../Chip';
import { ProgressSegments } from '../ProgressSegments';

it('selects an option and exposes checked state to assistive technology', async () => {
  function Example() {
    const [selected, select] = useState(false);
    return <OptionCard label="Student" selected={selected} onPress={() => select(true)} />;
  }
  await render(<Example />);
  await fireEvent.press(screen.getByRole('radio', { name: 'Student' }));
  expect(screen.getByRole('radio', { checked: true })).toBeTruthy();
  expect(Haptics.selectionAsync).toHaveBeenCalled();
});

it('toggles a preference from the accessible switch', async () => {
  function Example() {
    const [value, change] = useState(false);
    return <Toggle label="Bills due" value={value} onValueChange={change} />;
  }
  await render(<Example />);
  await fireEvent.press(screen.getByRole('switch', { name: 'Bills due' }));
  expect(screen.getByRole('switch', { checked: true })).toBeTruthy();
});

it('does not change disabled chips', async () => {
  const select = jest.fn();
  await render(<Chip label="Weekly" selected={false} disabled onPress={select} />);
  await fireEvent.press(screen.getByRole('radio', { name: 'Weekly' }));
  expect(select).not.toHaveBeenCalled();
});

it('announces both deck and step progress', async () => {
  await render(<ProgressSegments count={4} index={1} deck={1} color="coral" />);
  expect(screen.getByRole('progressbar').props.accessibilityLabel).toBe('Deck 1 of 4, step 2 of 4');
});
