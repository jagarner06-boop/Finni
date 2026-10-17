import { fireEvent, render, screen } from '@testing-library/react-native';
import { BankLogo } from '../BankLogo';
it('uses the actual bank image and falls back if it cannot load', async () => {
  await render(<BankLogo bank="Chase" />);
  const logo = screen.getByLabelText('Chase logo');
  expect(logo.props.source).toEqual(require('../../../../assets/banks/chase.jpg'));
  await fireEvent(logo, 'error');
  expect(screen.getByLabelText('Chase')).toBeTruthy();
});
it('keeps a named fallback for an unspecified credit union', async () => {
  await render(<BankLogo bank="A credit union" />);
  expect(screen.getByLabelText('A credit union')).toBeTruthy();
});
