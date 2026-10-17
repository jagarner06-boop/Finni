import { fireEvent, render, screen } from '@testing-library/react-native';
import Basics from '@/features/onboarding/BasicsDeck';
import { OnboardingProvider } from '../OnboardingProvider';
import { personalityFor, paydayLabels, incomePatch, canContinue } from '../logic';
import { initialProfile } from '../state';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));

it('requires a name and life stage before completing Basics', async () => {
  await render(<OnboardingProvider><Basics onComplete={jest.fn()} /></OnboardingProvider>);
  await fireEvent.press(screen.getByRole('button', { name: 'Let’s go' }));
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('First name'), 'Alex');
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('radio', { name: 'Student' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByText('Basics done.')).toBeTruthy();
  expect(screen.getByText('Alex')).toBeTruthy();
});

it('clamps bills when income is lowered and preserves the slider steps', () => {
  expect(incomePatch(initialProfile(), 1000)).toEqual({ monthlyIncome: 1000, monthlyBills: 900 });
  expect(incomePatch(initialProfile(), 512)).toEqual({ monthlyIncome: 500, monthlyBills: 500 });
});
it('requires every habit answer and maps all four personalities', () => {
  expect(canContinue('personality', 0, initialProfile())).toBe(false);
  expect(personalityFor(['b', 'b', 'b']).name).toBe('The Fresh Start');
  expect(personalityFor(['a', 'b', 'b']).name).toBe('The Free Spirit');
  expect(personalityFor(['a', 'a', 'b']).name).toBe('The Steady One');
  expect(personalityFor(['a', 'a', 'a']).name).toBe('The Planner');
});
it('calculates payday labels from the current date and pay frequency', () => {
  expect(paydayLabels('biweekly', new Date(2026, 9, 17))).toEqual(['Fri, Oct 23', 'Fri, Nov 6', 'Not sure']);
  expect(paydayLabels('monthly', new Date(2026, 11, 20))).toEqual(['Fri, Jan 1', 'Mon, Feb 1', 'Not sure']);
});
