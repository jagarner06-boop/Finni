import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SignIn } from '@/features/signin/SignIn';

const mockAuth = { login: jest.fn(), ready: true, status: 'signedOut', user: null as null | Record<string, string> };
jest.mock('@/auth/AuthProvider', () => ({ useAuth: () => mockAuth }));
jest.mock('@/features/onboarding/OnboardingProvider', () => ({ useOnboarding: () => ({ profile: { firstName: 'Alex' } }) }));
const mockConfig = { authMode: 'auth0' };
jest.mock('@/config', () => ({
  get config() {
    return mockConfig;
  },
}));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const renderSignIn = (onContinue = jest.fn()) =>
  render(<SafeAreaProvider initialMetrics={metrics}><SignIn onContinue={onContinue} /></SafeAreaProvider>);

beforeEach(() => {
  mockAuth.login = jest.fn().mockResolvedValue(true);
  mockAuth.status = 'signedOut';
  mockAuth.user = null;
  mockConfig.authMode = 'auth0';
});

it('signs in with Google through Auth0', async () => {
  await renderSignIn();
  expect(screen.getByText('Save your plan with Finn')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));
  expect(mockAuth.login).toHaveBeenCalledWith({ connection: 'google-oauth2' });
});

it('only offers email sign-in for a valid address and prefills it', async () => {
  await renderSignIn();
  await fireEvent.press(screen.getByRole('button', { name: 'Use email instead' }));
  await fireEvent.changeText(screen.getByLabelText('Email'), 'maya@');
  expect(screen.getByRole('button', { name: 'Continue with email' })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('Email'), ' maya@example.com ');
  await fireEvent.press(screen.getByRole('button', { name: 'Continue with email' }));
  expect(mockAuth.login).toHaveBeenCalledWith({ loginHint: 'maya@example.com' });
  await fireEvent.press(screen.getByRole('button', { name: 'Back to Google sign-in' }));
  expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeTruthy();
});

it('shows a sign-in error', async () => {
  mockAuth.login = jest.fn().mockRejectedValue(new Error('Network down'));
  await renderSignIn();
  await fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));
  expect(screen.getByText('Network down')).toBeTruthy();
});

it('welcomes the signed-in user and continues to the plan', async () => {
  mockAuth.status = 'signedIn';
  mockAuth.user = { sub: '1', givenName: 'Maya', name: 'Maya Chen', email: 'maya@example.com' };
  const onContinue = jest.fn();
  await renderSignIn(onContinue);
  expect(screen.getByText("You're in, Maya.")).toBeTruthy();
  expect(screen.getByText('maya@example.com')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Build my plan' }));
  expect(onContinue).toHaveBeenCalled();
});

it('uses one honest button in demo mode', async () => {
  mockConfig.authMode = 'demo';
  await renderSignIn();
  expect(screen.queryByRole('button', { name: 'Continue with Google' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Use email instead' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Save my plan' }));
  expect(mockAuth.login).toHaveBeenCalledWith(undefined);
});
